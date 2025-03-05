const { exec, spawn } = require('child_process');
const os = require('os');
const util = require('util');
const execPromise = util.promisify(exec);

class SystemService {
  /**
   * Get system information
   */
  getSystemInfo() {
    return {
      platform: os.platform(),
      release: os.release(),
      hostname: os.hostname(),
      architecture: os.arch(),
      cpus: os.cpus(),
      totalMemory: os.totalmem(),
      freeMemory: os.freemem(),
      uptime: os.uptime(),
      userInfo: os.userInfo(),
      networkInterfaces: os.networkInterfaces()
    };
  }

  /**
   * Execute a command and return the output
   */
  // In src/services/systemService.js
async executeCommand(command) {
    try {
      console.log(`Executing system command: ${command}`);
      
      // Handle specific commands with customized approaches
      if (command === 'calc.exe' || command.includes('calculator')) {
        // Special handling for calculator
        if (process.platform === 'win32') {
          return await this.launchApplication('calc');
        } else if (process.platform === 'darwin') {
          return await execPromise('open -a Calculator');
        } else {
          return await execPromise('gnome-calculator');
        }
      }
      
      // For general commands
      const { stdout, stderr } = await execPromise(command);
      
      return {
        success: true,
        stdout,
        stderr
      };
    } catch (error) {
      console.error('Error executing command:', error);
      return {
        success: false,
        error: error.message,
        stderr: error.stderr,
        stdout: error.stdout
      };
    }
  }
  
  async launchApplication(appPath, args = []) {
    try {
      console.log(`Launching application: ${appPath}`);
      
      // Handle special cases
      if (appPath === 'calc' || appPath === 'calculator') {
        if (process.platform === 'win32') {
          const child = spawn('calc.exe', [], {
            detached: true,
            stdio: 'ignore',
            windowsHide: false
          });
          
          child.unref();
          return {
            success: true,
            message: "Calculator launched",
            pid: child.pid
          };
        }
      }
      
      // Generic app launch
      const child = spawn(appPath, args || [], {
        detached: true,
        stdio: 'ignore',
        windowsHide: false,
        shell: process.platform === 'win32' // Use shell for Windows
      });
      
      child.unref();
      
      return {
        success: true,
        pid: child.pid
      };
    } catch (error) {
      console.error('Error launching application:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
 * Simulate user input for command-line applications
 */
async simulateInput(inputSequence) {
  try {
    console.log(`Simulating input: ${inputSequence}`);
    
    // Use a delay to ensure the application is ready for input
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Split the input sequence on newlines
    const inputs = inputSequence.split('\n');
    
    // Simulate typing each input with Enter after each
    for (const input of inputs) {
      // Use robotjs or key-sender to type the input
      const guiAutomationService = require('./guiAutomationService');
      await guiAutomationService.typeText(input);
      await guiAutomationService.pressKey('return');
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    return { success: true, inputSequence };
  } catch (error) {
    console.error('Error simulating input:', error);
    return { success: false, error: error.message };
  }
}
  /**
   * Get list of running processes
   */
  async getRunningProcesses() {
    try {
      let command;
      if (os.platform() === 'win32') {
        command = 'tasklist /fo csv /nh';
      } else {
        command = 'ps -e -o pid,comm,pcpu,pmem';
      }
      
      const { stdout } = await execPromise(command);
      
      let processes;
      if (os.platform() === 'win32') {
        // Parse CSV output from tasklist
        processes = stdout.split('\r\n')
          .filter(line => line.trim().length > 0)
          .map(line => {
            const parts = line.split('","');
            const processName = parts[0].replace('"', '');
            const pid = parseInt(parts[1].replace('"', ''));
            const memoryUsage = parts[4].replace('"', '').replace(' K', '');
            
            return {
              name: processName,
              pid,
              memoryUsage
            };
          });
      } else {
        // Parse output from ps command
        processes = stdout.split('\n')
          .filter(line => line.trim().length > 0)
          .slice(1) // Remove header
          .map(line => {
            const parts = line.trim().split(/\s+/);
            return {
              pid: parseInt(parts[0]),
              name: parts[1],
              cpuUsage: parseFloat(parts[2]),
              memoryUsage: parseFloat(parts[3])
            };
          });
      }
      
      return {
        success: true,
        processes
      };
    } catch (error) {
      console.error('Error getting running processes:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = new SystemService();