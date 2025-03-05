// src/services/mouseService.js
const robot = require('robotjs');
const visionService = require('./visionService');
const deepseek = require('../utils/deepseek');

class MouseService {
  /**
   * Move mouse to specific coordinates
   */
  async moveTo(x, y) {
    try {
      console.log(`Moving mouse to coordinates: (${x}, ${y})`);
      robot.moveMouse(x, y);
      return { success: true, coordinates: { x, y } };
    } catch (error) {
      console.error('Error moving mouse:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Click at current mouse position
   */
  async click(button = "left") {
    try {
      console.log(`Clicking mouse button: ${button}`);
      robot.mouseClick(button);
      return { success: true };
    } catch (error) {
      console.error('Error clicking mouse:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Move to coordinates and click
   */
  async moveAndClick(x, y, button = "left") {
    try {
      await this.moveTo(x, y);
      await this.click(button);
      return { success: true, coordinates: { x, y } };
    } catch (error) {
      console.error('Error in move and click:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Find and click on an element based on visual description
   */
  async findAndClickElement(elementDescription) {
    try {
      console.log(`Looking for element: "${elementDescription}"`);
      
      // Take screenshot
      const screenshot = await visionService.captureActiveWindow();
      
      if (!screenshot.success) {
        throw new Error('Failed to capture screen');
      }
      
      // Recognize text in screenshot
      const textResult = await visionService.recognizeText(screenshot.path);
      
      if (!textResult.success) {
        throw new Error('Failed to recognize text in screenshot');
      }
      
      // Ask DeepSeek API to find the element
      const prompt = `
        Analyze this screenshot text and find the UI element described as: "${elementDescription}"
        
        Screenshot text content:
        ${textResult.text}
        
        Screen resolution is approximately 1920x1080.
        Return a JSON object with:
        {
          "found": true/false,
          "x": estimated x coordinate (number),
          "y": estimated y coordinate (number),
          "confidence": 0-1 value indicating confidence,
          "element": "what exactly was found"
        }
      `;
      
      const result = await deepseek.generateJSON(prompt);
      
      if (result.found) {
        console.log(`Found element "${elementDescription}" at coordinates: (${result.x}, ${result.y})`);
        // Move and click
        return await this.moveAndClick(result.x, result.y);
      } else {
        return { 
          success: false, 
          error: `Element "${elementDescription}" not found on screen` 
        };
      }
    } catch (error) {
      console.error('Error finding and clicking element:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new MouseService();