// src/renderer/components/ResponsePanel.jsx
import React from 'react';
import '../styles/response-panel.css';

const ResponsePanel = ({ response, isLoading }) => {
  // If no response and not loading, don't render anything
  if (!response && !isLoading) {
    return null;
  }

  return (
    <div className="response-panel">
      <h3 className="response-title">AI Response</h3>
      
      {isLoading ? (
        <div className="loading-indicator">
          <p>Thinking...</p>
          <div className="spinner"></div>
        </div>
      ) : (
        <div className="response-content">
          {response.isAgentInfoResponse ? (
            // Format agent info responses nicely
            <div className="agent-info">
              <p>{response.analysis}</p>
            </div>
          ) : (
            // Format task analysis responses
            <div className="task-analysis">
              <h4>Analysis</h4>
              <p>{response.analysis}</p>
              
              {response.steps && response.steps.length > 0 && (
                <div className="steps-preview">
                  <h4>Planned Steps</h4>
                  <ol>
                    {response.steps.map((step, index) => (
                      <li key={index}>
                        {step.description}
                        <span className="step-action">({step.action})</span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ResponsePanel;