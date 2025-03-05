// test-service-inspector.js
const fs = require('fs');
const path = require('path');

// Get paths to service files
const systemServicePath = path.join(__dirname, 'src', 'services', 'systemService.js');
const visionServicePath = path.join(__dirname, 'src', 'services', 'visionService.js');
const guiAutomationServicePath = path.join(__dirname, 'src', 'services', 'guiAutomationService.js');

// Read and analyze service files
function analyzeService(servicePath, serviceName) {
  console.log(`\nAnalyzing ${serviceName}...`);
  
  try {
    const content = fs.readFileSync(servicePath, 'utf8');
    
    // Check if file exists and has content
    console.log(`File exists: ${fs.existsSync(servicePath)}`);
    console.log(`File size: ${content.length} bytes`);
    
    // Check for class definition
    const hasClass = content.includes('class');
    console.log(`Has class definition: ${hasClass}`);
    
    // Check for common method patterns
    const methodMatches = content.match(/(?:async\s+)?(\w+)\s*\([^)]*\)\s*{/g) || [];
    console.log(`Found method definitions: ${methodMatches.length}`);
    if (methodMatches.length > 0) {
      console.log("Methods found:");
      methodMatches.forEach(method => {
        // Extract method name
        const methodName = method.match(/(?:async\s+)?(\w+)/)[1];
        console.log(`  - ${methodName}`);
      });
    }
    
    // Check export pattern
    const exportPattern = content.includes('module.exports = new') ? 'Instance' : 
                         content.includes('module.exports =') ? 'Other' : 'None';
    console.log(`Export pattern: ${exportPattern}`);
    
  } catch (error) {
    console.error(`Error analyzing ${serviceName}:`, error.message);
  }
}

// Analyze all services
analyzeService(systemServicePath, 'systemService');
analyzeService(visionServicePath, 'visionService');
analyzeService(guiAutomationServicePath, 'guiAutomationService');