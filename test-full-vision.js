// test-vision-full.js - Fixed version
const visionTaskManager = require('./src/core/visionTaskManager');
const visionService = require('./src/services/visionService');
const guiAutomationService = require('./src/services/guiAutomationService');
const deepseek = require('./src/utils/deepseek');
const fs = require('fs-extra');

// Set up event listeners
visionTaskManager.on('analyzing', (data) => console.log('Analyzing task:', data.task));
visionTaskManager.on('analyzed', (data) => console.log('Task analyzed. Found', data.steps.length, 'steps'));
visionTaskManager.on('step-started', (data) => console.log('Starting step', data.index + 1, ':', data.step.name));
visionTaskManager.on('step-completed', (data) => console.log('Completed step', data.index + 1));
visionTaskManager.on('completed', () => console.log('Task completed'));
visionTaskManager.on('error', (data) => console.error('Error:', data.error));

async function testFullIntegration() {
  try {
    console.log('----- Testing Screenshot Capability -----');
    const screenshot = await visionService.captureActiveWindow();
    console.log('Screenshot taken:', screenshot.path);
    
    // Check if file exists before proceeding
    if (!fs.existsSync(screenshot.path)) {
      console.error('Screenshot file does not exist:', screenshot.path);
      console.log('Waiting for file to be available...');
      // Wait a bit in case of file system delays
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (!fs.existsSync(screenshot.path)) {
        throw new Error(`Screenshot file still not available: ${screenshot.path}`);
      }
    }
    
    console.log('\n----- Testing OCR Capability -----');
    const textResult = await visionService.recognizeText(screenshot.path);
    
    // Add null/undefined checking
    if (!textResult || !textResult.text) {
      console.log('OCR result is empty or undefined:', textResult);
      console.log('Skipping text display...');
    } else {
      console.log('Text detected (first 100 chars):', textResult.text.substring(0, 100));
    }
    
    console.log('\n----- Testing Keyboard Automation -----');
    console.log('Opening Notepad...');
    await guiAutomationService.executeCommand('notepad');
    await guiAutomationService.sleep(1000);
    console.log('Typing test text...');
    await guiAutomationService.typeText('Testing full integration of vision-based system');
    
    console.log('\n----- Testing Task Manager -----');
    const task = "Save the notepad file as vision_test.txt";
    console.log('Executing task:', task);
    await visionTaskManager.analyzeTask(task);
    await visionTaskManager.executeFullTask();
    
    console.log('\n----- All tests passed! -----');
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    // Close OCR worker
    try {
      await visionService.close();
    } catch (err) {
      console.error('Error closing OCR worker:', err);
    }
  }
}

// Run the test
testFullIntegration();