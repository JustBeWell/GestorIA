const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('gestorIA', {
  platform: process.platform,
});
