// test-service-methods.js
const guiAutomationService = require('./src/services/guiAutomationService');
const systemService = require('./src/services/systemService');
const visionService = require('./src/services/visionService');

// Log available methods for debugging
console.log("guiAutomationService methods:", Object.keys(guiAutomationService));
console.log("systemService methods:", Object.keys(systemService));
console.log("visionService methods:", Object.keys(visionService));