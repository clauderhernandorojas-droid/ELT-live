const { app, BrowserWindow, session, ipcMain, desktopCapturer } = require('electron');
const path = require('path');

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 600,
    title: 'ELT Live — Aula Virtual (Estudiante)',
    backgroundColor: '#090d16',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  // Cargar student.html
  mainWindow.loadFile(path.join(__dirname, 'student.html'));

  // Manejador de captura de pantalla si el estudiante comparte pantalla
  mainWindow.webContents.session.setDisplayMediaRequestHandler(async (request, callback) => {
    try {
      const sources = await desktopCapturer.getSources({ types: ['screen', 'window'] });
      const enableAudio = request.audioRequested ? 'loopback' : null;
      if (sources.length > 0) {
        callback({ video: sources[0], audio: enableAudio });
      } else {
        callback({});
      }
    } catch (err) {
      console.error('Error al capturar pantalla en Electron (Student):', err);
      callback({});
    }
  });

  // Manejo de eventos de ventana para IPC
  mainWindow.on('maximize', () => {
    mainWindow?.webContents.send('window:stateChange', 'maximized');
  });

  mainWindow.on('unmaximize', () => {
    mainWindow?.webContents.send('window:stateChange', 'restored');
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Configurar permisos automáticos de medios (cámara, micrófono, pantalla, notificaciones, audio)
function configureMediaPermissions() {
  const ses = session.defaultSession;

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

  ses.setPermissionCheckHandler((webContents, permission, requestingOrigin, details) => {
    return true;
  });

  ses.setDevicePermissionHandler((details) => {
    return true;
  });
}

// Handlers IPC para control de ventana
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
    if (typeof url === 'string' && url.startsWith('jitsi-meet://')) {
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });
});
