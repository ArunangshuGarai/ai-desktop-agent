// test-dependencies.js
console.log('Checking dependencies...');

try {
  const fs = require('fs-extra');
  console.log('fs-extra loaded successfully');
} catch (error) {
  console.error('fs-extra error:', error.message);
}

try {
  const path = require('path');
  console.log('path loaded successfully');
} catch (error) {
  console.error('path error:', error.message);
}

try {
  const keySender = require('node-key-sender');
  console.log('node-key-sender loaded successfully');
} catch (error) {
  console.error('node-key-sender error:', error.message);
}

try {
  // Only try to import tesseract.js if it's installed
  console.log('Will try to import tesseract.js...');
  const { createWorker } = require('tesseract.js');
  console.log('tesseract.js loaded successfully');
} catch (error) {
  console.error('tesseract.js error:', error.message);
}

console.log('Dependency check complete');