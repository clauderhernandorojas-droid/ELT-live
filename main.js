const { app, BrowserWindow, session, ipcMain, desktopCapturer } = require('electron');
const path = require('path');

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: 'ELT Live — Centro de Mando',
    backgroundColor: '#090d16',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  // Cargar por defecto host.html
  mainWindow.loadFile(path.join(__dirname, 'host.html'));

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

  // Selección automática de fuente de pantalla para getDisplayMedia si Electron lo solicita
  ses.setDisplayMediaRequestHandler((request, callback) => {
    desktopCapturer.getSources({ types: ['screen', 'window'] }).then((sources) => {
      // Por defecto seleccionar la pantalla principal o la primera fuente disponible
      if (sources.length > 0) {
        callback({ video: sources[0] });
      } else {
        callback({});
      }
    }).catch((err) => {
      console.error('Error al obtener fuentes de pantalla:', err);
      callback({});
    });
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

  ipcMain.handle('screen:getSources', async (event, opts) => {
    const options = Object.assign({ types: ['window', 'screen'] }, opts || {});
    return await desktopCapturer.getSources(options);
  });
}

// Ciclo de vida de la aplicación
app.whenReady().then(() => {
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

