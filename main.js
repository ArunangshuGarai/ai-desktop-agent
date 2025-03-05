const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const isDev = require('electron-is-dev');
const taskManager = require('./src/core/taskManager');
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
  
  // Set up event forwarding from TaskManager to renderer
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

// Forward events from TaskManager to renderer
// Update the events array in setupTaskManagerEvents
function setupTaskManagerEvents() {
  const events = [
    'analyzing', 'analyzed', 'step-started', 'step-completed',
    'step-error', 'completed', 'error', 'calculation-result', 'task-summary'
  ];
  
  events.forEach(event => {
    taskManager.on(event, (data) => {
      if (mainWindow) {
        mainWindow.webContents.send(`task-${event}`, data);
      }
    });
  });
}

// IPC handlers - ensure all return valid JSON
ipcMain.handle('analyze-task', async (event, { task }) => {
  try {
    return await taskManager.analyzeTask(task);
  } catch (error) {
    return { error: error.message };
  }
});

ipcMain.handle('execute-next-step', async () => {
  try {
    return await taskManager.executeNextStep();
  } catch (error) {
    return { error: error.message };
  }
});

ipcMain.handle('execute-full-task', async (event, { task }) => {
  try {
    await taskManager.analyzeTask(task);
    return await taskManager.executeFullTask();
  } catch (error) {
    return { error: error.message };
  }
});

ipcMain.handle('get-task-state', () => {
  return taskManager.getTaskState();
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