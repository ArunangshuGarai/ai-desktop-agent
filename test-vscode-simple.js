// test-vscode-simple.js
const visionService = require('./src/services/visionService');
const guiAutomationService = require('./src/services/guiAutomationService');
const deepseek = require('./src/utils/deepseek');

async function testVSCodeSimple() {
  try {
    console.log('Testing VS Code interaction...');
    
    // 1. Check if VS Code is already open, if not open it
    console.log('Looking for VS Code...');
    const vsCodeWindow = await guiAutomationService.findAndActivateWindow('Visual Studio Code');
    
    if (!vsCodeWindow.success) {
      console.log('Opening VS Code...');
      await guiAutomationService.executeCommand('code');
      // Wait for VS Code to open
      await guiAutomationService.sleep(3000);
    }
    
    // 2. Take a screenshot to verify VS Code is open
    console.log('Taking screenshot...');
    const screenshot = await visionService.captureActiveWindow();
    console.log(`Screenshot saved to: ${screenshot.path}`);
    
    // 3. Create a new file (Ctrl+N)
    console.log('Creating new file...');
    await guiAutomationService.pressKeys(['control', 'n']);
    await guiAutomationService.sleep(1000);
    
    // 4. Type a simple Python Hello World
    console.log('Typing Python code...');
    const pythonCode = 'print("Hello, World!")\n';
    await guiAutomationService.typeText(pythonCode);
    await guiAutomationService.sleep(1000);
    
    // 5. Save the file (Ctrl+S)
    console.log('Saving file...');
    await guiAutomationService.pressKeys(['control', 's']);
    await guiAutomationService.sleep(1000);
    
    // 6. Type filename
    await guiAutomationService.typeText('hello_world.py');
    await guiAutomationService.sleep(500);
    await guiAutomationService.pressKey('enter');
    
    console.log('Test completed successfully!');
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    // Close OCR worker if needed
    if (visionService.close) {
      await visionService.close();
    }
  }
}

testVSCodeSimple();