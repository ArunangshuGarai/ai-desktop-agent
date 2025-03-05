// test-all-vision.js
const { spawn } = require('child_process');

const tests = [
  'test-vision-notepad.js',
  'test-vision-vscode.js',
  'test-vision-full.js'
];

async function runTests() {
  console.log('Running all vision-based system tests...\n');
  
  for (const test of tests) {
    console.log(`\n======== Running ${test} ========\n`);
    
    await new Promise((resolve) => {
      const process = spawn('node', [test], { stdio: 'inherit' });
      
      process.on('close', (code) => {
        console.log(`\n${test} completed with code ${code}`);
        resolve();
      });
    });
    
    // Pause between tests to let things settle
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  console.log('\nAll tests completed!');
}

runTests();