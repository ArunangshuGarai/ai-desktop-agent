// src/services/simple-system.js
class SimpleSystemService {
    async executeCommand(command) {
      console.log(`Executing command: ${command}`);
      return { success: true, command };
    }
  }
  
  module.exports = new SimpleSystemService();