// test-vision-minimal.js
console.log('Starting vision test...');

// Import just one service to test
const visionService = require('./src/services/visionService');

async function testMinimal() {
  try {
    console.log('Script is running!');
    console.log('Testing basic screenshot...');
    
    // Create screenshots directory if it doesn't exist
    const fs = require('fs-extra');
    const path = require('path');
    const screenshotsDir = path.join(process.cwd(), 'screenshots');
    fs.ensureDirSync(screenshotsDir);
    
    console.log('Screenshots directory ensured at:', screenshotsDir);
    
    // Just try to take a screenshot
    const timestamp = Date.now();
    const filename = `test_${timestamp}.png`;
    const targetPath = path.join(screenshotsDir, filename);
    
    console.log('Will attempt to save screenshot to:', targetPath);
    
    // Simple PowerShell screenshot command
    const { execSync } = require('child_process');
    const psCommand = `
      Add-Type -AssemblyName System.Windows.Forms
      Add-Type -AssemblyName System.Drawing
      
      $screen = [System.Windows.Forms.Screen]::PrimaryScreen
      $bitmap = New-Object System.Drawing.Bitmap $screen.Bounds.Width, $screen.Bounds.Height
      $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
      $graphics.CopyFromScreen($screen.Bounds.X, $screen.Bounds.Y, 0, 0, $bitmap.Size)
      $bitmap.Save("${targetPath}")
      $graphics.Dispose()
      $bitmap.Dispose()
    `;
    
    console.log('Executing PowerShell command...');
    execSync(`powershell -Command "${psCommand}"`);
    
    console.log('Screenshot taken successfully!');
    console.log('Test complete!');
  } catch (error) {
    console.error('Error during test:', error);
  }
}

console.log('Calling test function...');
testMinimal();
console.log('End of script (this should show regardless of async function)');