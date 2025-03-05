// test-vision-notepad.js
const visionTaskManager = require('./src/core/visionTaskManager');

// Set up event listeners
visionTaskManager.on('analyzing', (data) => console.log('Analyzing task:', data.task));
visionTaskManager.on('analyzed', (data) => {
  console.log('Task analyzed. Found', data.steps.length, 'steps');
  console.log('Analysis:', data.analysis);
});
visionTaskManager.on('step-started', (data) => console.log('Starting step', data.index + 1, ':', data.step.name));
visionTaskManager.on('step-completed', (data) => console.log('Completed step', data.index + 1));
visionTaskManager.on('completed', () => console.log('Task completed'));
visionTaskManager.on('error', (data) => console.error('Error:', data.error));
visionTaskManager.on('screenshot-taken', (data) => console.log('Screenshot taken:', data.path));

async function testNotepadTask() {
  try {
    // Test with a simple notepad task
    const task = "Open Notepad and type 'Hello from Vision-Based AI Desktop Agent'";
    
    console.log('Testing vision task:', task);
    
    // Analyze the task
    await visionTaskManager.analyzeTask(task);
    
    // Execute all steps
    await visionTaskManager.executeFullTask();
    
    console.log('Test completed successfully');
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run the test
testNotepadTask();