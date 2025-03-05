const { desktopCapturer } = require('electron');
const fs = require('fs-extra');
const path = require('path');
const { execSync } = require('child_process');
const { createWorker } = require('tesseract.js');

class VisionService {
  constructor() {
    this.screenshotsDir = path.join(process.cwd(), 'screenshots');
    fs.ensureDirSync(this.screenshotsDir);
  }

  /**
   * Take a screenshot of the currently active window
   */
  async captureActiveWindow() {
    try {
      // Generate a unique filename
      const timestamp = Date.now();
      const filename = `screenshot_${timestamp}.png`;
      const screenshotPath = path.join(this.screenshotsDir, filename);
      
      // Use PowerShell to capture the active window on Windows
      if (process.platform === 'win32') {
        const psCommand = `
          Add-Type -AssemblyName System.Windows.Forms
          Add-Type -AssemblyName System.Drawing
          
          $screen = [System.Windows.Forms.Screen]::PrimaryScreen
          $bitmap = New-Object System.Drawing.Bitmap $screen.Bounds.Width, $screen.Bounds.Height
          $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
          $graphics.CopyFromScreen($screen.Bounds.X, $screen.Bounds.Y, 0, 0, $bitmap.Size)
          $bitmap.Save("${screenshotPath}")
          $graphics.Dispose()
          $bitmap.Dispose()
        `;
        
        execSync(`powershell -Command "${psCommand}"`);
        
        return {
          success: true,
          path: screenshotPath
        };
      } else {
        throw new Error('Platform not supported');
      }
    } catch (error) {
      console.error('Error capturing window:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Recognize text in a screenshot using OCR
   */
  async recognizeText(imagePath) {
    const worker = await createWorker('eng');
    
    try {
      const result = await worker.recognize(imagePath);
      await worker.terminate();
      
      return {
        success: true,
        text: result.data.text,
        confidence: result.data.confidence
      };
    } catch (error) {
      console.error('Error recognizing text:', error);
      await worker.terminate();
      return { success: false, error: error.message };
    }
  }

  /**
   * Read calculator result using OCR
   */
  async readCalculatorDisplay() {
    try {
      // Take a screenshot
      const screenshot = await this.captureActiveWindow();
      
      if (!screenshot.success) {
        throw new Error('Failed to capture screen');
      }
      
      // Recognize text in the screenshot
      const textResult = await this.recognizeText(screenshot.path);
      
      if (!textResult.success) {
        throw new Error('Text recognition failed');
      }
      
      // Extract calculator result by looking for patterns
      const lines = textResult.text.split('\n');
      let result = null;
      
      // Look for lines that look like calculator results
      for (const line of lines) {
        // Check for equals pattern (e.g. "24 + 57 = 81")
        const equalsMatch = line.match(/(\d+\s*[\+\-\*\/]\s*\d+\s*=\s*(\d+))/);
        if (equalsMatch) {
          result = equalsMatch[2].trim();
          break;
        }
        
        // Check for plain number (likely the result display)
        const numberMatch = line.match(/^\s*(\d+)\s*$/);
        if (numberMatch) {
          result = numberMatch[1].trim();
          // Save but continue looking for a better match
          if (!result) result = numberMatch[1];
        }
      }
      
      return {
        success: !!result,
        result,
        screenshot: screenshot.path
      };
    } catch (error) {
      console.error('Error reading calculator display:', error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Verify web page loaded correctly
   */
  async verifyWebPage(websiteName) {
    try {
      // Take a screenshot
      const screenshot = await this.captureActiveWindow();
      
      if (!screenshot.success) {
        throw new Error('Failed to capture screen');
      }
      
      // Recognize text to verify page content
      const textResult = await this.recognizeText(screenshot.path);
      
      if (!textResult.success) {
        throw new Error('Text recognition failed');
      }
      
      // Check if recognizable text from the website is present
      const text = textResult.text.toLowerCase();
      
      // Customize verification based on website
      let verified = false;
      if (websiteName.toLowerCase().includes('bookmyshow')) {
        verified = text.includes('bookmyshow') || 
                  text.includes('movie') || 
                  text.includes('cinema') || 
                  text.includes('tickets');
      } else {
        // Generic verification - check if website name appears in the text
        verified = text.includes(websiteName.toLowerCase());
      }
      
      return {
        success: true,
        verified,
        screenshot: screenshot.path
      };
    } catch (error) {
      console.error('Error verifying web page:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new VisionService();