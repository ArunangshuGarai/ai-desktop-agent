// test-paths.js
console.log('Testing path handling...');

const path = require('path');
const fs = require('fs');

const currentDir = process.cwd();
console.log('Current directory:', currentDir);

const files = fs.readdirSync(currentDir);
console.log('Files in current directory:', files);

const srcDir = path.join(currentDir, 'src');
console.log('src directory path:', srcDir);

if (fs.existsSync(srcDir)) {
  console.log('src directory exists');
  const srcFiles = fs.readdirSync(srcDir);
  console.log('Files in src directory:', srcFiles);
} else {
  console.error('src directory does not exist');
}

console.log('Path test complete');