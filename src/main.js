const { app, BrowserWindow, ipcMain, dialog, screen } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const OBSController = require('./obs/controller');
const PPTProcessor = require('./ppt/processor');
const LibreOfficeController = require('./libreoffice/controller');
const RendererMode = require('./modes/renderer');
const SceneMode = require('./modes/scene');

let mainWindow;
let obsController;
let pptProcessor;
let libreOfficeController;
let rendererMode;
let sceneMode;
let currentMode = null;
let currentProgram = null;

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
  libreOfficeController = new LibreOfficeController();
  
  // Initialize mode controllers
  rendererMode = new RendererMode(libreOfficeController, obsController);
  sceneMode = new SceneMode(obsController);
  
  // Setup LibreOffice event listeners
  libreOfficeController.on('started', () => {
    if (mainWindow) {
      mainWindow.webContents.send('libreoffice:started');
    }
  });
  
  libreOfficeController.on('stopped', () => {
    if (mainWindow) {
      mainWindow.webContents.send('libreoffice:stopped');
    }
  });
  
  libreOfficeController.on('slide-changed', (direction) => {
    if (mainWindow) {
      mainWindow.webContents.send('libreoffice:slide-changed', direction);
    }
  });

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
ipcMain.handle('ppt:import', async (event, filePaths, options = {}) => {
  try {
    const results = [];
    for (const filePath of filePaths) {
      const result = await pptProcessor.processFile(filePath, options);
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
      currentProgram = program;
      
      // Load into appropriate mode based on program.mode
      if (program.mode === 'renderer') {
        currentMode = rendererMode;
        await rendererMode.loadProgram(program);
      } else if (program.mode === 'scene') {
        currentMode = sceneMode;
        if (obsController.connected) {
          await sceneMode.loadProgram(program);
        }
      }
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
    if (currentMode) {
      await currentMode.next();
    } else {
      throw new Error('No program loaded');
    }
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('scene:prev', async () => {
  try {
    if (currentMode) {
      await currentMode.prev();
    } else {
      throw new Error('No program loaded');
    }
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('scene:jump', async (event, sceneIndex) => {
  try {
    if (currentMode && currentMode.jumpToScene) {
      await currentMode.jumpToScene(sceneIndex);
    } else {
      throw new Error('Jump not supported in current mode');
    }
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('scene:start', async (event, options) => {
  try {
    if (currentMode) {
      await currentMode.start(options);
    } else {
      throw new Error('No program loaded');
    }
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('scene:stop', async () => {
  try {
    if (currentMode) {
      await currentMode.stop();
    }
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
    if (currentMode) {
      const status = currentMode.getStatus();
      return { success: true, status };
    }
    return { success: false, error: 'No mode active' };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Display Management
ipcMain.handle('display:list', async () => {
  try {
    const displays = screen.getAllDisplays();
    return { 
      success: true, 
      displays: displays.map((d, i) => ({
        id: i,
        label: d.label || `Display ${i + 1}`,
        bounds: d.bounds,
        primary: d.id === screen.getPrimaryDisplay().id
      }))
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('display:set', async (event, displayIndex) => {
  try {
    libreOfficeController.setDisplay(displayIndex);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// LibreOffice Status
ipcMain.handle('libreoffice:status', async () => {
  try {
    const status = libreOfficeController.getStatus();
    const available = await libreOfficeController.checkAvailability();
    return { success: true, status: { ...status, available } };
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
