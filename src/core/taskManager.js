const EventEmitter = require('events');
const deepseek = require('../utils/deepseek');
const fileService = require('../services/fileService');
const systemService = require('../services/systemService');

class TaskManager extends EventEmitter {
  constructor() {
    super();
    this.currentTask = null;
    this.steps = [];
    this.currentStepIndex = -1;
    this.context = {};
  }

  /**
   * Analyze a task and break it down into steps
   */
  async analyzeTask(taskDescription) {
    try {
      this.emit('analyzing', { task: taskDescription });
      
      // Handle calculator tasks
      if (taskDescription.toLowerCase().includes('calculator') && 
          /\d+\s*[\+\-\*\/]\s*\d+/.test(taskDescription)) {
        
        // Extract the numbers and operation
        const match = taskDescription.match(/(\d+)\s*([\+\-\*\/])\s*(\d+)/);
        if (match) {
          const [_, num1, op, num2] = match;
          
          // Create a task plan directly for calculator
          const taskPlan = {
            "analysis": `This task requires launching the calculator and calculating ${num1} ${op} ${num2}.`,
            "steps": [
              {
                "id": 1,
                "name": "Launch Calculator",
                "description": "Open the calculator application",
                "type": "system",
                "actions": [
                  {
                    "action": "execute",
                    "params": {
                      "command": "calc.exe"
                    }
                  }
                ]
              },
              {
                "id": 2,
                "name": "Perform Calculation",
                "description": `Calculate ${num1} ${op} ${num2}`,
                "type": "code",
                "actions": [
                  {
                    "action": "automateCalculator",
                    "params": {
                      "num1": parseInt(num1),
                      "num2": parseInt(num2),
                      "operation": op
                    }
                  }
                ]
              }
            ],
            "challenges": ["GUI automation", "Window handling"]
          };
          
          this.currentTask = taskDescription;
          this.steps = taskPlan.steps;
          this.currentStepIndex = -1;
          this.context = {
            taskDescription,
            analysis: taskPlan.analysis,
            challenges: taskPlan.challenges
          };
          
          this.emit('analyzed', { 
            task: taskDescription,
            analysis: taskPlan.analysis,
            steps: taskPlan.steps,
            challenges: taskPlan.challenges
          });
          
          return taskPlan;
        }
      }
      
      // Handle web navigation tasks
      if (taskDescription.toLowerCase().includes('navigate') || 
          taskDescription.toLowerCase().includes('open') || 
          taskDescription.toLowerCase().includes('website')) {
        
        // Extract website name
        let websiteName = "";
        let url = "";
        let browserName = "chrome";
        
        // Look for specific websites
        if (taskDescription.toLowerCase().includes('bookmyshow')) {
          websiteName = "BookMyShow";
          url = "https://in.bookmyshow.com/";
        } else {
          // General pattern matching
          const websiteMatch = taskDescription.match(/(?:navigate|open)\s+(?:to)?\s+(?:the)?\s+([a-zA-Z0-9\s]+)(?:\s+(?:official)?)?\s+(?:website|site|page)/i);
          if (websiteMatch) {
            websiteName = websiteMatch[1].trim();
            // Make best guess at URL
            url = `https://www.${websiteName.toLowerCase().replace(/\s/g, '')}.com`;
          }
        }
        
        // Check if a specific browser is mentioned
        if (taskDescription.toLowerCase().includes('chrome')) {
          browserName = "chrome";
        } else if (taskDescription.toLowerCase().includes('edge')) {
          browserName = "msedge";
        } else if (taskDescription.toLowerCase().includes('firefox')) {
          browserName = "firefox";
        }
        
        if (websiteName) {
          // Create web navigation task plan
          const taskPlan = {
            "analysis": `This task requires opening ${browserName} and navigating to the ${websiteName} website.`,
            "steps": [
              {
                "id": 1,
                "name": "Launch Web Browser",
                "description": `Open ${browserName}`,
                "type": "system",
                "actions": [
                  {
                    "action": "execute",
                    "params": {
                      "command": `start ${browserName} ${url}`
                    }
                  }
                ]
              },
              {
                "id": 2,
                "name": "Verify Navigation",
                "description": `Verify navigation to ${websiteName} website`,
                "type": "code",
                "actions": [
                  {
                    "action": "verifyWebPage",
                    "params": {
                      "websiteName": websiteName
                    }
                  }
                ]
              }
            ],
            "challenges": ["Web navigation", "URL handling"]
          };
          
          this.currentTask = taskDescription;
          this.steps = taskPlan.steps;
          this.currentStepIndex = -1;
          this.context = {
            taskDescription,
            analysis: taskPlan.analysis,
            challenges: taskPlan.challenges,
            websiteName,
            url
          };
          
          this.emit('analyzed', { 
            task: taskDescription,
            analysis: taskPlan.analysis,
            steps: taskPlan.steps,
            challenges: taskPlan.challenges
          });
          
          return taskPlan;
        }
      }
      
      // If no specific handling, try the general API approach
      const prompt = `
        I need to break down the following desktop automation task into steps:
        "${taskDescription}"
        
        IMPORTANT: Your response must be ONLY valid JSON with no additional text.
        
        Format your response as JSON:
        {
          "analysis": "Brief analysis of the task",
          "steps": [
            {
              "id": 1,
              "name": "Step name",
              "description": "Detailed description",
              "type": "file|system|web|code",
              "actions": [
                {
                  "action": "specific action to take",
                  "params": { "param1": "value1" }
                }
              ]
            }
          ],
          "challenges": ["Challenge 1", "Challenge 2"]
        }
      `;
      
      try {
        // Try to use the API
        const taskPlan = await deepseek.generateJSON(prompt);
        
        this.currentTask = taskDescription;
        this.steps = taskPlan.steps;
        this.currentStepIndex = -1;
        this.context = {
          taskDescription,
          analysis: taskPlan.analysis,
          challenges: taskPlan.challenges
        };
        
        this.emit('analyzed', { 
          task: taskDescription,
          analysis: taskPlan.analysis,
          steps: taskPlan.steps,
          challenges: taskPlan.challenges
        });
        
        return taskPlan;
      } catch (error) {
        console.error('API error, using fallback task plan');
        
        // Create a generic fallback plan
        const fallbackPlan = {
          "analysis": `This task requires performing actions related to: ${taskDescription}`,
          "steps": [
            {
              "id": 1,
              "name": "Execute Task",
              "description": `Perform the requested action: ${taskDescription}`,
              "type": "system",
              "actions": [
                {
                  "action": "execute",
                  "params": {
                    "command": taskDescription.includes('website') ? 
                      `start chrome ${taskDescription.match(/\b(https?:\/\/[^\s]+)\b/) || 'https://www.google.com'}` : 
                      `powershell -Command "Write-Host 'Executing: ${taskDescription}'"`
                  }
                }
              ]
            }
          ],
          "challenges": ["Understanding task intent"]
        };
        
        this.currentTask = taskDescription;
        this.steps = fallbackPlan.steps;
        this.currentStepIndex = -1;
        this.context = {
          taskDescription,
          analysis: fallbackPlan.analysis,
          challenges: fallbackPlan.challenges
        };
        
        this.emit('analyzed', { 
          task: taskDescription,
          analysis: fallbackPlan.analysis,
          steps: fallbackPlan.steps,
          challenges: fallbackPlan.challenges
        });
        
        return fallbackPlan;
      }
    } catch (error) {
      console.error('Error analyzing task:', error);
      this.emit('error', { error: error.message });
      throw error;
    }
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
      // If no actions are defined, create a default action based on step type
      if (actions.length === 0) {
        console.log(`No actions defined for step ${step.name}, creating default action`);
        if (step.type === 'file' && step.name.toLowerCase().includes('create')) {
          actions.push({
            action: 'create',
            params: {
              path: 'hello.txt',
              content: 'Hello, World!'
            }
          });
        } else if (step.type === 'system' && step.name.toLowerCase().includes('list')) {
          actions.push({
            action: 'execute',
            params: {
              command: 'dir'
            }
          });
        }
      }
      
      for (const action of actions) {
        let result;
        
        // Based on step type, call appropriate service
        switch (step.type.toLowerCase()) {
          case 'file':
            result = await this.executeFileAction(action);
            break;
          case 'system':
            result = await this.executeSystemAction(action);
            break;
          case 'code':
            result = await this.executeCodeAction(action);
            break;
          case 'web':
            result = await this.executeWebAction(action);
            break;
          default:
            console.warn(`Unknown step type: ${step.type}, treating as system`);
            // Try to handle as system action as fallback
            result = await this.executeSystemAction(action);
        }
        
        // Check for specific result types and store them
        if (step.type === 'code' && action.action === 'automateCalculator') {
          if (result && result.success && result.result !== undefined) {
            // Store calculation result
            this.context.calculationResult = result.result;
            this.context.calculationOperation = result.operation;
            
            // Emit a special event for UI
            this.emit('calculation-result', {
              operation: result.operation,
              result: result.result,
              message: result.message
            });
          }
        }
        
        results.push(result);
        
        // Update context with result
        this.context[`step_${this.currentStepIndex}_result`] = result;
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
      console.error(`Error executing step ${this.currentStepIndex}:`, error);
      this.emit('step-error', { 
        step,
        index: this.currentStepIndex,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Execute a file-related action
   */
  /**
 * Execute a file-related action
 */
async executeFileAction(action) {
  switch (action.action) {
    case 'create':
      return await fileService.createFile(action.params.path, action.params.content);
    case 'create_file': // Add support for the underscored version
      return await fileService.createFile(
        action.params.filename || action.params.path, 
        action.params.content || ''
      );
    case 'read':
      return await fileService.readFile(action.params.path);
    case 'read_file': // Add support for the underscored version
      return await fileService.readFile(action.params.filename || action.params.path);
    case 'update':
      return await fileService.updateFile(action.params.path, action.params.content);
    case 'update_file': // Add support for the underscored version
      return await fileService.updateFile(
        action.params.filename || action.params.path, 
        action.params.content
      );
    case 'delete':
      return await fileService.deleteFile(action.params.path);
    case 'delete_file': // Add support for the underscored version
      return await fileService.deleteFile(action.params.filename || action.params.path);
    case 'list':
      return await fileService.listFiles(action.params.path);
    case 'list_files': // Add support for the underscored version
      return await fileService.listFiles(action.params.directory || action.params.path);
    case 'search':
      return await fileService.searchFiles(action.params.path, action.params.options);
    case 'save_file': // Add support for save_file action
      return await fileService.updateFile(
        action.params.filename || action.params.path,
        action.params.content
      );
    default:
      console.log(`Attempting to execute unknown file action: ${action.action}`);
      // Try to be more forgiving by checking action intent
      if (action.action.includes('create') || action.action.includes('save')) {
        console.log(`Falling back to generic file creation for: ${action.params.filename || action.params.path}`);
        return await fileService.createFile(
          action.params.filename || action.params.path,
          action.params.content || ''
        );
      }
      throw new Error(`Unsupported file action: ${action.action}`);
  }
}

  /**
   * Execute a system-related action
   */
  async executeSystemAction(action) {
    switch (action.action) {
      case 'simulate_input':
        return await systemService.simulateInput(action.params.input_sequence);
      case 'getInfo':
        return systemService.getSystemInfo();
      case 'execute':
        return await systemService.executeCommand(action.params.command);
      case 'execute_system_command': // This matches the error message
        return await systemService.executeCommand(action.params.command);
      // Also keep the version with spaces for safety
      case 'execute system command':
        return await systemService.executeCommand(action.params.command);
      case 'launch':
        return await systemService.launchApplication(action.params.path, action.params.args);
      case 'getProcesses':
        return await systemService.getRunningProcesses();
      default:
        console.log(`Attempting to execute unknown system action: ${action.action}`);
        // Try to be more forgiving by executing commands even if action names don't match exactly
        if (action.action.includes('execute') && action.params && action.params.command) {
          console.log(`Falling back to generic command execution for: ${action.params.command}`);
          return await systemService.executeCommand(action.params.command);
        }
        throw new Error(`Unsupported system action: ${action.action}`);
    }
  }

  /**
   * Execute a web-related action
   */
  async executeWebAction(action) {
    const webService = require('../services/webService');
    
    switch (action.action) {
      case 'startBrowser':
        return await webService.startBrowser();
      case 'navigate':
        return await webService.navigateToUrl(action.params.url);
      case 'interact':
        return await webService.interactWithElement(
          action.params.selector, 
          action.params.interaction, 
          action.params.value
        );
      case 'extract':
        return await webService.extractData(action.params.selector);
      case 'screenshot':
        return await webService.takeScreenshot(action.params.filename);
      case 'closeBrowser':
        return await webService.closeBrowser();
      default:
        throw new Error(`Unsupported web action: ${action.action}`);
    }
  }

  /**
   * Execute a code-related action
   */
  async executeCodeAction(action) {
    const codeService = require('../services/codeService');
    const guiAutomationService = require('../services/guiAutomationService');
    
    switch (action.action) {
      case 'verifyWebPage':
        const visionService = require('../services/visionService');
        return await visionService.verifyWebPage(action.params.websiteName);
      case 'generate':
        return await codeService.generateCode(
          action.params.prompt, 
          action.params.language
        );
      case 'execute':
        return await codeService.executeCode(
          action.params.filePath, 
          action.params.language, 
          action.params.args || []
        );
      case 'analyze':
        return await codeService.analyzeCode(
          action.params.code, 
          action.params.language
        );
      case 'modify':
        return await codeService.modifyCode(
          action.params.filePath, 
          action.params.instructions
        );
      case 'detectIDEs':
        return await codeService.detectIDEs();
      case 'automateCalculator':
        // Handle calculator automation directly
        if (action.params.num1 && action.params.num2 && action.params.operation) {
          return await guiAutomationService.automateCalculator(
            action.params.num1,
            action.params.num2,
            action.params.operation
          );
        }
        return { success: false, error: 'Missing calculator parameters' };
      default:
        // Try to be more forgiving by checking action intent
        if (action.action.includes('calculator') && action.params) {
          // Extract params from the action
          const { num1, num2, operation } = action.params;
          if (num1 && num2 && operation) {
            return await guiAutomationService.automateCalculator(num1, num2, operation);
          }
        }
        throw new Error(`Unsupported code action: ${action.action}`);
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
    
    // Verify and summarize task completion
    const taskSummary = this.verifyTaskCompletion();
    
    // Emit task summary
    this.emit('task-summary', taskSummary);
    
    return {
      success: true,
      task: this.currentTask,
      context: this.context,
      summary: taskSummary
    };
  }

  /**
   * Verify and create a summary of the completed task
   */
  verifyTaskCompletion() {
    const summary = {
      task: this.currentTask,
      steps: this.steps.length,
      stepsCompleted: this.currentStepIndex + 1,
      successful: this.currentStepIndex >= this.steps.length - 1,
      results: {}
    };
    
    // Check for specific results based on task type
    if (this.context.calculationResult !== undefined) {
      summary.results.calculation = {
        operation: this.context.calculationOperation,
        result: this.context.calculationResult
      };
      
      summary.message = `Task completed. The answer is ${this.context.calculationResult}.`;
    } 
    else if (this.context.webResults) {
      summary.results.web = this.context.webResults;
      summary.message = `Web task completed successfully.`;
    }
    else if (this.context.fileResults) {
      summary.results.files = this.context.fileResults;
      summary.message = `File operations completed successfully.`;
    } 
    else {
      summary.message = 'Task completed successfully.';
    }
    
    return summary;
  }

  /**
   * Get the current state of the task
   */
  getTaskState() {
    return {
      task: this.currentTask,
      currentStepIndex: this.currentStepIndex,
      totalSteps: this.steps.length,
      steps: this.steps,
      context: this.context
    };
  }
}

// Export a singleton instance
module.exports = new TaskManager();