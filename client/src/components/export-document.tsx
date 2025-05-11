import React from 'react';
import llamaLogo from '@/assets/llama-logo.svg';
import { ChatAnalysisResult } from '@shared/schema';
import { formatDate } from '@/lib/date-utils';

// CSS styles for the formal document
const documentStyles = `
  .drama-llama-document {
    font-family: 'Inter', sans-serif;
    max-width: 800px;
    margin: 0 auto;
    padding: 20px;
    background-color: white;
    color: #333;
  }
  
  .document-header {
    display: flex;
    align-items: center;
    margin-bottom: 30px;
    padding-bottom: 20px;
    border-bottom: 2px solid #22C9C9;
  }
  
  .logo-container {
    width: 80px;
    margin-right: 20px;
  }
  
  .logo-container img {
    width: 100%;
    height: auto;
  }
  
  .header-text {
    flex: 1;
  }
  
  .header-text h1 {
    margin: 0;
    font-size: 28px;
    font-weight: 700;
    color: #22C9C9;
  }
  
  .header-text p {
    margin: 5px 0 0;
    font-size: 16px;
    color: #666;
  }
  
  .document-title {
    font-size: 24px;
    font-weight: 600;
    margin-bottom: 20px;
    color: #333;
  }
  
  .document-section {
    margin-bottom: 25px;
  }
  
  .section-title {
    font-size: 20px;
    font-weight: 600;
    margin-bottom: 15px;
    color: #22C9C9;
  }
  
  .section-content {
    font-size: 16px;
    line-height: 1.6;
  }
  
  .emotion-item {
    display: flex;
    align-items: center;
    margin-bottom: 10px;
  }
  
  .emotion-label {
    min-width: 120px;
    font-weight: 500;
  }
  
  .emotion-bar-container {
    flex: 1;
    height: 12px;
    background-color: #eee;
    border-radius: 6px;
    overflow: hidden;
  }
  
  .emotion-bar {
    height: 100%;
    background-color: #22C9C9;
  }
  
  .health-score {
    display: flex;
    align-items: center;
    margin: 15px 0;
    padding: 15px;
    background-color: #f9f9f9;
    border-radius: 8px;
  }
  
  .health-score-label {
    font-weight: 600;
    margin-right: 15px;
  }
  
  .health-score-value {
    font-size: 18px;
    font-weight: 700;
  }
  
  .red-flags-count {
    font-weight: 600;
    color: #e53e3e;
  }
  
  .pattern-list {
    margin: 0;
    padding-left: 20px;
  }
  
  .pattern-item {
    margin-bottom: 8px;
  }
  
  .document-footer {
    margin-top: 40px;
    padding-top: 20px;
    border-top: 1px solid #ddd;
    font-size: 14px;
    color: #666;
    text-align: center;
  }
  
  .color-red {
    color: #e53e3e;
  }
  
  .color-yellow {
    color: #d69e2e;
  }
  
  .color-light-green {
    color: #38a169;
  }
  
  .color-green {
    color: #2f855a;
  }
  
  .participants {
    display: flex;
    justify-content: space-between;
    margin-bottom: 20px;
  }
  
  .participant {
    flex: 1;
    padding: 15px;
    border-radius: 8px;
    text-align: center;
  }
  
  .participant-me {
    background-color: rgba(34, 201, 201, 0.1);
    margin-right: 10px;
  }
  
  .participant-them {
    background-color: rgba(255, 105, 180, 0.1);
    margin-left: 10px;
  }
  
  .participant-name {
    font-weight: 600;
    font-size: 18px;
    margin-bottom: 5px;
  }
  
  .participant-tone {
    color: #666;
  }
  
  /* Mobile styles */
  @media (max-width: 640px) {
    .document-header {
      flex-direction: column;
      text-align: center;
    }
    
    .logo-container {
      margin: 0 auto 15px;
    }
    
    .participants {
      flex-direction: column;
    }
    
    .participant-me, .participant-them {
      margin: 0 0 10px 0;
    }
  }
`;

interface ExportDocumentProps {
  result: ChatAnalysisResult;
  me: string;
  them: string;
}

const ExportDocument: React.FC<ExportDocumentProps> = ({ result, me, them }) => {
  const { toneAnalysis, communication, healthScore, redFlagsCount } = result;
  
  return (
    <div className="drama-llama-document">
      <style>{documentStyles}</style>
      
      <div className="document-header">
        <div className="logo-container">
          <img src={llamaLogo} alt="Drama Llama Logo" />
        </div>
        <div className="header-text">
          <h1>Drama Llama AI</h1>
          <p>Conversation Analysis Report</p>
          <p>Generated on: {formatDate(new Date())}</p>
        </div>
      </div>
      
      <div className="document-title">
        Chat Analysis Results
      </div>
      
      <div className="participants">
        <div className="participant participant-me">
          <div className="participant-name">{me}</div>
          {toneAnalysis.participantTones && (
            <div className="participant-tone">{toneAnalysis.participantTones[me]}</div>
          )}
        </div>
        <div className="participant participant-them">
          <div className="participant-name">{them}</div>
          {toneAnalysis.participantTones && (
            <div className="participant-tone">{toneAnalysis.participantTones[them]}</div>
          )}
        </div>
      </div>
      
      <div className="document-section">
        <div className="section-title">Overall Tone</div>
        <div className="section-content">
          {toneAnalysis.overallTone}
        </div>
      </div>
      
      {healthScore && (
        <div className="document-section">
          <div className="section-title">Conversation Health</div>
          <div className="health-score">
            <div className="health-score-label">Health Score:</div>
            <div className={`health-score-value color-${healthScore.color}`}>
              {healthScore.label} ({healthScore.score}/10)
            </div>
          </div>
        </div>
      )}
      
      {toneAnalysis.emotionalState && toneAnalysis.emotionalState.length > 0 && (
        <div className="document-section">
          <div className="section-title">Emotional States</div>
          <div className="section-content">
            {toneAnalysis.emotionalState.map((emotion, index) => (
              <div key={index} className="emotion-item">
                <div className="emotion-label">{emotion.emotion}</div>
                <div className="emotion-bar-container">
                  <div 
                    className="emotion-bar" 
                    style={{ width: `${emotion.intensity * 100}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {redFlagsCount !== undefined && (
        <div className="document-section">
          <div className="section-title">Red Flags</div>
          <div className="section-content">
            <p>
              <span className="red-flags-count">
                {redFlagsCount} potential red flag{redFlagsCount !== 1 ? 's' : ''}
              </span> {redFlagsCount === 0 ? 'were' : 'was'} identified in this conversation.
              {redFlagsCount > 0 && ' Upgrade to see detailed analysis of each red flag.'}
            </p>
          </div>
        </div>
      )}
      
      {communication && communication.patterns && (
        <div className="document-section">
          <div className="section-title">Communication Patterns</div>
          <div className="section-content">
            <ul className="pattern-list">
              {communication.patterns.map((pattern, index) => (
                <li key={index} className="pattern-item">{pattern}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
      
      {result.tensionMeaning && (
        <div className="document-section">
          <div className="section-title">What This Means</div>
          <div className="section-content">
            {result.tensionMeaning}
          </div>
        </div>
      )}
      
      {result.tensionContributions && (
        <div className="document-section">
          <div className="section-title">Individual Contributions to Tension</div>
          <div className="section-content">
            {Object.entries(result.tensionContributions).map(([participant, contributions]) => (
              <div key={participant} style={{ marginBottom: '15px' }}>
                <div style={{ fontWeight: 600, marginBottom: '5px' }}>{participant}:</div>
                <ul className="pattern-list">
                  {contributions.map((item, index) => (
                    <li key={index} className="pattern-item">{item}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}
      
      <div className="document-footer">
        <p>This analysis was generated by Drama Llama AI.</p>
        <p>Results should be interpreted as general guidance only.</p>
      </div>
    </div>
  );
};

export default ExportDocument;