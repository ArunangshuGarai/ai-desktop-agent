// test-gui-no-deps.js
const guiAutomationService = require('./src/services/guiAutomationService');
const visionService = require('./src/services/visionService');
const systemService = require('./src/services/systemService'); // Add this import

async function testGuiAutomation() {
  try {
    // Open Notepad for testing - use systemService instead
    console.log('Opening Notepad...');
    await systemService.executeCommand('notepad'); // This method exists in your codebase
    
    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Type some text
    console.log('Typing text...');
    await guiAutomationService.typeText('Hello from AI Desktop Agent\r\nTesting vision-based automation!');
    
    // Take a screenshot
    console.log('Taking screenshot...');
    const screenshot = await visionService.captureActiveWindow();
    console.log(`Screenshot saved to: ${screenshot.path}`);
    
    console.log('Test completed successfully!');
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testGuiAutomation();