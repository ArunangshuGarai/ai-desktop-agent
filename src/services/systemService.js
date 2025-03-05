// src/services/systemService.js
const robot = require('robotjs');
const { exec } = require('child_process');
const path = require('path');

/**
 * Service for system-level operations
 * Handles mouse, keyboard, and other system functions
 */
class SystemService {
  /**
   * Execute a system command
   * @param {string} command - Command to execute
   * @returns {Promise<Object>} - Result of command execution
   */
  executeCommand(command) {
    return new Promise((resolve, reject) => {
      // Simple security check - prevent dangerous commands
      if (this.isUnsafeCommand(command)) {
        return reject(new Error('Command execution rejected for security reasons'));
      }
      
      exec(command, (error, stdout, stderr) => {
        if (error) {
          console.error(`Error executing command: ${error.message}`);
          return reject(error);
        }
        
        if (stderr) {
          console.warn(`Command stderr: ${stderr}`);
        }
        
        resolve({
          success: true,
          command,
          output: stdout
        });
      });
    });
  }
  
  /**
   * Checks if a command is potentially unsafe
   * @param {string} command - Command to check
   * @returns {boolean} - True if command is potentially unsafe
   */
  isUnsafeCommand(command) {
    const unsafePatterns = [
      'rm -rf', 'format', 'mkfs',
      'dd if=', 'wget', 'curl',
      ';', '&&', '||', '`', '$(',
      '>', '>>', '|'
    ];
    
    return unsafePatterns.some(pattern => command.includes(pattern));
  }
  
  /**
   * Move the mouse to specific coordinates
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @returns {Object} - Success status
   */
  mouseMove(x, y) {
    try {
      robot.moveMouse(x, y);
      return { success: true, x, y };
    } catch (error) {
      console.error('Error moving mouse:', error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Click the mouse at the current position or specified coordinates
   * @param {number} [x] - Optional X coordinate
   * @param {number} [y] - Optional Y coordinate
   * @param {string} [button='left'] - Mouse button to click
   * @returns {Object} - Success status
   */
  mouseClick(x, y, button = 'left') {
    try {
      if (x !== undefined && y !== undefined) {
        robot.moveMouse(x, y);
      }
      
      robot.mouseClick(button);
      
      return { 
        success: true, 
        button,
        position: robot.getMousePos()
      };
    } catch (error) {
      console.error('Error clicking mouse:', error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Type text using the keyboard
   * @param {string} text - Text to type
   * @returns {Object} - Success status
   */
  typeText(text) {
    try {
      robot.typeString(text);
      return { success: true, text };
    } catch (error) {
      console.error('Error typing text:', error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Press a specific key
   * @param {string} key - Key to press
   * @param {Array<string>} [modifiers] - Modifier keys to hold
   * @returns {Object} - Success status
   */
  pressKey(key, modifiers = []) {
    try {
      if (modifiers.length > 0) {
        modifiers.forEach(modifier => robot.keyToggle(modifier, 'down'));
      }
      
      robot.keyTap(key);
      
      if (modifiers.length > 0) {
        modifiers.forEach(modifier => robot.keyToggle(modifier, 'up'));
      }
      
      return { success: true, key, modifiers };
    } catch (error) {
      console.error('Error pressing key:', error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Scroll the mouse wheel
   * @param {string} direction - 'up' or 'down'
   * @param {number} amount - Amount to scroll
   * @returns {Object} - Success status
   */
  scroll(direction, amount) {
    try {
      const scrollAmount = direction === 'down' ? amount : -amount;
      robot.scrollMouse(0, scrollAmount);
      
      return { 
        success: true, 
        direction,
        amount
      };
    } catch (error) {
      console.error('Error scrolling:', error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Get information about the system screens
   * @returns {Object} - Screen information
   */
  getScreenInfo() {
    try {
      const screenSize = robot.getScreenSize();
      const mousePos = robot.getMousePos();
      
      return {
        success: true,
        screens: [
          {
            id: 'primary',
            width: screenSize.width,
            height: screenSize.height
          }
        ],
        mousePosition: mousePos
      };
    } catch (error) {
      console.error('Error getting screen info:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = SystemService;