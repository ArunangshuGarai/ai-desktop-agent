// test-simple-services.js
const simpleSystem = require('./src/services/simple-system');
const simpleVision = require('./src/services/simple-vision');

async function testSimpleServices() {
  try {
    console.log("Testing simplified services...");
    
    // Test system service
    console.log("System service methods:", Object.keys(simpleSystem));
    const cmdResult = await simpleSystem.executeCommand('test');
    console.log("Execute command result:", cmdResult);
    
    // Test vision service
    console.log("Vision service methods:", Object.keys(simpleVision));
    const screenshotResult = await simpleVision.captureActiveWindow();
    console.log("Screenshot result:", screenshotResult);
    
    console.log("Simple tests passed!");
  } catch (error) {
    console.error("Test failed:", error);
  }
}

testSimpleServices();