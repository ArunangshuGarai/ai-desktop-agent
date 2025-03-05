// main.js - Updated with vision-based task manager and enhanced error handling
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

// Rest of your imports...
const { app, BrowserWindow, ipcMain } = require('electron');
const isDev = require('electron-is-dev');
const visionTaskManager = require('./src/core/visionTaskManager'); // Updated import
const fs = require('fs');

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
      // Only enable DevTools in development and if explicitly enabled
      devTools: isDev && (process.env.OPEN_DEVTOOLS === 'true')
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
  // Set to false to prevent auto-opening
  if (isDev && process.env.OPEN_DEVTOOLS === 'true') {
    // Delay DevTools opening to prevent layout issues
    setTimeout(() => {
      mainWindow.webContents.openDevTools();
    }, 1000);
  }
  
  // Set up event forwarding from VisionTaskManager to renderer
  setupTaskManagerEvents();
}

app.whenReady().then(() => {
  // Create window and initialize services
  createWindow();
  setupErrorHandling();
  
  // Suppress DevTools console warnings about autofill
  if (mainWindow && mainWindow.webContents) {
    mainWindow.webContents.on('devtools-opened', () => {
      // Send console message to clear or filter unwanted messages
      mainWindow.webContents.executeJavaScript(`
        // Override console.error to filter out autofill errors
        const originalConsoleError = console.error;
        console.error = function() {
          const args = Array.from(arguments);
          const message = args.join(' ');
          if (!message.includes('Autofill.') && !message.includes('wasn\\'t found')) {
            originalConsoleError.apply(console, args);
          }
        };
        console.log('DevTools console errors filtered');
      `);
    });
  }
});

// Set up global error handling
function setupErrorHandling() {
  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    logError('uncaughtException', error);
    
    // Notify renderer process of error
    if (mainWindow) {
      mainWindow.webContents.send('app-error', {
        type: 'uncaughtException',
        message: error.message,
        stack: error.stack
      });
    }
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    logError('unhandledRejection', reason);
    
    // Notify renderer process of error
    if (mainWindow) {
      mainWindow.webContents.send('app-error', {
        type: 'unhandledRejection',
        message: reason?.message || 'Unhandled Promise Rejection',
        stack: reason?.stack
      });
    }
  });
}

// Log errors to file for debugging
function logError(type, error) {
  try {
    const logDir = path.join(app.getPath('userData'), 'logs');
    
    // Ensure log directory exists
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    
    const logFile = path.join(logDir, 'error.log');
    const timestamp = new Date().toISOString();
    const errorMessage = error?.stack || error?.message || String(error);
    
    fs.appendFileSync(
      logFile,
      `[${timestamp}] ${type}: ${errorMessage}\n\n`
    );
  } catch (logError) {
    console.error('Failed to write to error log:', logError);
  }
}

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
// Forward events from VisionTaskManager to renderer
function setupTaskManagerEvents() {
  const events = [
    'analyzing', 'step-started', 'step-completed',
    'step-error', 'completed', 'error', 'calculation-result', 'task-summary',
    'screenshot-taken', 'vision-analysis', 'element-found', 'element-not-found'
    // Remove 'analyzed' from this list to prevent duplicate events
  ];
  
  events.forEach(event => {
    visionTaskManager.on(event, (data) => {
      if (mainWindow) {
        try {
          // Ensure data is serializable
          const safeData = safelySerialize(data);
          mainWindow.webContents.send(`task-${event}`, safeData);
        } catch (error) {
          console.error(`Error sending task-${event} event:`, error);
          // Send error notification instead
          mainWindow.webContents.send(`task-error`, {
            originalEvent: event,
            error: error.message
          });
        }
      }
    });
  });
}

// Ensure data can be safely sent through IPC
function safelySerialize(data) {
  try {
    // Test if data can be serialized
    JSON.stringify(data);
    return data;
  } catch (error) {
    // If data can't be serialized, create a safe version
    if (typeof data === 'object' && data !== null) {
      const safeObj = {};
      for (const key in data) {
        if (Object.prototype.hasOwnProperty.call(data, key)) {
          try {
            const value = data[key];
            // Try to serialize the value
            JSON.stringify(value);
            safeObj[key] = value;
          } catch (e) {
            // If the value can't be serialized, use a placeholder
            safeObj[key] = `[Unserializable data: ${typeof value}]`;
          }
        }
      }
      return safeObj;
    }
    // If not an object, return a safe string representation
    return `[Unserializable data: ${typeof data}]`;
  }
}

// Fixed analyze-task handler with event forwarding
ipcMain.handle('analyze-task', async (event, { task }) => {
  try {
    console.log("Analyzing task:", task.substring(0, 150) + (task.length > 150 ? "..." : ""));
    
    // Send event that analysis is starting
    if (mainWindow) {
      mainWindow.webContents.send('task-analyzing', { task });
    }
    
    const result = await visionTaskManager.analyzeTask(task);
    console.log("Task analysis completed successfully");
    
    // Send the analysis result to the renderer
    if (mainWindow) {
      mainWindow.webContents.send('task-analyzed', result);
    }
    
    return result;
  } catch (error) {
    console.error("Error analyzing task:", error);
    logError('analyze-task', error);
    
    // Send error to renderer
    if (mainWindow) {
      mainWindow.webContents.send('task-error', { error: error.message });
    }
    
    // Return a structured error with fallback steps
    return {
      error: error.message,
      analysis: "Failed to complete task analysis due to an error",
      steps: [
        {
          description: "Take screenshot to assess current state",
          action: "screenshot",
          target: null
        }
      ]
    };
  }
});

ipcMain.handle('execute-next-step', async () => {
  try {
    console.log("Executing next step...");
    const result = await visionTaskManager.executeNextStep();
    console.log("Step execution completed");
    return result;
  } catch (error) {
    console.error("Error executing step:", error);
    logError('execute-next-step', error);
    return {
      error: error.message,
      success: false,
      message: "Failed to execute step"
    };
  }
});

ipcMain.handle('execute-full-task', async (event, { task }) => {
  try {
    console.log("Executing full task:", task.substring(0, 150) + (task.length > 150 ? "..." : ""));
    
    let analysisResult;
    try {
      analysisResult = await visionTaskManager.analyzeTask(task);
      console.log("Task analysis completed");
      
      // Send the analysis result to the renderer so it can display the response
      if (mainWindow) {
        mainWindow.webContents.send('task-analyzed', analysisResult);
      }
    } catch (analysisError) {
      console.error("Error during task analysis:", analysisError);
      logError('execute-full-task-analysis', analysisError);
      throw new Error(`Analysis failed: ${analysisError.message}`);
    }
    
    const executionResult = await visionTaskManager.executeFullTask();
    console.log("Task execution completed");
    
    // Send task summary event
    if (mainWindow) {
      mainWindow.webContents.send('task-task-summary', {
        message: "Task execution completed successfully",
        results: {
          analysis: analysisResult,
          execution: executionResult
        }
      });
    }
    
    return {
      analysis: analysisResult,
      execution: executionResult,
      success: true
    };
  } catch (error) {
    console.error("Error executing full task:", error);
    logError('execute-full-task', error);
    
    // Send error event to renderer
    if (mainWindow) {
      mainWindow.webContents.send('task-error', { 
        error: error.message,
        task
      });
    }
    
    return {
      error: error.message,
      success: false,
      message: "Failed to execute full task"
    };
  }
});

ipcMain.handle('get-task-state', () => {
  try {
    const state = visionTaskManager.getTaskState();
    return state;
  } catch (error) {
    console.error("Error getting task state:", error);
    logError('get-task-state', error);
    return {
      error: error.message,
      state: 'error',
      message: "Failed to get task state"
    };
  }
});

// Enhanced vision-specific IPC handlers
ipcMain.handle('take-screenshot', async () => {
  const visionService = require('./src/services/visionService');
  try {
    console.log("Taking screenshot...");
    const result = await visionService.captureActiveWindow();
    console.log("Screenshot taken successfully");
    return result;
  } catch (error) {
    console.error("Error taking screenshot:", error);
    logError('take-screenshot', error);
    return {
      error: error.message,
      success: false,
      message: "Failed to take screenshot"
    };
  }
});

ipcMain.handle('analyze-screenshot', async (event, { screenshot, task }) => {
  const deepseek = require('./src/utils/deepseek');
  const visionService = require('./src/services/visionService');
  
  try {
    console.log("Analyzing screenshot for task:", task.substring(0, 150) + (task.length > 150 ? "..." : ""));
    
    const textResult = await visionService.recognizeText(screenshot);
    if (!textResult.success) {
      console.error("Text recognition failed");
      return {
        error: 'Text recognition failed',
        details: textResult.error || 'Unknown error in text recognition'
      };
    }
    
    console.log("Text recognition successful, analyzing with deepseek...");
    try {
      const analysisResult = await deepseek.analyzeScreenshot(textResult.text, task);
      return analysisResult;
    } catch (analysisError) {
      console.error("Error in deepseek analysis:", analysisError);
      
      // Create a fallback analysis response when deepseek fails
      return {
        success: false,
        error: analysisError.message,
        analysis: "Failed to analyze screenshot content",
        fallback: true,
        steps: [
          {
            description: "Take another screenshot to retry",
            action: "screenshot",
            target: null
          }
        ]
      };
    }
  } catch (error) {
    console.error("Error in screenshot analysis workflow:", error);
    logError('analyze-screenshot', error);
    
    return {
      error: error.message,
      success: false,
      message: "Failed to analyze screenshot"
    };
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
    
    // Add emergency reset shortcut for development
    globalShortcut.register('CommandOrControl+Shift+R', () => {
      if (mainWindow) {
        mainWindow.webContents.send('emergency-reset');
        console.log("Emergency reset triggered");
      }
    });
  }
});

// Clean up shortcuts when app is quitting
app.on('will-quit', () => {
  if (isDev) {
    const { globalShortcut } = require('electron');
    globalShortcut.unregisterAll();
  }
});

module.exports = app;