const { contextBridge, ipcRenderer } = require('electron');

// Exponer de forma segura APIs del proceso principal a la ventana del navegador
contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,

  // Funciones de control de ventana
  minimizeWindow: () => ipcRenderer.invoke('window:minimize'),
  maximizeWindow: () => ipcRenderer.invoke('window:maximize'),
  closeWindow: () => ipcRenderer.invoke('window:close'),
  isMaximized: () => ipcRenderer.invoke('window:isMaximized'),

  // Fuentes para compartir pantalla (desktopCapturer) y borde verde de compartición
  getDesktopSources: () => ipcRenderer.invoke('get-desktop-sources'),
  setSelectedDesktopSource: (sourceId, withAudio) => ipcRenderer.invoke('set-selected-desktop-source', sourceId, withAudio),
  getScreenSources: (opts) => ipcRenderer.invoke('screen:getSources', opts),
  showShareBorder: (opts) => ipcRenderer.invoke('show-share-border', opts),
  hideShareBorder: () => ipcRenderer.invoke('hide-share-border'),

  // Escuchar eventos desde el proceso principal
  onWindowStateChange: (callback) => {
    ipcRenderer.on('window:stateChange', (_event, state) => callback(state));
  }
});

