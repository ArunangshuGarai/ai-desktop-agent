const deepseek = require('../utils/deepseek');

class AIService {
  async analyzeTask(task) {
    try {
      const prompt = `
        I need to break down the following task into a step-by-step plan:
        "${task}"
        
        Please provide:
        1. A brief analysis of what this task involves
        2. A list of steps needed to accomplish this task
        3. Any potential challenges or considerations
        
        Format the response as JSON with the following structure:
        {
          "analysis": "brief analysis here",
          "steps": [
            {"name": "Step 1", "description": "Details about step 1", "type": "file/code/web/system"},
            {"name": "Step 2", "description": "Details about step 2", "type": "file/code/web/system"}
          ],
          "challenges": ["Challenge 1", "Challenge 2"]
        }
      `;
      
      const response = await deepseek.generateCompletion(prompt);
      return JSON.parse(response);
    } catch (error) {
      console.error('Error analyzing task:', error);
      return null;
    }
  }
  
  // Other methods following the same pattern...
}

module.exports = new AIService();