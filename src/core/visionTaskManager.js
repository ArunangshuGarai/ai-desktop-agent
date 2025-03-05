// src/core/visionTaskManager.js
const EventEmitter = require('events');
const deepseek = require('../utils/deepseek');
const visionService = require('../services/visionService');
const guiAutomationService = require('../services/guiAutomationService');
const path = require('path');
const fs = require('fs-extra');

class VisionTaskManager extends EventEmitter {
  constructor() {
    super();
    this.currentTask = null;
    this.steps = [];
    this.currentStepIndex = -1;
    this.context = {};
    this.screenshotsDir = path.join(process.cwd(), 'screenshots');
    fs.ensureDirSync(this.screenshotsDir);
  }

  /**
   * Analyze a task and break it down into vision-based steps
   */
  async analyzeTask(taskDescription) {
    try {
      this.emit('analyzing', { task: taskDescription });
      
      // For VS Code binary search task, use predefined steps
      if ((taskDescription.toLowerCase().includes('vscode') || 
           taskDescription.toLowerCase().includes('vs code')) && 
          taskDescription.toLowerCase().includes('binary search')) {
        return this.createVsCodeBinarySearchPlan(taskDescription);
      }
      
      // For any VS Code task
      if (taskDescription.toLowerCase().includes('vscode') || 
          taskDescription.toLowerCase().includes('vs code')) {
        return this.createVsCodeBinarySearchPlan(taskDescription);
      }
      
      // For simple notepad tasks
      if (taskDescription.toLowerCase().includes('notepad')) {
        return this.createNotepadPlan(taskDescription);
      }
      
      // Use DeepSeek API for general tasks
      const prompt = `
        I need to break down this desktop automation task into vision-based steps:
        "${taskDescription}"
        
        Provide a clear plan with:
        1. Brief analysis of what the task involves
        2. Detailed step-by-step instructions 
        3. For each step, include what to look for visually and what actions to take
        
        Return as JSON with no markdown.
      `;
      
      try {
        const taskPlan = await deepseek.generateJSON(prompt);
        
        this.currentTask = taskDescription;
        this.steps = taskPlan.steps || [];
        this.currentStepIndex = -1;
        this.context = {
          taskDescription,
          analysis: taskPlan.analysis || "Task analysis"
        };
        
        this.emit('analyzed', { 
          task: taskDescription,
          analysis: taskPlan.analysis || "Task analyzed",
          steps: this.steps
        });
        
        return taskPlan;
      } catch (error) {
        console.error('Error getting task plan:', error);
        return this.createFallbackPlan(taskDescription);
      }
    } catch (error) {
      console.error('Error in analyzeTask:', error);
      this.emit('error', { error: error.message });
      throw error;
    }
  }

  /**
   * Create a plan for VS Code binary search task
   */
  createVsCodeBinarySearchPlan(taskDescription) {
    const plan = {
      analysis: "This task involves opening VS Code, creating a Python file for binary search, writing code, and executing it.",
      steps: [
        {
          id: 1,
          name: "Open VS Code",
          description: "Launch VS Code application",
          type: "system",
          actions: [
            {
              type: "system",  // Explicitly set type
              action: "executeCommand",
              params: { command: "code" }
            }
          ]
        },
        {
          id: 2,
          name: "Create New File",
          description: "Create a new file using keyboard shortcut",
          type: "input",
          actions: [
            {
              type: "input",  // Explicitly set type
              action: "pressKeys",
              params: { keys: ["control", "n"] }
            }
          ]
        },
        {
          id: 3,
          name: "Save File As",
          description: "Save the file as binary_search.py",
          type: "input",
          actions: [
            {
              type: "input",  // Explicitly set type
              action: "pressKeys",
              params: { keys: ["control", "s"] }
            },
            {
              type: "input",  // Explicitly set type
              action: "typeText",
              params: { text: "binary_search.py" }
            },
            {
              type: "input",  // Explicitly set type
              action: "pressKey",
              params: { key: "enter" }
            }
          ]
        },
        {
          id: 4,
          name: "Write Binary Search Code",
          description: "Write Python code implementing binary search with test case",
          type: "input",
          actions: [
            {
              type: "api",  // Explicitly set type
              action: "generatePythonCode",
              params: { task: "Implement binary search algorithm in Python with a test case searching for number 4 in a sorted array [1,2,3,4,5,6,7,8,9,10]" }
            },
            {
              type: "input",  // Explicitly set type
              action: "typeText",
              params: { text: "{{generatedCode}}" }
            }
          ]
        },
        {
          id: 5,
          name: "Save and Run Code",
          description: "Save the file and run it in terminal",
          type: "input",
          actions: [
            {
              type: "input",  // Explicitly set type
              action: "pressKeys",
              params: { keys: ["control", "s"] }
            },
            {
              type: "input",  // Explicitly set type
              action: "pressKeys",
              params: { keys: ["control", "`"] }
            },
            {
              type: "input",  // Explicitly set type
              action: "typeText",
              params: { text: "python binary_search.py\n" }
            }
          ]
        }
      ]
    };
    
    // Same as before...
    this.currentTask = taskDescription;
    this.steps = plan.steps;
    this.currentStepIndex = -1;
    this.context = {
      taskDescription,
      analysis: plan.analysis
    };
    
    this.emit('analyzed', { 
      task: taskDescription,
      analysis: plan.analysis,
      steps: plan.steps
    });
    
    return plan;
  }

  /**
   * Create a plan for notepad task
   */
  createNotepadPlan(taskDescription) {
    // Extract text to type from task description
    const textMatch = taskDescription.match(/type ['"](.+?)['"]/i) || 
                     taskDescription.match(/type (.+?)( and | then |$)/i);
    const textToType = textMatch ? textMatch[1] : "Hello from Vision-Based Agent";
    
    const plan = {
      analysis: `This task involves opening Notepad and typing text: "${textToType}"`,
      steps: [
        {
          id: 1,
          name: "Open Notepad",
          description: "Launch Notepad application",
          type: "system",
          actions: [
            {
              type: "system",
              action: "executeCommand",
              params: { command: "notepad" }
            }
          ]
        },
        {
          id: 2,
          name: "Type Text",
          description: `Type the text: "${textToType}"`,
          type: "input",
          actions: [
            {
              type: "input",
              action: "typeText",
              params: { text: textToType }
            }
          ]
        }
      ]
    };
    
    // Add save file step if mentioned in task
    if (taskDescription.toLowerCase().includes("save")) {
      const filenameMatch = taskDescription.match(/save as ['"](.+?)['"]/i) || 
                           taskDescription.match(/save as (.+?)( and | then |$)/i);
      const filename = filenameMatch ? filenameMatch[1] : "note.txt";
      
      plan.steps.push({
        id: 3,
        name: "Save File",
        description: `Save file as "${filename}"`,
        type: "input",
        actions: [
          {
            type: "input",
            action: "pressKeys",
            params: { keys: ["control", "s"] }
          },
          {
            type: "input",
            action: "typeText",
            params: { text: filename }
          },
          {
            type: "input",
            action: "pressKey",
            params: { key: "enter" }
          }
        ]
      });
    }
    
    this.currentTask = taskDescription;
    this.steps = plan.steps;
    this.currentStepIndex = -1;
    this.context = {
      taskDescription,
      analysis: plan.analysis
    };
    
    this.emit('analyzed', { 
      task: taskDescription,
      analysis: plan.analysis,
      steps: plan.steps
    });
    
    return plan;
  }

  /**
   * Create a fallback plan for when API fails
   */
  createFallbackPlan(taskDescription) {
    const plan = {
      analysis: `Executing task: "${taskDescription}"`,
      steps: [
        {
          id: 1,
          name: "Take Initial Screenshot",
          description: "Capture current screen state",
          type: "vision",
          actions: [
            {
              type: "vision",
              action: "captureActiveWindow",
              params: {}
            }
          ]
        },
        {
          id: 2,
          name: "Execute Command",
          description: `Execute the command from task description`,
          type: "system",
          actions: [
            {
              type: "system",
              action: "executeCommand",
              params: { command: this.extractCommand(taskDescription) }
            }
          ]
        }
      ]
    };
    
    this.currentTask = taskDescription;
    this.steps = plan.steps;
    this.currentStepIndex = -1;
    this.context = {
      taskDescription,
      analysis: plan.analysis
    };
    
    this.emit('analyzed', { 
      task: taskDescription,
      analysis: plan.analysis,
      steps: plan.steps
    });
    
    return plan;
  }

  /**
   * Extract a command from task description
   */
  extractCommand(taskDescription) {
    if (taskDescription.toLowerCase().includes("open vscode") || 
        taskDescription.toLowerCase().includes("open vs code")) {
      return "code";
    }
    
    if (taskDescription.toLowerCase().includes("open notepad")) {
      return "notepad";
    }
    
    // Default to explorer
    return "explorer";
  }

  /**
   * Execute the next step in the task
   */
  async executeNextStep() {
    if (!this.steps || this.steps.length === 0) {
      throw new Error('No task has been analyzed yet');
    }
    
    if (this.currentStepIndex >= this.steps.length - 1) {
      this.emit('completed', { task: this.currentTask });
      return { completed: true };
    }
    
    this.currentStepIndex++;
    const step = this.steps[this.currentStepIndex];
    
    this.emit('step-started', { 
      step, 
      index: this.currentStepIndex,
      total: this.steps.length
    });
    
    try {
      // Execute each action in the step
      const results = [];
      
      const actions = step.actions || [];
      if (actions.length === 0) {
        console.warn(`No actions defined for step: ${step.name}`);
      }
      
      for (const action of actions) {
        // Replace template variables with context values
        this.resolveActionParams(action);
        
        // Add default type if missing
        if (!action.type) {
          // Try to infer type from action
          if (action.action === 'executeCommand') {
            action.type = 'system';
          } else if (action.action === 'typeText' || action.action === 'pressKey' || action.action === 'pressKeys') {
            action.type = 'input';
          } else if (action.action === 'captureActiveWindow' || action.action === 'analyzeScreenContent') {
            action.type = 'vision';
          } else if (action.action === 'generatePythonCode') {
            action.type = 'api';
          } else {
            console.warn(`Unknown action: ${action.action}, defaulting to system type`);
            action.type = 'system';
          }
        }
        
        let result;
        
        // Execute action based on type
        switch (action.type) {
          case 'vision':
            result = await this.executeVisionAction(action);
            break;
          case 'system':
            result = await this.executeSystemAction(action);
            break;
          case 'input':
            result = await this.executeInputAction(action);
            break;
          case 'api':
            result = await this.executeApiAction(action);
            break;
          default:
            console.warn(`Unknown action type: ${action.type}`);
            continue;
        }
        
        // Store result in context
        const resultKey = `${action.type}_${action.action}_result`;
        this.context[resultKey] = result;
        
        results.push(result);
      }
      
      // Take screenshot after step completion
      const screenshotPath = path.join(
        this.screenshotsDir, 
        `step_${this.currentStepIndex + 1}_${Date.now()}.png`
      );
      
      const screenshot = await visionService.captureActiveWindow(screenshotPath);
      if (screenshot.success) {
        this.emit('screenshot-taken', { path: screenshot.path, step: this.currentStepIndex + 1 });
      }
      
      this.emit('step-completed', { 
        step,
        index: this.currentStepIndex,
        results
      });
      
      return { 
        completed: false,
        step,
        results
      };
    } catch (error) {
      console.error(`Error executing step ${this.currentStepIndex + 1}:`, error);
      this.emit('step-error', { 
        step,
        index: this.currentStepIndex,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Resolve template parameters in action params
   */
  resolveActionParams(action) {
    if (!action.params) return;
    
    Object.keys(action.params).forEach(key => {
      const value = action.params[key];
      if (typeof value === 'string' && value.includes('{{') && value.includes('}}')) {
        const matches = value.match(/\{\{(.+?)\}\}/g);
        
        if (matches) {
          let resolvedValue = value;
          
          matches.forEach(match => {
            const varName = match.replace(/\{\{|\}\}/g, '').trim();
            if (this.context[varName] !== undefined) {
              resolvedValue = resolvedValue.replace(match, this.context[varName]);
            }
          });
          
          action.params[key] = resolvedValue;
        }
      }
    });
  }

  /**
   * Execute a vision-related action
   */
  async executeVisionAction(action) {
    switch (action.action) {
      case 'captureActiveWindow':
        return await visionService.captureActiveWindow();
        
      case 'analyzeScreenContent':
        return await visionService.analyzeScreenContent(action.params.elementsToLookFor || []);
        
      case 'waitForVisualElement':
        return await visionService.waitForVisualElement(
          action.params.visualCues || [], 
          action.params.timeout || 10000
        );
        
      case 'recognizeTextInRegion':
        return await visionService.recognizeTextInRegion(
          action.params.regionName || 'screen',
          action.params.expectedText || ''
        );
        
      default:
        throw new Error(`Unsupported vision action: ${action.action}`);
    }
  }

  /**
   * Execute a system-related action
   */
  async executeSystemAction(action) {
    switch (action.action) {
      case 'executeCommand':
        return await guiAutomationService.executeCommand(action.params.command || '');
        
      default:
        throw new Error(`Unsupported system action: ${action.action}`);
    }
  }

  /**
   * Execute an input-related action
   */
  async executeInputAction(action) {
    switch (action.action) {
      case 'typeText':
        return await guiAutomationService.typeText(action.params.text || '');
        
      case 'pressKey':
        return await guiAutomationService.pressKey(action.params.key || '');
        
      case 'pressKeys':
        return await guiAutomationService.pressKeys(action.params.keys || []);
        
      default:
        throw new Error(`Unsupported input action: ${action.action}`);
    }
  }

  // Enhancement for visionTaskManager.js
// Enhancement for visionTaskManager.js
async requestUserGuidance(state, task) {
  console.log("I'm not sure how to proceed. There are multiple possibilities:");
  
  state.possibleActions.forEach((action, index) => {
    console.log(`${index + 1}. ${action.description} (confidence: ${action.confidence})`);
  });
  
  console.log("Which action would you like me to take? (Enter the number)");
  
  // In a real application, you'd implement actual user input here
  // For now, simulate with a timeout and default choice
  return new Promise(resolve => {
    setTimeout(() => {
      // Default to first option if no input
      resolve(state.possibleActions[0]);
    }, 10000);
  });
}

  // Enhancement for visionTaskManager.js
async executeAdaptiveTask(task) {
  let completed = false;
  let attempts = 0;
  let lastScreenshot = null;
  
  while (!completed && attempts < 10) {
    // Take screenshot and analyze current state
    const screenshot = await visionService.captureActiveWindow();
    const currentState = await visionService.analyzeScreenWithAI(task);
    
    // Check if we're making progress
    const isNewState = this.isDifferentState(screenshot, lastScreenshot);
    lastScreenshot = screenshot;
    
    if (!isNewState && attempts > 3) {
      // We're stuck, ask user for guidance
      const guidance = await this.requestUserGuidance(currentState, task);
      await this.executeActionFromGuidance(guidance);
    } else {
      // Execute next recommended action
      const nextAction = currentState.recommendedAction;
      await this.executeAction(nextAction);
    }
    
    // Check if task is complete
    completed = currentState.taskCompleted;
    attempts++;
  }
}

  /**
   * Execute an API-related action
   */
  async executeApiAction(action) {
    switch (action.action) {
      case 'generatePythonCode':
        const code = await deepseek.generatePythonCode(action.params.task || '');
        this.context.generatedCode = code; // Store for template substitution
        return { success: true, code };
        
      default:
        throw new Error(`Unsupported API action: ${action.action}`);
    }
  }

  /**
   * Execute all steps in the current task
   */
  async executeFullTask() {
    let result;
    do {
      result = await this.executeNextStep();
    } while (!result.completed);
    
    const taskSummary = this.createTaskSummary();
    this.emit('task-summary', taskSummary);
    
    return {
      success: true,
      task: this.currentTask,
      summary: taskSummary
    };
  }

  /**
   * Create a summary of the completed task
   */
  createTaskSummary() {
    return {
      task: this.currentTask,
      stepsCompleted: this.currentStepIndex + 1,
      totalSteps: this.steps.length,
      successful: this.currentStepIndex >= this.steps.length - 1,
      message: `Task "${this.currentTask}" completed successfully.`,
      screenshots: Object.keys(this.context)
        .filter(key => key.includes('screenshot') && this.context[key] && this.context[key].path)
        .map(key => this.context[key].path)
    };
  }

  /**
   * Get the current state of the task
   */
  getTaskState() {
    return {
      task: this.currentTask,
      currentStepIndex: this.currentStepIndex,
      totalSteps: this.steps.length,
      steps: this.steps
    };
  }
}

module.exports = new VisionTaskManager();