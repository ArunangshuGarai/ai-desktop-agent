// src/services/guiAutomationService.js - Modified to avoid Java dependency
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
const visionService = require('./visionService');
const path = require('path');
const fs = require('fs-extra');

class GuiAutomationService {
  constructor() {
    this.isWindows = process.platform === 'win32';
    this.scriptDir = path.join(process.cwd(), 'scripts');
    fs.ensureDirSync(this.scriptDir);
    
    // Create PowerShell keyboard script if on Windows
    if (this.isWindows) {
      this.createKeyboardScript();
    }
  }

  /**
   * Create PowerShell script for keyboard input
   */
  createKeyboardScript() {
    const scriptPath = path.join(this.scriptDir, 'keyboard.ps1');
    const scriptContent = `
      param (
        [string]$action,
        [string]$text,
        [string]$key
      )

      Add-Type -AssemblyName System.Windows.Forms

      if ($action -eq "type") {
        [System.Windows.Forms.SendKeys]::SendWait($text)
      }
      elseif ($action -eq "key") {
        [System.Windows.Forms.SendKeys]::SendWait($key)
      }
      elseif ($action -eq "combo") {
        $keys = $key -split "\\+"
        foreach ($k in $keys) {
          if ($k -eq "control") { [System.Windows.Forms.SendKeys]::SendWait("^") }
          elseif ($k -eq "alt") { [System.Windows.Forms.SendKeys]::SendWait("%") }
          elseif ($k -eq "shift") { [System.Windows.Forms.SendKeys]::SendWait("+") }
          else { [System.Windows.Forms.SendKeys]::SendWait($k) }
        }
      }
    `;
    
    fs.writeFileSync(scriptPath, scriptContent);
    return scriptPath;
  }

  /**
   * Type text using PowerShell keyboard input
   */
  async typeText(text) {
    try {
      console.log(`Typing text: ${text.substring(0, 50)}${text.length > 50 ? '...' : ''}`);
      
      // Take before screenshot
      const beforeScreenshot = await visionService.captureActiveWindow();
      
      if (this.isWindows) {
        // Escape single quotes for PowerShell
        const escapedText = text.replace(/'/g, "''");
        
        // Use PowerShell to send keystrokes
        await execPromise(`powershell -Command "& '${path.join(this.scriptDir, 'keyboard.ps1')}' -action 'type' -text '${escapedText}'"`);
      } else {
        throw new Error("Platform not supported for keyboard input");
      }
      
      // Take after screenshot
      const afterScreenshot = await visionService.captureActiveWindow();
      
      return { 
        success: true, 
        textLength: text.length,
        beforeScreenshot: beforeScreenshot.success ? beforeScreenshot.path : null,
        afterScreenshot: afterScreenshot.success ? afterScreenshot.path : null
      };
    } catch (error) {
      console.error('Error typing text:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Press a single key
   */
  async pressKey(key) {
    try {
      console.log(`Pressing key: ${key}`);
      
      // Map keys to SendKeys format
      const keyMap = {
        'enter': '{ENTER}',
        'return': '{ENTER}',
        'esc': '{ESC}',
        'escape': '{ESC}',
        'tab': '{TAB}',
        'space': ' ',
        'backspace': '{BACKSPACE}',
        'delete': '{DELETE}',
        'up': '{UP}',
        'down': '{DOWN}',
        'left': '{LEFT}',
        'right': '{RIGHT}'
      };
      
      // Use mapped key if available, otherwise use the provided key
      const mappedKey = keyMap[key.toLowerCase()] || key;
      
      if (this.isWindows) {
        await execPromise(`powershell -Command "& '${path.join(this.scriptDir, 'keyboard.ps1')}' -action 'key' -key '${mappedKey}'"`);
      } else {
        throw new Error("Platform not supported for keyboard input");
      }
      
      // Take screenshot after key press
      const screenshot = await visionService.captureActiveWindow();
      
      return { 
        success: true, 
        key: mappedKey,
        screenshot: screenshot.success ? screenshot.path : null
      };
    } catch (error) {
      console.error('Error pressing key:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Press multiple keys (keyboard shortcut)
   */
  async pressKeys(keys) {
    try {
      console.log(`Pressing keys: ${keys.join(' + ')}`);
      
      // Take before screenshot
      const beforeScreenshot = await visionService.captureActiveWindow();
      
      if (this.isWindows) {
        // Join keys with + for the PowerShell script
        const keyCombo = keys.join('+');
        await execPromise(`powershell -Command "& '${path.join(this.scriptDir, 'keyboard.ps1')}' -action 'combo' -key '${keyCombo}'"`);
      } else {
        throw new Error("Platform not supported for keyboard shortcuts");
      }
      
      // Take after screenshot
      const afterScreenshot = await visionService.captureActiveWindow();
      
      return { 
        success: true, 
        keys,
        beforeScreenshot: beforeScreenshot.success ? beforeScreenshot.path : null,
        afterScreenshot: afterScreenshot.success ? afterScreenshot.path : null
      };
    } catch (error) {
      console.error('Error pressing keys:', error);
      return { success: false, error: error.message };
    }
  }

  // Other methods remain the same...
}

module.exports = new GuiAutomationService();