import React from 'react';
import styled from 'styled-components';

const PanelContainer = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
`;

const PanelHeader = styled.div`
  padding: 15px;
  background-color: #1a2533;
  border-bottom: 1px solid #34495e;
`;

const PanelTitle = styled.h2`
  margin: 0;
  font-size: 1.5rem;
`;

const PanelSubtitle = styled.p`
  margin: 5px 0 0 0;
  font-size: 0.9rem;
  opacity: 0.8;
`;

const AnalysisSection = styled.div`
  padding: 15px;
  background-color: #34495e;
  border-bottom: 1px solid #2c3e50;
`;

const AnalysisTitle = styled.h3`
  margin: 0 0 10px 0;
  font-size: 1rem;
`;

const AnalysisText = styled.p`
  margin: 0;
  font-size: 0.9rem;
  line-height: 1.4;
`;

const StepsSection = styled.div`
  padding: 15px;
  flex-grow: 1;
  overflow-y: auto;
`;

const StepsTitle = styled.h3`
  margin: 0 0 15px 0;
  font-size: 1rem;
`;

const StepsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const StepItem = styled.div`
  background-color: ${props => {
    if (props.status === 'active') return '#3498db';
    if (props.status === 'completed') return '#27ae60';
    return '#34495e';
  }};
  border-radius: 5px;
  padding: 12px;
  border-left: 4px solid ${props => {
    if (props.status === 'active') return '#2980b9';
    if (props.status === 'completed') return '#219653';
    return '#2c3e50';
  }};
`;

const StepHeader = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 8px;
`;

const StepNumber = styled.div`
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background-color: rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  margin-right: 10px;
`;

const StepName = styled.div`
  font-weight: bold;
  flex-grow: 1;
`;

const StepType = styled.div`
  font-size: 10px;
  background-color: rgba(255, 255, 255, 0.2);
  padding: 2px 6px;
  border-radius: 3px;
  text-transform: uppercase;
`;

const StepDescription = styled.div`
  font-size: 0.85rem;
  margin-left: 34px;
  margin-bottom: 10px;
`;

const ActionsContainer = styled.div`
  margin-left: 34px;
`;

const ActionItem = styled.div`
  font-size: 0.8rem;
  margin-bottom: 5px;
  padding: 5px;
  background-color: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 200px;
  opacity: 0.7;
  text-align: center;
`;

const TaskPanel = ({ task, steps = [], currentStep = -1, analysis = '' }) => {
  return (
    <PanelContainer>
      <PanelHeader>
        <PanelTitle>AI Desktop Agent</PanelTitle>
        <PanelSubtitle>
          {task ? 'Task in Progress' : 'Waiting for instructions...'}
        </PanelSubtitle>
      </PanelHeader>
      
      {task && analysis && (
        <AnalysisSection>
          <AnalysisTitle>Task Analysis</AnalysisTitle>
          <AnalysisText>{analysis}</AnalysisText>
        </AnalysisSection>
      )}
      
      {steps.length > 0 ? (
        <StepsSection>
          <StepsTitle>Steps ({currentStep + 1}/{steps.length})</StepsTitle>
          <StepsList>
            {steps.map((step, index) => {
              let status = 'pending';
              if (index === currentStep) status = 'active';
              if (index < currentStep) status = 'completed';
              
              return (
                <StepItem key={index} status={status}>
                  <StepHeader>
                    <StepNumber>{index + 1}</StepNumber>
                    <StepName>{step.name}</StepName>
                    <StepType>{step.type}</StepType>
                  </StepHeader>
                  <StepDescription>{step.description}</StepDescription>
                  
                  {step.actions && step.actions.length > 0 && (
                    <ActionsContainer>
                      {step.actions.map((action, actionIndex) => (
                        <ActionItem key={actionIndex}>
                          {action.action} {action.params && JSON.stringify(action.params).substring(0, 30)}
                          {action.params && JSON.stringify(action.params).length > 30 ? '...' : ''}
                        </ActionItem>
                      ))}
                    </ActionsContainer>
                  )}
                </StepItem>
              );
            })}
          </StepsList>
        </StepsSection>
      ) : task ? (
        <StepsSection>
          <EmptyState>
            <p>Analyzing task...</p>
            <p>Steps will appear here soon</p>
          </EmptyState>
        </StepsSection>
      ) : (
        <StepsSection>
          <EmptyState>
            <p>No active task</p>
            <p>Enter a command to get started</p>
          </EmptyState>
        </StepsSection>
      )}
    </PanelContainer>
  );
};

export default TaskPanel;