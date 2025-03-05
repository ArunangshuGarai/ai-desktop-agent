// main.js - Updated with vision-based task manager
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const isDev = require('electron-is-dev');
const visionTaskManager = require('./src/core/visionTaskManager'); // Updated import
require('dotenv').config();

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
      devTools: isDev // Only enable DevTools in development
    }
  });

  const startURL = isDev
    ? `file://${path.join(__dirname, 'dist/index.html')}`
    : `file://${path.join(__dirname, 'dist/index.html')}`;

  mainWindow.loadURL(startURL);

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Only open DevTools automatically if explicitly enabled via environment variable
  if (isDev && process.env.OPEN_DEVTOOLS === 'true') {
    mainWindow.webContents.openDevTools();
  }
  
  // Set up event forwarding from VisionTaskManager to renderer
  setupTaskManagerEvents();
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Forward events from VisionTaskManager to renderer
function setupTaskManagerEvents() {
  const events = [
    'analyzing', 'analyzed', 'step-started', 'step-completed',
    'step-error', 'completed', 'error', 'calculation-result', 'task-summary',
    'screenshot-taken', 'vision-analysis', 'element-found', 'element-not-found'
  ];
  
  events.forEach(event => {
    visionTaskManager.on(event, (data) => {
      if (mainWindow) {
        mainWindow.webContents.send(`task-${event}`, data);
      }
    });
  });
}

// IPC handlers - ensure all return valid JSON
ipcMain.handle('analyze-task', async (event, { task }) => {
  try {
    return await visionTaskManager.analyzeTask(task);
  } catch (error) {
    return { error: error.message };
  }
});

ipcMain.handle('execute-next-step', async () => {
  try {
    return await visionTaskManager.executeNextStep();
  } catch (error) {
    return { error: error.message };
  }
});

ipcMain.handle('execute-full-task', async (event, { task }) => {
  try {
    await visionTaskManager.analyzeTask(task);
    return await visionTaskManager.executeFullTask();
  } catch (error) {
    return { error: error.message };
  }
});

ipcMain.handle('get-task-state', () => {
  return visionTaskManager.getTaskState();
});

// New vision-specific IPC handlers
ipcMain.handle('take-screenshot', async () => {
  const visionService = require('./src/services/visionService');
  try {
    return await visionService.captureActiveWindow();
  } catch (error) {
    return { error: error.message };
  }
});

ipcMain.handle('analyze-screenshot', async (event, { screenshot, task }) => {
  const deepseek = require('./src/utils/deepseek');
  const visionService = require('./src/services/visionService');
  
  try {
    const textResult = await visionService.recognizeText(screenshot);
    if (!textResult.success) {
      return { error: 'Text recognition failed' };
    }
    
    return await deepseek.analyzeScreenshot(textResult.text, task);
  } catch (error) {
    return { error: error.message };
  }
});

// Add keyboard shortcut to toggle DevTools only in dev mode
app.whenReady().then(() => {
  if (isDev) {
    const { globalShortcut } = require('electron');
    globalShortcut.register('CommandOrControl+Shift+I', () => {
      if (mainWindow) {
        mainWindow.webContents.toggleDevTools();
      }
    });
  }
});