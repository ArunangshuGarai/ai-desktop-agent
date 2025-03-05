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

async function testComplexTask() {
  try {
    // Test with a complex task that combines multiple services
    const task = "Create a Python script that fetches today's weather for London, saves it to a file called 'london_weather.txt', and then opens the file in Notepad";
    
    console.log('Testing complex task:', task);
    
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
testComplexTask();