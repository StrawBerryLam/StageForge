const { app, BrowserWindow, ipcMain, dialog, screen } = require('electron');
const path = require('path');
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
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
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
    // Cleanup mode controllers
    if (currentMode) {
      currentMode = null;
    }
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

  // Setup OBS event listeners
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

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', async () => {
  // Cleanup resources before quitting
  try {
    if (libreOfficeController && libreOfficeController.isRunning) {
      await libreOfficeController.stop();
    }
    if (obsController && obsController.connected) {
      await obsController.disconnect();
    }
  } catch (error) {
    console.error('Error during cleanup:', error);
  }
  
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC Handlers

// OBS Connection
ipcMain.handle('obs:connect', async (event, config) => {
  try {
    // Validate config
    if (config && typeof config !== 'object') {
      return { success: false, error: 'Invalid configuration object' };
    }
    
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
    // Validate inputs
    if (!Array.isArray(filePaths) || filePaths.length === 0) {
      return { success: false, error: 'Invalid file paths' };
    }
    
    if (options && typeof options !== 'object') {
      return { success: false, error: 'Invalid options object' };
    }
    
    const results = [];
    for (const filePath of filePaths) {
      if (typeof filePath !== 'string') {
        continue; // Skip invalid paths
      }
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
    // Validate programId
    if (typeof programId !== 'string' || programId.trim() === '') {
      return { success: false, error: 'Invalid program ID' };
    }
    
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
    // Validate sceneIndex
    if (typeof sceneIndex !== 'number' || sceneIndex < 0 || !Number.isInteger(sceneIndex)) {
      return { success: false, error: 'Invalid scene index' };
    }
    
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
    // Validate options
    if (options && typeof options !== 'object') {
      return { success: false, error: 'Invalid options object' };
    }
    
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
    // Validate displayIndex
    if (typeof displayIndex !== 'number' || displayIndex < 0 || !Number.isInteger(displayIndex)) {
      return { success: false, error: 'Invalid display index' };
    }
    
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


