const codeService = require('./src/services/codeService');

async function testCodeService() {
  try {
    console.log('Testing code generation...');
    
    // 1. Generate a simple Python script
    const pythonResult = await codeService.generateCode(
      'Create a script that calculates the factorial of a number and prints factorials from 1 to 5',
      'python'
    );
    
    console.log('Python code generated:', pythonResult.success);
    if (pythonResult.success) {
      console.log('Python file path:', pythonResult.filePath);
      console.log('Code sample:', pythonResult.code.substring(0, 150) + '...');
      
      // 2. Execute the Python script
      console.log('\nExecuting Python code...');
      const execResult = await codeService.executeCode(pythonResult.filePath, 'python');
      
      if (execResult.success) {
        console.log('Execution output:');
        console.log(execResult.stdout);
      } else {
        console.error('Execution failed:', execResult.error);
      }
      
      // 3. Analyze the code
      console.log('\nAnalyzing code...');
      const analysisResult = await codeService.analyzeCode(pythonResult.code, 'python');
      
      if (analysisResult.success) {
        console.log('Code analysis:');
        console.log(analysisResult.analysis);
      }
      
      // 4. Modify the code
      console.log('\nModifying code...');
      const modifyResult = await codeService.modifyCode(
        pythonResult.filePath,
        'Add a function to calculate fibonacci numbers and print the first 10 fibonacci numbers'
      );
      
      if (modifyResult.success) {
        console.log('Modified code saved to:', modifyResult.modifiedFilePath);
        console.log('Modified code sample:', modifyResult.modifiedCode.substring(0, 150) + '...');
        
        // 5. Execute the modified code
        console.log('\nExecuting modified code...');
        const modifiedExecResult = await codeService.executeCode(modifyResult.modifiedFilePath, 'python');
        
        if (modifiedExecResult.success) {
          console.log('Modified code output:');
          console.log(modifiedExecResult.stdout);
        }
      }
    }
    
    // 6. Detect running IDEs
    console.log('\nDetecting running IDEs...');
    const idesResult = await codeService.detectIDEs();
    
    if (idesResult.success) {
      console.log('Running IDEs:', idesResult.runningIDEs.length > 0 ? 
        idesResult.runningIDEs.join(', ') : 'None detected');
    }
    
    console.log('\nTest completed successfully!');
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run the test
testCodeService();