const fs = require('fs-extra');
const path = require('path');
const { exec, spawn } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
const deepseek = require('../utils/deepseek');
const fileService = require('./fileService');

class CodeService {
  constructor() {
    this.codeDirectory = path.join(process.cwd(), 'generated_code');
    this.supportedLanguages = {
      'javascript': { extension: '.js', runner: 'node' },
      'python': { extension: '.py', runner: 'python' },
      'html': { extension: '.html', runner: null },
      'css': { extension: '.css', runner: null },
      'batch': { extension: '.bat', runner: 'cmd /c' },
      'powershell': { extension: '.ps1', runner: 'powershell -ExecutionPolicy Bypass -File' }
    };
    
    // Ensure code directory exists
    fs.ensureDirSync(this.codeDirectory);
  }

  // Add this method to your CodeService class
async generateAutomationCode(task, target) {
    try {
      console.log(`Generating automation code for: ${task}`);
      
      // For calculator tasks, use a specialized prompt
      if (task.toLowerCase().includes('calculator')) {
        // Extract numbers from the task
        const numberPattern = /(\d+)\s*(\+|\-|\*|\/)\s*(\d+)/;
        const match = task.match(numberPattern);
        
        let promptContent = '';
        
        if (match) {
          const [_, num1, operation, num2] = match;
          promptContent = `
            Generate a Python script using PyAutoGUI to automate this calculator task:
            1. Find and focus the calculator window
            2. Clear any previous calculations
            3. Type the number ${num1}
            4. Press the ${operation} key
            5. Type the number ${num2}
            6. Press Enter to get the result
            
            The script should be able to run and complete the entire calculation.
          `;
        } else {
          promptContent = `
            Generate a Python script using PyAutoGUI to automate this calculator task: "${task}"
            The script should be able to find the calculator window, interact with it, and perform the calculation.
          `;
        }
        
        const code = await this.generateCode(promptContent, 'python');
        return code;
      }
      
      // More general automation
      const prompt = `
        Create automation code for the following task: "${task}"
        Target: ${target}
        
        Use the appropriate library based on the task:
        - For GUI automation: Use PyAutoGUI
        - For web automation: Use Playwright or Selenium
        - For system automation: Use appropriate system commands
        
        Make sure the code is executable and includes all necessary error handling.
      `;
      
      return await this.generateCode(prompt, 'python');
    } catch (error) {
      console.error('Error generating automation code:', error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Helper function to strip markdown code blocks
   */
  stripMarkdownCodeBlocks(code) {
    // Remove markdown code block delimiters if present
    let cleanCode = code;
    
    // Check for markdown code blocks (```language ... ```)
    const codeBlockRegex = /^```[\w]*\n([\s\S]*?)```$/;
    const match = code.match(codeBlockRegex);
    
    if (match && match[1]) {
      cleanCode = match[1];
    }
    
    // Remove any remaining ``` markers at start/end
    cleanCode = cleanCode.replace(/^```[\w]*\n/, '').replace(/\n```$/, '');
    
    return cleanCode.trim();
  }

  /**
   * Generate code based on a prompt
   */
  async generateCode(prompt, language, options = {}) {
    try {
      if (!this.supportedLanguages[language.toLowerCase()]) {
        return { 
          success: false, 
          error: `Unsupported language: ${language}. Supported languages: ${Object.keys(this.supportedLanguages).join(', ')}` 
        };
      }
      
      console.log(`Generating ${language} code for prompt: ${prompt.substring(0, 100)}...`);
      
      const langInfo = this.supportedLanguages[language.toLowerCase()];
      const jsonPrompt = `
        Write ${language} code for the following request:
        "${prompt}"
        
        IMPORTANT: Provide ONLY the raw executable code. 
        Do NOT include markdown formatting, triple backticks, or language specifiers.
        Your response must be valid executable ${language} code only that can be directly run.
      `;
      
      const code = await deepseek.generateCompletion(jsonPrompt, {
        temperature: 0.2  // Lower temperature for more predictable code
      });
      
      // Clean the code before saving
      const cleanCode = this.stripMarkdownCodeBlocks(code);
      
      // Create a unique filename
      const timestamp = Date.now();
      const filename = `${language.toLowerCase()}_${timestamp}${langInfo.extension}`;
      const filePath = path.join(this.codeDirectory, filename);
      
      // Save the code to a file
      await fs.writeFile(filePath, cleanCode);
      
      return {
        success: true,
        language,
        code: cleanCode,
        filename,
        filePath
      };
    } catch (error) {
      console.error('Error generating code:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Execute generated code
   */
  async executeCode(filePath, language, args = []) {
    try {
      if (!fs.existsSync(filePath)) {
        return { success: false, error: `File not found: ${filePath}` };
      }
      
      // Determine language from file extension if not provided
      if (!language) {
        const ext = path.extname(filePath).toLowerCase();
        language = Object.keys(this.supportedLanguages).find(
          lang => this.supportedLanguages[lang].extension === ext
        );
        
        if (!language) {
          return { success: false, error: `Could not determine language for file: ${filePath}` };
        }
      }
      
      language = language.toLowerCase();
      const langInfo = this.supportedLanguages[language];
      
      if (!langInfo.runner) {
        return { 
          success: false, 
          error: `Execution not supported for ${language} files. Files can be viewed but not executed directly.` 
        };
      }
      
      console.log(`Executing ${language} code from: ${filePath}`);
      
      // Execute the code
      const command = `${langInfo.runner} "${filePath}" ${args.join(' ')}`;
      console.log(`Running command: ${command}`);
      
      const { stdout, stderr } = await execPromise(command);
      
      return {
        success: true,
        language,
        filePath,
        stdout,
        stderr
      };
    } catch (error) {
      console.error('Error executing code:', error);
      return { 
        success: false, 
        error: error.message,
        stderr: error.stderr,
        stdout: error.stdout
      };
    }
  }

  /**
   * Analyze and explain code
   */
  async analyzeCode(code, language) {
    try {
      console.log(`Analyzing ${language} code...`);
      
      // Make sure there's code to analyze
      if (!code || code.trim().length === 0) {
        return {
          success: false, 
          error: "No code provided for analysis"
        };
      }
      
      // Clean the code just in case it has markdown
      const cleanCode = this.stripMarkdownCodeBlocks(code);
      
      const prompt = `
        Analyze this ${language} code and provide a brief explanation of what it does, 
        any potential issues, and suggestions for improvement:
        
        ${cleanCode}
        
        Format your analysis as:
        1. Purpose: [Brief description of what the code does]
        2. Key components: [Main functions/classes/features]
        3. Potential issues: [Any bugs, edge cases, or security concerns]
        4. Improvement suggestions: [Ways to make the code better]
      `;
      
      const analysis = await deepseek.generateCompletion(prompt);
      
      return {
        success: true,
        language,
        analysis
      };
    } catch (error) {
      console.error('Error analyzing code:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Modify existing code based on instructions
   */
  async modifyCode(filePath, instructions) {
    try {
      if (!fs.existsSync(filePath)) {
        return { success: false, error: `File not found: ${filePath}` };
      }
      
      // Read the original code
      const originalCode = await fs.readFile(filePath, 'utf8');
      const ext = path.extname(filePath).toLowerCase();
      const language = Object.keys(this.supportedLanguages).find(
        lang => this.supportedLanguages[lang].extension === ext
      );
      
      console.log(`Modifying ${language} code based on instructions: ${instructions}`);
      
      const prompt = `
        Here is the original ${language} code:
        ${originalCode}
        
        Modify this code according to these instructions:
        "${instructions}"
        
        IMPORTANT: Provide ONLY the raw executable code. 
        Do NOT include markdown formatting, triple backticks, or language specifiers.
        Your response must be valid executable ${language} code only that can be directly run.
      `;
      
      const modifiedCode = await deepseek.generateCompletion(prompt, {
        temperature: 0.2
      });
      
      // Clean the code before saving
      const cleanModifiedCode = this.stripMarkdownCodeBlocks(modifiedCode);
      
      // Create a new file for the modified code
      const dir = path.dirname(filePath);
      const baseName = path.basename(filePath, ext);
      const newFilePath = path.join(dir, `${baseName}_modified${ext}`);
      
      // Save the modified code
      await fs.writeFile(newFilePath, cleanModifiedCode);
      
      return {
        success: true,
        language,
        originalFilePath: filePath,
        modifiedFilePath: newFilePath,
        modifiedCode: cleanModifiedCode
      };
    } catch (error) {
      console.error('Error modifying code:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Detect and list running IDEs
   */
  async detectIDEs() {
    try {
      const ideProcessNames = [
        { name: 'Visual Studio Code', process: 'Code.exe' },
        { name: 'Visual Studio', process: 'devenv.exe' },
        { name: 'PyCharm', process: 'pycharm64.exe' },
        { name: 'IntelliJ IDEA', process: 'idea64.exe' },
        { name: 'Eclipse', process: 'eclipse.exe' },
        { name: 'Sublime Text', process: 'sublime_text.exe' },
        { name: 'Atom', process: 'atom.exe' }
      ];
      
      // Get list of running processes
      const { stdout } = await execPromise('tasklist /fo csv /nh');
      const runningIDEs = [];
      
      for (const ide of ideProcessNames) {
        if (stdout.includes(ide.process)) {
          runningIDEs.push(ide.name);
        }
      }
      
      return {
        success: true,
        runningIDEs
      };
    } catch (error) {
      console.error('Error detecting IDEs:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new CodeService();