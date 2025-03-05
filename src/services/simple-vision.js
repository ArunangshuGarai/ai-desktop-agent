// src/services/simple-vision.js
class SimpleVisionService {
    async captureActiveWindow() {
      console.log('Taking screenshot');
      return { success: true, path: 'dummy-path.png' };
    }
  }
  
  module.exports = new SimpleVisionService();