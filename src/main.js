const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const OBSController = require('./obs/controller');
const PPTProcessor = require('./ppt/processor');

let mainWindow;
let obsController;
let pptProcessor;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    title: 'StageForge - Live Event Controller'
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  // Open DevTools in development mode
  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();
  
  // Initialize controllers
  obsController = new OBSController();
  pptProcessor = new PPTProcessor();

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

// IPC Handlers

// OBS Connection
ipcMain.handle('obs:connect', async (event, config) => {
  try {
    await obsController.connect(config);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('obs:disconnect', async () => {
  try {
    await obsController.disconnect();
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('obs:status', async () => {
  return obsController.getStatus();
});

// PPT Processing
ipcMain.handle('ppt:import', async (event, filePaths) => {
  try {
    const results = [];
    for (const filePath of filePaths) {
      const result = await pptProcessor.processFile(filePath);
      results.push(result);
    }
    return { success: true, programs: results };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('ppt:select', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile', 'multiSelections'],
    filters: [
      { name: 'PowerPoint Files', extensions: ['ppt', 'pptx'] }
    ]
  });
  
  if (!result.canceled) {
    return { success: true, filePaths: result.filePaths };
  }
  return { success: false };
});

// Program Management
ipcMain.handle('program:load', async (event, programId) => {
  try {
    const program = await pptProcessor.loadProgram(programId);
    if (program) {
      await obsController.createScenesForProgram(program);
    }
    return { success: true, program };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('program:list', async () => {
  try {
    const programs = await pptProcessor.listPrograms();
    return { success: true, programs };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Scene Control
ipcMain.handle('scene:next', async () => {
  try {
    await obsController.nextScene();
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('scene:prev', async () => {
  try {
    await obsController.prevScene();
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('scene:jump', async (event, sceneIndex) => {
  try {
    await obsController.jumpToScene(sceneIndex);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('scene:blackout', async () => {
  try {
    await obsController.activateBlackout();
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('scene:current', async () => {
  try {
    const current = await obsController.getCurrentScene();
    return { success: true, scene: current };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Status updates from OBS
obsController.on('connected', () => {
  if (mainWindow) {
    mainWindow.webContents.send('obs:connected');
  }
});

obsController.on('disconnected', () => {
  if (mainWindow) {
    mainWindow.webContents.send('obs:disconnected');
  }
});

obsController.on('scene-changed', (sceneName) => {
  if (mainWindow) {
    mainWindow.webContents.send('obs:scene-changed', sceneName);
  }
});
