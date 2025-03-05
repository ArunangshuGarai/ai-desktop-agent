const visionService = require('./src/services/visionService');
const guiAutomationService = require('./src/services/guiAutomationService');

async function testVisionBasics() {
  try {
    console.log('Testing vision-based functionality...');
    
    // 1. Take a screenshot
    console.log('Taking screenshot...');
    const screenshot = await visionService.captureActiveWindow();
    
    if (screenshot.success) {
      console.log(`Screenshot saved to: ${screenshot.path}`);
      
      // 2. Recognize text in the screenshot
      console.log('Recognizing text...');
      const textResult = await visionService.recognizeText(screenshot.path);
      
      if (textResult.success) {
        console.log('Text recognized (first 500 chars):');
        console.log(textResult.text.substring(0, 500));
      }
    }
    
    // 3. Test opening Notepad
    console.log('Opening Notepad...');
    const notepadResult = await guiAutomationService.findAndActivateWindow('Notepad');
    
    if (notepadResult.success) {
      console.log('Notepad activated, typing test text...');
      await guiAutomationService.typeText('Hello from AI Desktop Agent!\nThis is a vision-based test.');
      
      // Press Ctrl+S to save
      console.log('Pressing Ctrl+S to save...');
      await guiAutomationService.pressKeys(['control', 's']);
      
      console.log('Test completed successfully!');
    }
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    // Close OCR worker
    await visionService.close();
  }
}

testVisionBasics();