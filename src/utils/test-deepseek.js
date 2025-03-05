const deepseek = require('./deepseek');

async function testDeepseekAPI() {
  try {
    console.log('Testing DeepSeek API via OpenRouter...');
    
    const result = await deepseek.generateCompletion(
      "What is the meaning of life?"
    );
    
    console.log('\nAPI Response:');
    console.log(result);
    console.log('\nConnection successful!');
    
  } catch (error) {
    console.error('API test failed:');
    console.error(error);
  }
}

if (require.main === module) {
  testDeepseekAPI();
}

module.exports = { testDeepseekAPI };