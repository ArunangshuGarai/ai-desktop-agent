const deepseek = require('./src/utils/deepseek');

async function testJsonGeneration() {
  try {
    console.log("Testing JSON generation...");
    
    const result = await deepseek.generateJSON(`
      Generate a simple JSON object with the following fields:
      - name: "Test project"
      - version: 1.0
      - features: a list of 3 features
    `);
    
    console.log("Successfully parsed JSON:");
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error("Test failed:", error);
  }
}

testJsonGeneration();