// src/core/visionTaskManager.js
const EventEmitter = require('events');
const path = require('path');
const fs = require('fs');
const DeepseekClient = require('../utils/deepseek');
const VisionService = require('../services/visionService');
const SystemService = require('../services/systemService');

// Get API key from environment
const apiKey = process.env.API_KEY || '';
const apiEndpoint = process.env.API_ENDPOINT || 'https://api.deepseek.com/v1/chat/completions';

/**
 * VisionTaskManager handles the analysis and execution of vision-based tasks
 * Implements EventEmitter for event-based communication
 */
class VisionTaskManager extends EventEmitter {
  constructor() {
    super(); // Initialize EventEmitter
    
    // Get API key and configuration from environment
    const apiKey = process.env.API_KEY || '';
    const apiEndpoint = process.env.API_ENDPOINT || 'https://openrouter.ai/api/v1/chat/completions';
    const apiModel = process.env.API_MODEL || 'deepseek/deepseek-r1:free';
    
    console.log(`API configuration: Endpoint=${apiEndpoint}, Model=${apiModel}`);
    console.log(`API Key present: ${apiKey ? 'Yes' : 'No'}`);
    
    // Initialize services
    this.visionService = new VisionService();
    this.systemService = new SystemService();
    this.apiClient = new DeepseekClient(apiKey, apiEndpoint, apiModel);
    
    // Task state
    this.currentTask = null;
    this.taskSteps = [];
    this.currentStepIndex = -1;
    this.taskState = 'idle';
    
    // Ensure screenshot folder exists
    this.screenshotFolder = path.join(process.cwd(), process.env.SCREENSHOT_DIR || 'screenshots');
    this.ensureScreenshotFolder();
    
    console.log('VisionTaskManager initialized with event emitter functionality');
  }

  /**
   * Ensure the screenshot directory exists
   */
  ensureScreenshotFolder() {
    if (!fs.existsSync(this.screenshotFolder)) {
      fs.mkdirSync(this.screenshotFolder, { recursive: true });
    }
  }

  /**
   * Analyze a task and break it down into steps
   * @param {string} task - The task description to analyze
   * @returns {Object} - The analysis result
   */
  async analyzeTask(task) {
    try {
      this.taskState = 'analyzing';
      this.emit('analyzing', { task });
      
      console.log(`Analyzing task: ${task}`);
      
      // Reset task state
      this.currentTask = task;
      this.taskSteps = [];
      this.currentStepIndex = -1;
      
      // Generate analysis using Deepseek API
      const result = await this.apiClient.generateJSON(task);
      
      if (!result) {
        throw new Error('Failed to analyze task: Empty response');
      }
      
      // Store the task steps for execution
      if (result.steps && Array.isArray(result.steps)) {
        this.taskSteps = result.steps;
        console.log(`Task analyzed with ${this.taskSteps.length} steps`);
      } else {
        console.log('Task analyzed but no steps were defined');
        this.taskSteps = [];
      }
      
      this.taskState = 'analyzed';
      
      // IMPORTANT: Comment out or remove this line to prevent duplicate events
      // The main.js IPC handlers will handle sending the task-analyzed event
      // this.emit('analyzed', { analysis: result.analysis, steps: this.taskSteps });
      
      return result;
    } catch (error) {
      this.taskState = 'error';
      this.emit('error', { error: error.message });
      throw error;
    }
  }

  /**
   * Execute the next step in the current task
   * @returns {Object} - Result of the step execution
   */
  async executeNextStep() {
    try {
      if (this.taskSteps.length === 0) {
        throw new Error('No steps to execute');
      }
      
      if (this.currentStepIndex >= this.taskSteps.length - 1) {
        throw new Error('All steps already executed');
      }
      
      this.currentStepIndex++;
      const step = this.taskSteps[this.currentStepIndex];
      
      this.taskState = 'executing';
      this.emit('step-started', { 
        step, 
        index: this.currentStepIndex,
        total: this.taskSteps.length 
      });
      
      console.log(`Executing step ${this.currentStepIndex + 1}/${this.taskSteps.length}: ${step.description || 'No description'}`);
      
      // Execute the step based on its action type
      const result = await this.executeStep(step);
      
      this.emit('step-completed', { 
        step, 
        result,
        index: this.currentStepIndex,
        total: this.taskSteps.length 
      });
      
      // If this was the last step, mark task as completed
      if (this.currentStepIndex === this.taskSteps.length - 1) {
        this.taskState = 'completed';
        this.emit('completed', { 
          task: this.currentTask,
          stepsCompleted: this.currentStepIndex + 1 
        });
      }
      
      return { success: true, step, result };
    } catch (error) {
      this.emit('step-error', { 
        error: error.message,
        index: this.currentStepIndex 
      });
      
      throw error;
    }
  }

  /**
   * Execute a full task from start to finish
   * @returns {Object} - Result of the full task execution
   */
  async executeFullTask() {
    try {
      if (!this.currentTask || this.taskSteps.length === 0) {
        throw new Error('No task has been analyzed');
      }
      
      const results = [];
      
      // Reset to start from the beginning
      this.currentStepIndex = -1;
      
      // Execute all steps sequentially
      while (this.currentStepIndex < this.taskSteps.length - 1) {
        const stepResult = await this.executeNextStep();
        results.push(stepResult);
      }
      
      const summary = {
        task: this.currentTask,
        stepsCompleted: this.currentStepIndex + 1,
        totalSteps: this.taskSteps.length,
        success: true
      };
      
      this.emit('task-summary', summary);
      
      return summary;
    } catch (error) {
      const errorSummary = {
        task: this.currentTask,
        stepsCompleted: this.currentStepIndex + 1,
        totalSteps: this.taskSteps.length,
        success: false,
        error: error.message
      };
      
      this.emit('task-summary', errorSummary);
      
      throw error;
    }
  }

  /**
   * Execute a single step
   * @param {Object} step - The step to execute
   * @returns {Object} - Result of the step execution
   */
  async executeStep(step) {
    if (!step || !step.action) {
      console.warn("Cannot execute undefined action");
      return { success: false, message: 'Undefined action' };
    }
    
    switch (step.action.toLowerCase()) {
      case 'click':
        if (step.target) {
          console.log(`Clicking on: ${JSON.stringify(step.target)}`);
          // Implement actual click logic here using your robotjs or other mechanism
          // For example: await this.systemService.mouseClick(step.target.x, step.target.y);
          return { success: true, action: 'click', target: step.target };
        } else {
          console.warn("Click action missing target coordinates");
          return { success: false, message: 'Missing target coordinates' };
        }
        
      case 'type':
        if (step.text) {
          console.log(`Typing text: ${step.text}`);
          // Implement actual typing logic here
          // For example: await this.systemService.typeText(step.text);
          return { success: true, action: 'type', text: step.text };
        } else {
          console.warn("Type action missing text content");
          return { success: false, message: 'Missing text content' };
        }
        
      case 'screenshot':
        const screenshotName = step.name || `action_screenshot_${Date.now()}`;
        const screenshotPath = await this.takeScreenshot(screenshotName);
        this.emit('screenshot-taken', { path: screenshotPath });
        return { 
          success: true, 
          action: 'screenshot', 
          path: screenshotPath 
        };
        
      case 'wait':
        const waitTime = step.time || 1000; // Default to 1 second
        console.log(`Waiting for ${waitTime}ms`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        return { success: true, action: 'wait', time: waitTime };
        
      case 'scroll':
        const direction = step.direction || 'down';
        const amount = step.amount || 300;
        console.log(`Scrolling ${direction} by ${amount} pixels`);
        // Implement scrolling logic here
        // For example: await this.systemService.scroll(direction, amount);
        return { 
          success: true, 
          action: 'scroll', 
          direction,
          amount 
        };
        
      case 'press':
        if (step.key) {
          console.log(`Pressing key: ${step.key}`);
          // Implement key press logic here
          // For example: await this.systemService.pressKey(step.key);
          return { success: true, action: 'press', key: step.key };
        } else {
          console.warn("Press action missing key specification");
          return { success: false, message: 'Missing key specification' };
        }
        
      default:
        console.log(`Unknown action: ${step.action}`);
        return { 
          success: false, 
          action: step.action,
          message: 'Unknown action type' 
        };
    }
  }

  /**
   * Take a screenshot and save it to the screenshots folder
   * @param {string} name - Base name for the screenshot file
   * @returns {string|null} - Path to the saved screenshot or null if failed
   */
  async takeScreenshot(name) {
    try {
      const screenshotPath = path.join(this.screenshotFolder, `${name}.png`);
      const result = await this.visionService.takeScreenshot(screenshotPath);
      console.log(`Screenshot saved to: ${screenshotPath}`);
      return screenshotPath;
    } catch (error) {
      console.error("Error taking screenshot:", error);
      return null;
    }
  }

  /**
   * Get the current state of the task execution
   * @returns {Object} - Current task state information
   */
  getTaskState() {
    return {
      state: this.taskState,
      currentTask: this.currentTask,
      totalSteps: this.taskSteps.length,
      currentStep: this.currentStepIndex + 1,
      steps: this.taskSteps
    };
  }
}

// Create a singleton instance
const visionTaskManager = new VisionTaskManager();

// Export the singleton
module.exports = visionTaskManager;