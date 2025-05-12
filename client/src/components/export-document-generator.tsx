import React from 'react';
import { ChatAnalysisResult } from '@shared/schema';
import html2pdf from 'html2pdf.js';
import { useToast } from "@/hooks/use-toast";

interface ExportDocumentProps {
  result: ChatAnalysisResult;
  me: string;
  them: string;
}

export function generateExportDocument({ result, me, them }: ExportDocumentProps): string {
  // Create a clean HTML document for exporting
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <title>Drama Llama Analysis</title>
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <style>
        body {
          font-family: system-ui, -apple-system, sans-serif;
          margin: 0;
          padding: 0;
          background: white;
        }
        
        .drama-llama-document {
          font-family: system-ui, -apple-system, sans-serif;
          max-width: 800px;
          margin: 0 auto;
          padding: 0;
          background-color: white;
          color: #333;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          overflow: hidden;
        }
        
        .document-header {
          display: flex;
          flex-direction: column;
          align-items: center;
          margin-bottom: 30px;
          padding: 20px;
          border-bottom: 2px solid #22C9C9;
          background-color: #f0f8ff;
          border-radius: 8px 8px 0 0;
          text-align: center;
        }
        
        .logo-text {
          font-size: 32px;
          font-weight: bold;
          margin-bottom: 10px;
          letter-spacing: 1px;
        }
        
        .pink {
          color: #FF69B4;
        }
        
        .teal {
          color: #22C9C9;
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
          padding: 0 20px;
        }
        
        .document-section {
          margin-bottom: 25px;
          padding: 0 20px;
        }
        
        .section-title {
          font-size: 20px;
          font-weight: 600;
          margin-bottom: 15px;
          color: #22C9C9;
          border-left: 4px solid #22C9C9;
          padding-left: 10px;
        }
        
        .tone-analysis-box {
          padding: 15px;
          background-color: #f0f8ff;
          border-radius: 8px;
          border-left: 4px solid #22C9C9;
          margin-bottom: 15px;
        }
        
        .participant-me {
          color: #22C9C9;
          font-weight: 600;
        }
        
        .participant-them {
          color: #FF69B4;
          font-weight: 600;
        }
        
        .participants-info {
          padding: 10px;
          background-color: #f8f8f8;
          border-radius: 8px;
          margin-top: 10px;
          font-style: italic;
          text-align: center;
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
          background-color: #f0ffff;
          border-radius: 8px;
          border-left: 4px solid #22C9C9;
        }
        
        .health-score-label {
          font-weight: 600;
          margin-right: 15px;
        }
        
        .health-score-value {
          font-size: 18px;
          font-weight: 700;
        }
        
        .health-score-red {
          color: #e53e3e;
        }
        
        .health-score-yellow {
          color: #d69e2e;
        }
        
        .health-score-light-green {
          color: #38a169;
        }
        
        .health-score-green {
          color: #2f855a;
        }
        
        .red-flags-box {
          padding: 12px;
          border-radius: 8px;
          margin-bottom: 15px;
        }
        
        .red-flags-box.has-flags {
          background-color: #FFF0F0;
          border-left: 4px solid #e53e3e;
        }
        
        .red-flags-box.no-flags {
          background-color: #F0FFF4;
          border-left: 4px solid #38a169;
        }
        
        .red-flags-count {
          font-weight: 600;
          color: #e53e3e;
        }
        
        .pattern-list {
          margin: 0;
          padding-left: 20px;
          list-style-type: none;
        }
        
        .pattern-item {
          margin-bottom: 10px;
          position: relative;
          padding-left: 15px;
        }
        
        .pattern-item:before {
          content: "";
          position: absolute;
          left: 0;
          top: 6px;
          height: 8px;
          width: 8px;
          border-radius: 50%;
          background-color: #22C9C9;
        }
        
        .document-footer {
          margin-top: 40px;
          padding: 20px;
          background-color: #f0f8ff;
          border-top: 2px solid #22C9C9;
          font-size: 14px;
          color: #555;
          text-align: center;
          border-radius: 0 0 8px 8px;
        }
      </style>
    </head>
    <body>
      <div class="drama-llama-document">
        <div class="document-header">
          <div class="logo-text">
            <span class="pink">Drama</span><span class="teal">Llama</span>
          </div>
          <div class="header-text">
            <h1>Drama Llama AI</h1>
            <p>Conversation Analysis Report</p>
            <p>Generated on: ${new Date().toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}</p>
          </div>
        </div>
        
        <div class="document-title">Chat Analysis Results</div>
        
        <div class="document-section">
          <div class="section-title">Overall Tone</div>
          <div class="tone-analysis-box">
            <div class="section-content">
              ${result.toneAnalysis.overallTone}
            </div>
          </div>
          
          <div class="participants-info">
            Conversation between <span class="participant-me">${me}</span> and <span class="participant-them">${them}</span>
          </div>
        </div>
        
        <div class="document-section">
          <div class="section-title">Conversation Health</div>
          <div class="health-score">
            <div class="health-score-label">Health Score:</div>
            <div class="health-score-value health-score-${result.healthScore?.color || 'yellow'}">
              ${result.healthScore?.score || '?'}/100 - ${result.healthScore?.label || 'Not available'}
            </div>
          </div>
        </div>
        
        <div class="document-section">
          <div class="section-title">Red Flags</div>
          <div class="red-flags-box ${result.redFlagsCount && result.redFlagsCount > 0 ? 'has-flags' : 'no-flags'}">
            ${result.redFlagsCount && result.redFlagsCount > 0 
              ? `<div><span class="red-flags-count">${result.redFlagsCount}</span> potential red flags detected.</div>
                 <div>Upgrade to see details about these red flags and receive recommendations.</div>`
              : `<div style="color:#38a169; font-weight:500;">No significant red flags detected in the conversation.</div>`
            }
          </div>
        </div>
        
        <div class="document-section">
          <div class="section-title">Communication Patterns</div>
          <div class="section-content">
            <ul class="pattern-list">
              ${result.communication && result.communication.patterns ? 
                result.communication.patterns.map(pattern => 
                  `<li class="pattern-item">${pattern}</li>`
                ).join('') : ''}
            </ul>
          </div>
        </div>
        
        ${result.toneAnalysis.emotionalState && result.toneAnalysis.emotionalState.length > 0 ? `
        <div class="document-section">
          <div class="section-title">Emotional Intensity</div>
          <div class="section-content">
            ${result.toneAnalysis.emotionalState.map(emotion => `
            <div class="emotion-item">
              <div class="emotion-label">${emotion.emotion}</div>
              <div class="emotion-bar-container">
                <div class="emotion-bar" style="width: ${emotion.intensity * 100}%"></div>
              </div>
            </div>
            `).join('')}
          </div>
        </div>
        ` : ''}
        
        <div class="document-section">
          <div class="section-title">Support Resources</div>
          <div class="section-content">
            <div style="padding: 12px; background-color: #f0f8ff; border-radius: 8px; border-left: 4px solid #3b82f6;">
              <p>If you're experiencing relationship difficulties or emotional distress, UK support is available:</p>
              <ul style="margin-top: 8px;">
                <li style="margin-bottom: 8px;">Samaritans: 116 123 (24/7)</li>
                <li style="margin-bottom: 8px;">Shout: Text SHOUT to 85258 (24/7)</li>
                <li style="margin-bottom: 8px;">National Domestic Abuse Helpline: 0808 2000 247 (24/7)</li>
                <li style="margin-bottom: 8px;">NHS Mental Health Services: nhs.uk/service-search/mental-health</li>
              </ul>
              <p style="margin-top: 12px; font-style: italic; font-size: 12px;">
                Visit app.dramallama.ai/support-helplines for a comprehensive list of support resources.
              </p>
            </div>
          </div>
        </div>

        <div class="document-footer">
          <p>© Drama Llama AI - Powered by Claude</p>
          <p>For a more detailed analysis, upgrade your plan at app.dramallama.ai</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

export function exportToPdf(result: ChatAnalysisResult, me: string, them: string, toast: any) {
  if (!result) {
    toast({
      title: "Export Failed",
      description: "Could not create document. Please try again.",
      variant: "destructive",
    });
    return;
  }
  
  try {
    // Create document content
    const formalDocumentContent = generateExportDocument({ result, me, them });
    
    // Create a temporary container for the formal document
    const tempContainer = document.createElement('div');
    tempContainer.style.position = 'absolute';
    tempContainer.style.left = '-9999px';
    document.body.appendChild(tempContainer);
    
    // Add document to container
    tempContainer.innerHTML = formalDocumentContent;
    
    // Configuration for the PDF export
    const options = {
      margin: [10, 10, 10, 10],
      filename: 'Drama-Llama-Analysis.pdf',
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, logging: false },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    
    // Generate the PDF
    html2pdf().from(tempContainer).set(options).save()
      .then(() => {
        // Remove the temporary container when done
        document.body.removeChild(tempContainer);
        
        toast({
          title: "Export Successful",
          description: "Your analysis has been downloaded as a PDF.",
        });
      })
      .catch((error: any) => {
        console.error("PDF generation error:", error);
        document.body.removeChild(tempContainer);
        
        toast({
          title: "Export Failed",
          description: "Could not create PDF. Please try again.",
          variant: "destructive",
        });
      });
      
  } catch (error: any) {
    console.error("Export error:", error);
    toast({
      title: "Export Failed",
      description: "An unexpected error occurred. Please try again.",
      variant: "destructive",
    });
  }
}

export default exportToPdf;