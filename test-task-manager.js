const taskManager = require('./src/core/taskManager');

// Set up event listeners
taskManager.on('analyzing', (data) => console.log('Analyzing task:', data.task));
taskManager.on('analyzed', (data) => {
  console.log('Task analyzed. Found', data.steps.length, 'steps');
  console.log('Analysis:', data.analysis);
  console.log('Steps:', data.steps.map(s => s.name).join(', '));
});
taskManager.on('step-started', (data) => console.log('Starting step', data.index + 1, ':', data.step.name));
taskManager.on('step-completed', (data) => console.log('Completed step', data.index + 1));
taskManager.on('completed', () => console.log('Task completed'));
taskManager.on('error', (data) => console.error('Error:', data.error));

// Test function
async function testTaskManager() {
  try {
    // Test with a simple file-related task
    const task = "Create a text file named 'hello.txt' with the content 'Hello, World!' in the current directory, then list all files in the directory";
    
    console.log('Testing task:', task);
    
    // Analyze the task
    await taskManager.analyzeTask(task);
    
    // Execute all steps
    await taskManager.executeFullTask();
    
    console.log('Test completed successfully');
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run the test
testTaskManager();