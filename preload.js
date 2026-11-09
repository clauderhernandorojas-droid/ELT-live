const { contextBridge, ipcRenderer } = require('electron');

// Exponer de forma segura APIs del proceso principal a la ventana del navegador
contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,

  // Funciones de control de ventana
  minimizeWindow: () => ipcRenderer.invoke('window:minimize'),
  maximizeWindow: () => ipcRenderer.invoke('window:maximize'),
  closeWindow: () => ipcRenderer.invoke('window:close'),
  isMaximized: () => ipcRenderer.invoke('window:isMaximized'),

  // Fuentes para compartir pantalla (desktopCapturer)
  getDesktopSources: () => ipcRenderer.invoke('get-desktop-sources'),
  setSelectedDesktopSource: (sourceId) => ipcRenderer.invoke('set-selected-desktop-source', sourceId),
  getScreenSources: (opts) => ipcRenderer.invoke('screen:getSources', opts),

  // Escuchar eventos desde el proceso principal
  onWindowStateChange: (callback) => {
    ipcRenderer.on('window:stateChange', (_event, state) => callback(state));
  }
});

