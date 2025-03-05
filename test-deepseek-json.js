// test-deepseek-json.js
const deepseek = require('./src/utils/deepseek');

async function testJSONHandling() {
  try {
    console.log('Testing enhanced JSON handling...');
    
    // Test with a simple request
    const result = await deepseek.generateJSON(`
      Generate a JSON object with the following:
      - name: "Test Project"
      - version: 1.0
      - features: A list of 3 features
      - status: "active"
    `);
    
    console.log('Successfully parsed JSON:');
    console.log(JSON.stringify(result, null, 2));
    
    // Test with a more complex request
    console.log('\nTesting with a complex request...');
    const taskPlan = await deepseek.generateJSON(`
      Break down this task into steps:
      "Open VS Code and create a Hello World program in Python"
      
      Include a detailed analysis and steps to execute.
    `);
    
    console.log('Task plan:');
    console.log(JSON.stringify(taskPlan, null, 2));
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testJSONHandling();