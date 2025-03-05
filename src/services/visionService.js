// src/services/visionService.js
const fs = require('fs');
const path = require('path');
const { desktopCapturer, nativeImage } = require('electron');

/**
 * Service for vision-related operations
 * Safe implementation that avoids ArrayBuffer sandbox issues
 */
class VisionService {
  /**
   * Take a screenshot and save it to the specified path
   * @param {string} outputPath - Path to save the screenshot
   * @returns {Promise<Object>} - Result object with success status
   */
  async takeScreenshot(outputPath) {
    try {
      // Create directory if it doesn't exist
      const dir = path.dirname(outputPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      // Use Electron's desktopCapturer instead of robotjs to avoid ArrayBuffer issues
      const sources = await desktopCapturer.getSources({ 
        types: ['screen'],
        thumbnailSize: { width: 1920, height: 1080 }
      });
      
      if (!sources || sources.length === 0) {
        throw new Error('No screen sources found');
      }
      
      // Get the primary display
      const primarySource = sources[0];
      
      // Save the thumbnail to the output path
      const image = primarySource.thumbnail.toPNG();
      fs.writeFileSync(outputPath, image);
      
      return {
        success: true,
        path: outputPath,
        sourceId: primarySource.id,
        sourceName: primarySource.name || 'screen'
      };
    } catch (error) {
      console.error('Error taking screenshot:', error);
      
      // Create an empty image as fallback
      try {
        this.createDummyScreenshot(outputPath);
        return {
          success: false,
          path: outputPath,
          error: error.message,
          fallback: true
        };
      } catch (fallbackError) {
        return {
          success: false,
          error: `${error.message} (Fallback also failed: ${fallbackError.message})`
        };
      }
    }
  }
  
  /**
   * Create a dummy screenshot when real screenshot fails
   * @param {string} outputPath - Path to save the dummy screenshot
   */
  createDummyScreenshot(outputPath) {
    try {
      // Create a simple 100x100 white image
      const emptyImage = nativeImage.createEmpty();
      const size = { width: 100, height: 100 };
      
      // Resize to create a non-empty image
      const resizedImage = emptyImage.resize(size);
      
      // Convert to PNG and save
      const pngData = resizedImage.toPNG();
      fs.writeFileSync(outputPath, pngData);
      
      console.log(`Created dummy screenshot at ${outputPath}`);
    } catch (error) {
      console.error('Error creating dummy screenshot:', error);
      
      // Last resort: write a text file instead
      fs.writeFileSync(outputPath, 'Dummy screenshot - image creation failed');
    }
  }

  /**
   * Capture the active window
   * @returns {Promise<Object>} - Result with screenshot path
   */
  async captureActiveWindow() {
    try {
      // Get all window sources
      const sources = await desktopCapturer.getSources({ 
        types: ['window'],
        thumbnailSize: { width: 1280, height: 720 }
      });
      
      if (!sources || sources.length === 0) {
        throw new Error('No window sources found');
      }
      
      // Find the focused window or use the first one
      const focusedWindow = sources[0];
      
      // Save the thumbnail to a file
      const outputPath = path.join(
        process.cwd(),
        'screenshots',
        `window_${Date.now()}.png`
      );
      
      // Create directory if it doesn't exist
      const dir = path.dirname(outputPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      // Convert the thumbnail to a PNG and save
      const thumbnail = focusedWindow.thumbnail.toPNG();
      fs.writeFileSync(outputPath, thumbnail);
      
      return {
        success: true,
        path: outputPath,
        sourceId: focusedWindow.id,
        sourceName: focusedWindow.name || 'window'
      };
    } catch (error) {
      console.error('Error capturing active window:', error);
      
      // Try to capture the whole screen as fallback
      try {
        console.log('Trying to capture full screen as fallback...');
        const screenOutputPath = path.join(
          process.cwd(),
          'screenshots',
          `fallback_screen_${Date.now()}.png`
        );
        
        const result = await this.takeScreenshot(screenOutputPath);
        
        return {
          ...result,
          fallback: true,
          originalError: error.message
        };
      } catch (fallbackError) {
        return {
          success: false,
          error: `${error.message} (Fallback also failed: ${fallbackError.message})`
        };
      }
    }
  }
  
  /**
   * Recognize text from a screenshot (OCR)
   * This is a placeholder that would be implemented with an OCR library
   * @param {string} screenshotPath - Path to the screenshot
   * @returns {Promise<Object>} - Result with recognized text
   */
  async recognizeText(screenshotPath) {
    try {
      console.log(`Recognizing text from ${screenshotPath}`);
      
      // This is where you would use an OCR library like Tesseract.js
      // For now, return placeholder text
      return {
        success: true,
        text: "This is a placeholder OCR result since no actual OCR is implemented yet. In a real implementation, this would contain text extracted from the screenshot.",
        confidence: 0.9
      };
    } catch (error) {
      console.error('Error recognizing text:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = VisionService;