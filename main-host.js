const { app, BrowserWindow, session, ipcMain, desktopCapturer, shell, screen } = require('electron');
const path = require('path');

let mainWindow = null;
let shareBorderWindow = null;

function getOwnElectronMediaSourceIds() {
  return new Set(
    BrowserWindow.getAllWindows()
      .filter(w => w && !w.isDestroyed() && typeof w.getMediaSourceId === 'function')
      .map(w => w.getMediaSourceId())
  );
}

function hideShareBorderOverlay() {
  if (shareBorderWindow && !shareBorderWindow.isDestroyed()) {
    try {
      shareBorderWindow.close();
    } catch (e) {}
  }
  shareBorderWindow = null;
}

function showShareBorderOverlay(opts = {}) {
  try {
    hideShareBorderOverlay();
    const allDisplays = screen.getAllDisplays();
    let targetDisplay = screen.getPrimaryDisplay();

    if (opts && opts.sourceId && String(opts.sourceId).startsWith('screen:')) {
      const parts = String(opts.sourceId).split(':');
      const maybeDisplayId = parts[1];
      const matched = allDisplays.find((d, idx) => String(d.id) === String(maybeDisplayId) || String(idx) === String(maybeDisplayId));
      if (matched) targetDisplay = matched;
    } else if (mainWindow && !mainWindow.isDestroyed()) {
      const winDisplay = screen.getDisplayMatching(mainWindow.getBounds());
      if (winDisplay) targetDisplay = winDisplay;
    }

    const bounds = (targetDisplay && targetDisplay.bounds)
      ? targetDisplay.bounds
      : { x: 0, y: 0, width: 1920, height: 1080 };

    shareBorderWindow = new BrowserWindow({
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
      frame: false,
      transparent: true,
      alwaysOnTop: true,
      skipTaskbar: true,
      focusable: false,
      hasShadow: false,
      resizable: false,
      movable: false,
      fullscreenable: false,
      show: false,
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false
      }
    });

    shareBorderWindow.setIgnoreMouseEvents(true, { forward: true });
    shareBorderWindow.setAlwaysOnTop(true, 'screen-saver');
    try {
      shareBorderWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
    } catch (e) {}

    const overlayHtml = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; user-select: none; pointer-events: none; }
  html, body {
    width: 100vw;
    height: 100vh;
    overflow: hidden;
    background: transparent;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  }
  .share-frame {
    position: fixed;
    inset: 0;
    border: 4px solid #22c55e;
    box-shadow: inset 0 0 12px rgba(34, 197, 94, 0.45);
    pointer-events: none;
  }
  .share-pill {
    position: fixed;
    top: 4px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(15, 23, 42, 0.88);
    border: 1.5px solid #22c55e;
    color: #bbf7d0;
    font-size: 11px;
    font-weight: 700;
    padding: 3px 12px;
    border-radius: 999px;
    letter-spacing: 0.2px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.35);
    display: inline-flex;
    align-items: center;
    gap: 6px;
    pointer-events: none;
  }
  .dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: #22c55e;
    box-shadow: 0 0 8px #22c55e;
  }
</style>
</head>
<body>
  <div class="share-frame"></div>
  <div class="share-pill"><span class="dot"></span><span>Estás compartiendo pantalla</span></div>
</body>
</html>`;

    shareBorderWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(overlayHtml));
    shareBorderWindow.once('ready-to-show', () => {
      if (shareBorderWindow && !shareBorderWindow.isDestroyed()) {
        shareBorderWindow.showInactive();
        shareBorderWindow.setIgnoreMouseEvents(true, { forward: true });
        shareBorderWindow.setAlwaysOnTop(true, 'screen-saver');
      }
    });
    shareBorderWindow.on('closed', () => {
      shareBorderWindow = null;
    });
  } catch (err) {
    console.error('Error mostrando shareBorderWindow en Host:', err);
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: 'ELT Live — Centro de Mando (Host)',
    backgroundColor: '#090d16',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      backgroundThrottling: false
    }
  });

  // Cargar host.html
  mainWindow.loadFile(path.join(__dirname, 'host.html'));

  // Habilitar captura de pantalla para Chromium/Electron en la ventana principal (excluyendo únicamente ventanas propias de Electron)
  const handleHostDisplayMediaRequest = async (request, callback) => {
    try {
      const allSources = await desktopCapturer.getSources({ types: ['screen', 'window'] });
      const ownSourceIds = getOwnElectronMediaSourceIds();
      const filteredSources = allSources.filter(source => !ownSourceIds.has(source.id));
      const sources = filteredSources.length > 0 ? filteredSources : allSources;
      const withAudio = (typeof global.__selectedDesktopWithAudio === 'boolean')
        ? global.__selectedDesktopWithAudio
        : Boolean(request.audioRequested);
      const enableAudio = withAudio ? 'loopback' : undefined;

      if (global.__selectedDesktopSourceId) {
        const found = allSources.find(s => s.id === global.__selectedDesktopSourceId);
        if (found) {
          const response = { video: found };
          if (enableAudio) response.audio = enableAudio;
          callback(response);
          return;
        }
      }

      const screenSource = sources.find(s => String(s.id || '').startsWith('screen:')) || sources[0];
      if (screenSource) {
        const response = { video: screenSource };
        if (enableAudio) response.audio = enableAudio;
        callback(response);
      } else {
        callback({});
      }
    } catch (err) {
      console.error('Error al capturar pantalla en Electron (Host):', err);
      callback({});
    }
  };

  mainWindow.webContents.session.setDisplayMediaRequestHandler(handleHostDisplayMediaRequest);

  // Manejo de eventos de ventana para IPC
  mainWindow.on('maximize', () => {
    mainWindow?.webContents.send('window:stateChange', 'maximized');
  });

  mainWindow.on('unmaximize', () => {
    mainWindow?.webContents.send('window:stateChange', 'restored');
  });

  mainWindow.on('closed', () => {
    hideShareBorderOverlay();
    mainWindow = null;
  });
}

// Configurar permisos automáticos de medios (cámara, micrófono, pantalla, notificaciones, audio)
function configureMediaPermissions() {
  const ses = session.defaultSession;

  // Manejar solicitudes dinámicas de permisos (getUserMedia, getDisplayMedia, notifications, etc.)
  ses.setPermissionRequestHandler((webContents, permission, callback, details) => {
    const allowedPermissions = [
      'media',
      'mediaKeySystem',
      'geolocation',
      'notifications',
      'fullscreen',
      'pointerLock',
      'display-capture'
    ];

    if (allowedPermissions.includes(permission)) {
      return callback(true);
    }
    callback(true);
  });

  // Verificación de permisos sincrónica
  ses.setPermissionCheckHandler((webContents, permission, requestingOrigin, details) => {
    return true;
  });

  // Conceder acceso a dispositivos de hardware (cámaras, micrófonos, etc.)
  ses.setDevicePermissionHandler((details) => {
    return true;
  });

  // Selección automática de fuente de pantalla para getDisplayMedia excluyendo únicamente ventanas propias de Electron
  ses.setDisplayMediaRequestHandler(async (request, callback) => {
    try {
      const allSources = await desktopCapturer.getSources({ types: ['screen', 'window'] });
      const ownSourceIds = getOwnElectronMediaSourceIds();
      const filteredSources = allSources.filter(source => !ownSourceIds.has(source.id));
      const sources = filteredSources.length > 0 ? filteredSources : allSources;
      const withAudio = (typeof global.__selectedDesktopWithAudio === 'boolean')
        ? global.__selectedDesktopWithAudio
        : Boolean(request.audioRequested);

      let chosenSource = null;
      if (global.__selectedDesktopSourceId) {
        chosenSource = allSources.find(s => s.id === global.__selectedDesktopSourceId) || null;
      }
      if (!chosenSource) {
        chosenSource = sources.find(s => String(s.id || '').startsWith('screen:')) || sources[0];
      }

      if (chosenSource) {
        const response = { video: chosenSource };
        if (withAudio) response.audio = 'loopback';
        callback(response);
      } else {
        callback({});
      }
    } catch (err) {
      console.error('Error al obtener fuentes de pantalla:', err);
      callback({});
    }
  });
}

// Handlers IPC para control de ventana y capturas
function setupIPCHandlers() {
  ipcMain.handle('window:minimize', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.minimize();
    }
  });

  ipcMain.handle('window:maximize', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      if (mainWindow.isMaximized()) {
        mainWindow.unmaximize();
      } else {
        mainWindow.maximize();
      }
      return mainWindow.isMaximized();
    }
    return false;
  });

  ipcMain.handle('window:close', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.close();
    }
  });

  ipcMain.handle('window:isMaximized', () => {
    return mainWindow && !mainWindow.isDestroyed() ? mainWindow.isMaximized() : false;
  });

  // Listar ventanas y pantallas con miniaturas para el selector estilo Zoom (filtrando por getMediaSourceId exacto)
  ipcMain.handle('get-desktop-sources', async () => {
    try {
      const allSources = await desktopCapturer.getSources({
        types: ['screen', 'window'],
        thumbnailSize: { width: 340, height: 192 },
        fetchWindowIcons: true
      });
      const ownSourceIds = new Set(
        BrowserWindow.getAllWindows()
          .filter(w => w && !w.isDestroyed() && typeof w.getMediaSourceId === 'function')
          .map(w => w.getMediaSourceId())
      );
      const sources = allSources.filter(source => !ownSourceIds.has(source.id));
      return sources.map(source => {
        const thumbUrl = source.thumbnail ? source.thumbnail.toDataURL() : '';
        const iconUrl = (source.appIcon && typeof source.appIcon.toDataURL === 'function' && (!source.appIcon.isEmpty || !source.appIcon.isEmpty()))
          ? source.appIcon.toDataURL()
          : null;
        return {
          id: source.id,
          name: source.name,
          display_id: source.display_id || '',
          isScreen: String(source.id || '').startsWith('screen:'),
          thumbnail: thumbUrl,
          thumbnailDataUrl: thumbUrl,
          appIconDataUrl: iconUrl
        };
      });
    } catch (err) {
      console.error('Error obteniendo fuentes en main-host.js:', err);
      return [];
    }
  });

  // Registrar la fuente y preferencia de audio elegidas para alimentar setDisplayMediaRequestHandler
  ipcMain.handle('set-selected-desktop-source', (event, sourceId, withAudio) => {
    if (sourceId && typeof sourceId === 'object') {
      global.__selectedDesktopSourceId = sourceId.sourceId || sourceId.id || null;
      global.__selectedDesktopWithAudio = typeof sourceId.withAudio === 'boolean' ? sourceId.withAudio : null;
    } else {
      global.__selectedDesktopSourceId = sourceId || null;
      global.__selectedDesktopWithAudio = typeof withAudio === 'boolean' ? withAudio : null;
    }
    return true;
  });

  ipcMain.handle('show-share-border', (_event, opts) => {
    showShareBorderOverlay(opts || {});
    return true;
  });

  ipcMain.handle('hide-share-border', () => {
    hideShareBorderOverlay();
    return true;
  });

  ipcMain.handle('screen:getSources', async (event, opts) => {
    const options = Object.assign({ types: ['window', 'screen'] }, opts || {});
    return await desktopCapturer.getSources(options);
  });
}

// Ciclo de vida de la aplicación
app.whenReady().then(() => {
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    callback(true);
  });
  configureMediaPermissions();
  setupIPCHandlers();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});


// Bloqueo de deep linking y protocolos externos como jitsi-meet://
app.on('web-contents-created', (event, contents) => {
  contents.on('will-navigate', (navEvent, url) => {
    if (typeof url === 'string' && url.startsWith('jitsi-meet://')) {
      navEvent.preventDefault();
    }
  });
  contents.setWindowOpenHandler(({ url }) => {
    if (typeof url === 'string' && (url.startsWith('http://') || url.startsWith('https://'))) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'deny' };
  });
});
