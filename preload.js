const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // Window controls
  minimize: () => ipcRenderer.invoke('window-minimize'),
  maximize: () => ipcRenderer.invoke('window-maximize'),
  close:    () => ipcRenderer.invoke('window-close'),

  // API key
  hasApiKey:  ()      => ipcRenderer.invoke('has-api-key'),
  saveApiKey: (key)   => ipcRenderer.invoke('save-api-key', key),

  // Claude features
  claudeRelocation:   (data) => ipcRenderer.invoke('claude-relocation', data),
  claudeNeighbourhood:(data) => ipcRenderer.invoke('claude-neighbourhood', data),
  claudeLease:        (data) => ipcRenderer.invoke('claude-lease', data),
});
