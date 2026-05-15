const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('gestorIA', {
  platform: process.platform,
  notify: (payload) => ipcRenderer.send('notify', payload),
  onNavigate: (callback) => ipcRenderer.on('navigate', (_, url) => callback(url)),
});
