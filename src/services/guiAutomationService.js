const keySender = require('node-key-sender');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
const visionService = require('./visionService');

class GuiAutomationService {
  constructor() {
    this.isWindows = process.platform === 'win32';
  }

  /**
   * Find and activate a window by title
   */
  async findAndActivateWindow(windowTitle) {
    try {
      if (this.isWindows) {
        const psCommand = `
          Add-Type @"
          using System;
          using System.Runtime.InteropServices;
          public class Win32 {
            [DllImport("user32.dll")]
            [return: MarshalAs(UnmanagedType.Bool)]
            public static extern bool SetForegroundWindow(IntPtr hWnd);
            
            [DllImport("user32.dll")]
            public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
          }
"@
          
          \$windows = Get-Process | Where-Object {(\$_.MainWindowTitle -like "*${windowTitle}*") -and (\$_.MainWindowHandle -ne 0)}
          if (\$windows) {
            \$handle = \$windows.MainWindowHandle
            [Win32]::ShowWindow(\$handle, 9) # SW_RESTORE = 9
            [Win32]::SetForegroundWindow(\$handle)
            Write-Output "Window activated: \$(\$windows.MainWindowTitle)"
            exit 0
          } else {
            Write-Output "Window not found with title containing: ${windowTitle}"
            exit 1
          }
        `;
        
        const result = await execPromise(`powershell -Command "${psCommand}"`);
        console.log(result.stdout);
        
        await this.sleep(1000);
        return { success: true, message: result.stdout };
      } else {
        return { 
          success: false, 
          message: `Window activation not implemented for ${process.platform}`
        };
      }
    } catch (error) {
      console.error('Error finding/activating window:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Close the calculator application
   */
  async closeCalculator() {
    try {
      if (this.isWindows) {
        // Try both modern and legacy calculator process names
        const result = await execPromise('taskkill /f /im CalculatorApp.exe 2>nul || taskkill /f /im Calculator.exe');
        console.log('Calculator closed');
        return { success: true };
      } else {
        return { success: false, error: "Not implemented for this platform" };
      }
    } catch (error) {
      console.error('Error closing calculator:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Type text using keyboard simulation
   */
  async typeText(text) {
    try {
      keySender.sendText(text);
      return { success: true };
    } catch (error) {
      console.error('Error typing text:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Press a key or key combination
   */
  async pressKey(key, modifiers = []) {
    try {
      console.log(`Attempting to press key: ${key}`);
      
      // Map common key names to their correct values
      const keyMap = {
        'enter': 'return',
        'return': 'return',
        'esc': 'escape',
        'escape': 'escape',
        'tab': 'tab',
        'space': 'space',
        'backspace': 'backspace',
        'delete': 'delete',
        'up': 'up',
        'down': 'down',
        'left': 'left',
        'right': 'right'
      };
      
      // Use mapped key if available, otherwise use the provided key
      const mappedKey = keyMap[key.toLowerCase()] || key;
      
      if (modifiers.length > 0) {
        modifiers.forEach(modifier => keySender.sendKey(modifier));
      }
      
      keySender.sendKey(mappedKey);
      
      return { success: true };
    } catch (error) {
      console.error('Error pressing key:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Automate calculator operation
   */
  async automateCalculator(num1, num2, operation) {
    try {
      console.log(`Automating calculator: ${num1} ${operation} ${num2}`);
      
      // Activate the calculator window
      await this.findAndActivateWindow('Calculator');
      await this.sleep(500);
      
      // Clear calculator with Escape key
      await this.pressKey('escape');
      await this.sleep(300);
      
      // Type first number
      await this.typeText(num1.toString());
      await this.sleep(300);
      
      // Type operation
      if (operation === '+') await this.typeText('+');
      else if (operation === '-') await this.typeText('-');
      else if (operation === '*') await this.typeText('*');
      else if (operation === '/') await this.typeText('/');
      await this.sleep(300);
      
      // Type second number
      await this.typeText(num2.toString());
      await this.sleep(300);
      
      // Press equals
      await this.pressKey('enter');
      await this.sleep(1000); // Longer wait for result to display
      
      // Read the result using vision service
      const visionResult = await visionService.readCalculatorDisplay();
      
      // Capture the result
      let resultValue;
      
      if (visionResult.success && visionResult.result) {
        resultValue = visionResult.result;
        console.log(`Read calculator result with OCR: ${resultValue}`);
      } else {
        throw new Error('Could not read calculator result');
      }
      
      // Close the calculator
      await this.closeCalculator();
      
      return { 
        success: true, 
        operation: `${num1} ${operation} ${num2}`,
        result: resultValue,
        message: `Calculator operation completed: ${num1} ${operation} ${num2} = ${resultValue}`
      };
    } catch (error) {
      console.error('Error automating calculator:', error);
      // Try to close calculator even if there was an error
      try {
        await this.closeCalculator();
      } catch (closeError) {
        console.error('Error closing calculator after failure:', closeError);
      }
      return { success: false, error: error.message };
    }
  }

  /**
   * Utility sleep function
   */
  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = new GuiAutomationService();