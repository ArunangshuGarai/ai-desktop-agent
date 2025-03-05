// test-mouse.js
const mouseService = require('./src/services/mouseService');
const robot = require('robotjs');

async function testMouseService() {
  try {
    console.log('Testing mouse service...');
    
    // Get screen size
    const screenSize = robot.getScreenSize();
    console.log(`Screen size: ${screenSize.width}x${screenSize.height}`);
    
    // Move mouse to center of screen
    const centerX = Math.floor(screenSize.width / 2);
    const centerY = Math.floor(screenSize.height / 2);
    
    console.log(`Moving mouse to screen center (${centerX}, ${centerY})...`);
    await mouseService.moveTo(centerX, centerY);
    
    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Move mouse to another location
    console.log('Moving mouse to (100, 100)...');
    await mouseService.moveTo(100, 100);
    
    console.log('Test completed successfully!');
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testMouseService();