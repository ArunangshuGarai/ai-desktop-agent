import React, { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';
import { ipcRenderer } from 'electron';
import TaskPanel from './TaskPanel';

const Container = styled.div`
  display: flex;
  height: 100%;
  background-color: #f5f5f5;
`;

const TaskPanelContainer = styled.div`
  width: 300px;
  background-color: #2c3e50;
  color: white;
  overflow-y: auto;
`;

const MainArea = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 20px;
`;

const OutputArea = styled.div`
  flex: 1;
  background-color: white;
  border-radius: 5px;
  padding: 20px;
  overflow-y: auto;
  margin-bottom: 20px;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
  font-family: 'Consolas', monospace;
`;

const InputContainer = styled.div`
  display: flex;
  height: 50px;
  margin-bottom: 10px;
`;

const Input = styled.input`
  flex: 1;
  padding: 10px 15px;
  font-size: 16px;
  border: 2px solid #ddd;
  border-radius: 5px 0 0 5px;
  outline: none;
  
  &:focus {
    border-color: #3498db;
  }
`;

const ButtonGroup = styled.div`
  display: flex;
`;

const Button = styled.button`
  width: 100px;
  background-color: ${props => props.primary ? '#3498db' : '#6c757d'};
  color: white;
  border: none;
  border-radius: ${props => props.left ? '0 0 0 0' : props.right ? '0 5px 5px 0' : '0'};
  font-size: 16px;
  cursor: pointer;
  
  &:hover {
    background-color: ${props => props.primary ? '#2980b9' : '#5a6268'};
  }
  
  &:disabled {
    background-color: #95a5a6;
    cursor: not-allowed;
  }
`;

const OutputLine = styled.div`
  margin-bottom: 8px;
  white-space: pre-wrap;
  word-break: break-word;
  
  &.user {
    color: #2980b9;
    font-weight: bold;
  }
  
  &.system {
    color: #27ae60;
  }
  
  &.error {
    color: #e74c3c;
  }
  
  &.result {
    color: #9b59b6;
    font-weight: bold;
    font-size: 1.1em;
    padding: 5px;
    background-color: #f0f0f0;
    border-left: 3px solid #9b59b6;
  }

  &.ai-response {
    color: #2c3e50;
    background-color: #ecf0f1;
    padding: 10px;
    border-radius: 5px;
    border-left: 3px solid #3498db;
    margin: 10px 0;
  }
`;

const StatusBar = styled.div`
  padding: 8px 15px;
  background-color: #34495e;
  color: white;
  font-size: 12px;
  border-radius: 0 0 5px 5px;
  display: flex;
  justify-content: space-between;
  margin-top: 10px;
`;

const App = () => {
  const [command, setCommand] = useState('');
  const [output, setOutput] = useState([
    { id: 1, type: 'system', text: 'AI Desktop Agent initialized. How can I help you?' }
  ]);
  const [taskState, setTaskState] = useState({
    task: null,
    steps: [],
    currentStepIndex: -1,
    analysis: ''
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [isQuerying, setIsQuerying] = useState(false);
  
  // Reference for auto-scrolling
  const outputEndRef = useRef(null);
  
  // Auto-scroll to bottom when output changes
  useEffect(() => {
    if (outputEndRef.current) {
      outputEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [output]);
  
  useEffect(() => {
    // Set up IPC listeners for calculation results and task summary
    ipcRenderer.on('task-calculation-result', (_, data) => {
      // Only add the result message once
      setOutput(prev => [
        ...prev.filter(item => !item.text.includes(data.result)), // Filter out any duplicate results
        { 
          id: Date.now(), 
          type: 'result', 
          text: `Result: ${data.operation} = ${data.result}`
        }
      ]);
    });

    ipcRenderer.on('task-task-summary', (_, data) => {
      // Only add the summary message once
      if (data.results && data.results.calculation) {
        setOutput(prev => [
          ...prev.filter(item => !item.text.includes(`The answer is: ${data.results.calculation.result}`)),
          { 
            id: Date.now(), 
            type: 'system', 
            text: data.message
          }
        ]);
      } else {
        setOutput(prev => [
          ...prev,
          { 
            id: Date.now(), 
            type: 'system', 
            text: data.message || 'Task completed.'
          }
        ]);
      }
      
      setIsProcessing(false);
      setIsQuerying(false);
    });

    // Handle task-analyzed specifically for AI responses
    ipcRenderer.on('task-analyzed', (_, data) => {
      if (data.isAgentInfoResponse) {
        // This is a direct question about the agent itself
        setOutput(prev => [
          ...prev,
          {
            id: Date.now(),
            type: 'ai-response',
            text: data.analysis
          }
        ]);
      } else {
        // This is a task analysis
        setTaskState(prev => ({
          ...prev,
          task: data.task,
          steps: data.steps || [],
          analysis: data.analysis || ''
        }));
        
        setOutput(prev => [
          ...prev,
          {
            id: Date.now(),
            type: 'ai-response',
            text: data.analysis
          }
        ]);
      }
      
      // If this was just a query (not execution), we can stop processing
      if (isQuerying && !isProcessing) {
        setIsQuerying(false);
      }
    });

    // Set up IPC listeners for standard task events
const events = [
  'analyzing', 'step-started', 'step-completed',
  'step-error', 'completed', 'error'
];
    
events.forEach(event => {
  ipcRenderer.on(`task-${event}`, (_, data) => {
    // Add to output
    let outputMessage;
    switch (event) {
      case 'analyzing':
        outputMessage = `Analyzing task: ${data.task}`;
        break;
      // Remove the 'analyzed' case since we're handling it specially through 'task-analyzed'
      case 'step-started':
        outputMessage = `Starting step ${data.index + 1}/${data.total || data.steps?.length || '?'}: ${data.step.description || data.step.name || 'Unknown step'}`;
        setTaskState(prev => ({ ...prev, currentStepIndex: data.index }));
        break;
      case 'step-completed':
        outputMessage = `Completed step ${data.index + 1}: ${data.step.description || data.step.name || 'Unknown step'}`;
        break;
      case 'step-error':
        outputMessage = `Error in step ${data.index + 1}: ${data.error}`;
        break;
      case 'completed':
        outputMessage = 'Task completed successfully.';
        setIsProcessing(false);
        setIsQuerying(false);
        break;
      case 'error':
        outputMessage = `Error: ${data.error}`;
        setIsProcessing(false);
        setIsQuerying(false);
        break;
      default:
        outputMessage = `Event: ${event} - ${JSON.stringify(data)}`;
    }
    
    setOutput(prev => [
      ...prev,
      { 
        id: Date.now(), 
        type: event.includes('error') ? 'error' : 'system', 
        text: outputMessage 
      }
    ]);
  });
});
    
    // Clean up listeners on unmount
    return () => {
      events.forEach(event => {
        ipcRenderer.removeAllListeners(`task-${event}`);
      });
      ipcRenderer.removeAllListeners('task-calculation-result');
      ipcRenderer.removeAllListeners('task-task-summary');
      ipcRenderer.removeAllListeners('task-analyzed');
    };
  }, [isProcessing, isQuerying]);
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!command.trim() || isProcessing || isQuerying) return;
    
    // Add user command to output
    setOutput(prev => [
      ...prev,
      { id: Date.now(), type: 'user', text: command }
    ]);
    
    setIsProcessing(true);
    
    try {
      // Execute task
      await ipcRenderer.invoke('execute-full-task', { task: command });
      
      // Clear input
      setCommand('');
    } catch (error) {
      setOutput(prev => [
        ...prev,
        { id: Date.now(), type: 'error', text: `Error: ${error.message}` }
      ]);
      setIsProcessing(false);
      setIsQuerying(false);
    }
  };
  
  const handleJustAsk = async () => {
    if (!command.trim() || isProcessing || isQuerying) return;
    
    // Add user command to output
    setOutput(prev => [
      ...prev,
      { id: Date.now(), type: 'user', text: command }
    ]);
    
    setIsQuerying(true);
    
    try {
      // Just analyze the task without executing
      await ipcRenderer.invoke('analyze-task', { task: command });
      
      // Clear input
      setCommand('');
    } catch (error) {
      setOutput(prev => [
        ...prev,
        { id: Date.now(), type: 'error', text: `Error: ${error.message}` }
      ]);
      setIsQuerying(false);
    }
  };
  
  return (
    <Container>
      <TaskPanelContainer>
        <TaskPanel 
          task={taskState.task}
          steps={taskState.steps} 
          currentStep={taskState.currentStepIndex}
          analysis={taskState.analysis}
        />
      </TaskPanelContainer>
      <MainArea>
        <OutputArea>
          {output.map(item => (
            <OutputLine key={item.id} className={item.type}>
              {item.text}
            </OutputLine>
          ))}
          <div ref={outputEndRef} />
        </OutputArea>
        <form onSubmit={handleSubmit}>
          <InputContainer>
            <Input
              type="text"
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              placeholder="Enter a question or task..."
              disabled={isProcessing || isQuerying}
            />
            <ButtonGroup>
              <Button 
                type="button" 
                onClick={handleJustAsk} 
                disabled={isProcessing || isQuerying || !command.trim()}
                left
              >
                Just Ask
              </Button>
              <Button 
                type="submit" 
                primary 
                disabled={isProcessing || isQuerying || !command.trim()}
                right
              >
                Execute
              </Button>
            </ButtonGroup>
          </InputContainer>
        </form>
        <StatusBar>
          <div>Status: {isProcessing ? 'Executing task...' : isQuerying ? 'Processing question...' : 'Ready'}</div>
          <div>AI Desktop Agent v1.0</div>
        </StatusBar>
      </MainArea>
    </Container>
  );
};

export default App;