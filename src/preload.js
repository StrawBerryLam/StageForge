const { contextBridge, ipcRenderer } = require('electron');

/**
 * Preload script for secure IPC communication
 * Exposes limited API to renderer process with contextIsolation enabled
 */

contextBridge.exposeInMainWorld('electronAPI', {
  // OBS Connection
  obs: {
    connect: (config) => ipcRenderer.invoke('obs:connect', config),
    disconnect: () => ipcRenderer.invoke('obs:disconnect'),
    getStatus: () => ipcRenderer.invoke('obs:status'),
    onConnected: (callback) => ipcRenderer.on('obs:connected', callback),
    onDisconnected: (callback) => ipcRenderer.on('obs:disconnected', callback),
    onSceneChanged: (callback) => ipcRenderer.on('obs:scene-changed', (_event, sceneName) => callback(sceneName))
  },

  // PPT Processing
  ppt: {
    import: (filePaths, options) => ipcRenderer.invoke('ppt:import', filePaths, options),
    select: () => ipcRenderer.invoke('ppt:select')
  },

  // Program Management
  program: {
    load: (programId) => ipcRenderer.invoke('program:load', programId),
    list: () => ipcRenderer.invoke('program:list')
  },

  // Scene Control
  scene: {
    next: () => ipcRenderer.invoke('scene:next'),
    prev: () => ipcRenderer.invoke('scene:prev'),
    jump: (sceneIndex) => ipcRenderer.invoke('scene:jump', sceneIndex),
    start: (options) => ipcRenderer.invoke('scene:start', options),
    stop: () => ipcRenderer.invoke('scene:stop'),
    blackout: () => ipcRenderer.invoke('scene:blackout'),
    getCurrent: () => ipcRenderer.invoke('scene:current')
  },

  // Display Management
  display: {
    list: () => ipcRenderer.invoke('display:list'),
    set: (displayIndex) => ipcRenderer.invoke('display:set', displayIndex)
  },

  // LibreOffice Status
  libreoffice: {
    getStatus: () => ipcRenderer.invoke('libreoffice:status'),
    onStarted: (callback) => ipcRenderer.on('libreoffice:started', callback),
    onStopped: (callback) => ipcRenderer.on('libreoffice:stopped', callback),
    onSlideChanged: (callback) => ipcRenderer.on('libreoffice:slide-changed', (_event, direction) => callback(direction))
  }
});
