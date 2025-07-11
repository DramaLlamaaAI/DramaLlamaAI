import React from 'react';
import { ChatAnalysisResult } from '@shared/schema';
import html2pdf from 'html2pdf.js';

interface ExportDocumentProps {
  result: ChatAnalysisResult;
  me: string;
  them: string;
  tier?: string;
  participants?: string[];
  conversationType?: 'two_person' | 'group_chat';
  conversation?: string;
}

export function generateExportDocument({ 
  result, 
  me, 
  them, 
  tier = 'free', 
  participants = [], 
  conversationType = 'two_person'
}: ExportDocumentProps): string {
  // Create a clean HTML document for exporting based on user's tier
  const userTier = tier || 'free';
  
  // Determine if this is a group chat analysis
  const isGroupChat = conversationType === 'group_chat';
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
        
        .participant-tones {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 15px;
          margin-top: 15px;
        }
        
        .participant-tone-box {
          padding: 12px;
          border-radius: 8px;
        }
        
        .participant-tone-me {
          background-color: rgba(34, 201, 201, 0.1);
          border: 1px solid rgba(34, 201, 201, 0.3);
        }
        
        .participant-tone-them {
          background-color: rgba(255, 105, 180, 0.1);
          border: 1px solid rgba(255, 105, 180, 0.3);
        }
        
        .participant-name {
          font-weight: bold;
          margin-bottom: 8px;
        }
        
        .participant-name-me {
          color: #22C9C9;
        }
        
        .participant-name-them {
          color: #FF69B4;
        }
        
        .red-flag-item {
          padding: 12px;
          background-color: #FFF0F0;
          border-left: 3px solid #e53e3e;
          border-radius: 4px;
          margin-bottom: 15px;
        }
        
        .red-flag-type {
          font-weight: bold;
          margin-bottom: 5px;
          color: #e53e3e;
        }
        
        .red-flag-description {
          margin-bottom: 5px;
        }
        
        .red-flag-severity {
          font-size: 14px;
          color: #666;
          font-style: italic;
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
          <div style="display: flex; align-items: center; justify-content: center; margin-bottom: 15px;">
            <img src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA1MTIgNTEyIj4KICA8IS0tIEJhY2tncm91bmQgLS0+CiAgPHJlY3Qgd2lkdGg9IjUxMiIgaGVpZ2h0PSI1MTIiIGZpbGw9IiMyMkM5QzkiIHN0eWxlPSJkaXNwbGF5Om5vbmU7Ii8+CiAgCiAgPCEtLSBQaW5rIExsYW1hIC0tPgogIDxwYXRoIGQ9Ik0yNTYgOTBjLTQwIDAtNzUgMjAtMTAwIDQ1LTI1IDI1LTQwIDYwLTQwIDk1IDAgMzAgMTUgNTUgMzUgNzAgMjAgMTUgNDUgMjAgNjUgMjAgMTUgMCAzMC01IDQwLTE1IDEwLTEwIDE1LTI1IDE1LTQ1IDAtMTUtNS0zMC0xNS00MC0xMC0xMC0yNS0xNS00MC0xNS0xMCAwLTIwIDUtMjUgMTAtNSA1LTEwIDE1LTEwIDI1IDAgNSAwIDEwIDUgMTUgNSA1IDEwIDUgMTUgNSA1IDAgMTAgMCAxNS01IDUtNSA1LTEwIDUtMTUiIGZpbGw9IiNGRjY5QjQiIC8+CiAgCiAgPCEtLSBFYXJzIC0tPgogIDxwYXRoIGQ9Ik0xNzAgMTMwYy0xMC0xNS0yMC0zNS0xNS01NSA1LTIwIDIwLTM1IDQwLTQwIDIwLTUgNDAgNSA1NSAyMCAxNSAxNSAyMCAzNSAxNSA1NS01IDIwLTIwIDMwLTM1IDM1LTE1IDUtMzAgMC00NS01IiBmaWxsPSIjRkY2OUI0IiAvPgogIDxwYXRoIGQ9Ik0zNDIgMTMwYzEwLTE1IDIwLTM1IDE1LTU1LTUtMjAtMjAtMzUtNDAtNDAtMjAtNS00MCA1LTU1IDIwLTE1IDE1LTIwIDM1LTE1IDU1IDUgMjAgMjAgMzAgMzUgMzUgMTUgNSAzMCAwIDQ1LTUiIGZpbGw9IiNGRjY5QjQiIC8+CiAgCiAgPCEtLSBGYWNlIERldGFpbHMgLS0+CiAgPGVsbGlwc2UgY3g9IjIwNSIgY3k9IjIxMCIgcng9IjEwIiByeT0iMTUiIGZpbGw9IiMwMDAiIC8+CiAgPGVsbGlwc2UgY3g9IjMwNyIgY3k9IjIxMCIgcng9IjEwIiByeT0iMTUiIGZpbGw9IiMwMDAiIC8+CiAgCiAgPCEtLSBOb3NlIC0tPgogIDxwYXRoIGQ9Ik0yNTYgMjM1Yy0xMCAwLTIwIDUtMjUgMTAtNSA1LTEwIDE1LTEwIDI1IDAgMTAgNSAyMCAxNSAyNSAxMCA1IDIwIDUgMzAgMCAxMC01IDE1LTE1IDE1LTI1IDAtMTAtNS0yMC0xMC0yNS01LTUtMTAtMTAtMTUtMTAiIGZpbGw9IiNGRkMwQ0IiIC8+CiAgCiAgPCEtLSBNb3V0aCAtLT4KICA8cGF0aCBkPSJNMjQwIDI3NWM1IDEwIDE1IDE1IDI1IDE1IDEwIDAgMjAtNSAyNS0xNSIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjMDAwIiBzdHJva2Utd2lkdGg9IjUiIC8+CiAgCiAgPCEtLSBTdW5nbGFzc2VzIC0tPgogIDxwYXRoIGQ9Ik0xNzUgMTkwaDE2MGMxMCAwIDIwIDEwIDIwIDIwdjEwYzAgMTAtMTAgMjAtMjAgMjBoLTcwYy01IDAtMTAtNS0xMC0xMCAwLTUgNS0xMCAxMC0xMGgzMGM1IDAgMTAtNSAxMC0xMCAwLTUtNS0xMC0xMC0xMGgtODBjLTUgMC0xMCA1LTEwIDEwIDAgNSA1IDEwIDEwIDEwaDMwYzUgMCAxMCA1IDEwIDEwIDAgNS01IDEwLTEwIDEwaC03MGMtMTAgMC0yMC0xMC0yMC0yMHYtMTBjMC0xMCAxMC0yMCAyMC0yMHoiIGZpbGw9IiMwMDAiIC8+CiAgCiAgPCEtLSBPdXRsaW5lIC0tPgogIDxwYXRoIGQ9Ik0yNTYgOTBjLTQwIDAtNzUgMjAtMTAwIDQ1LTI1IDI1LTQwIDYwLTQwIDk1IDAgMzAgMTUgNTUgMzUgNzAgMjAgMTUgNDUgMjAgNjUgMjAgMTUgMCAzMC01IDQwLTE1IDEwLTEwIDE1LTI1IDE1LTQ1TTE3MCAxMzBjLTEwLTE1LTIwLTM1LTE1LTU1IDUtMjAgMjAtMzUgNDAtNDAgMjAtNSA0MCA1IDU1IDIwIDE1IDE1IDIwIDM1IDE1IDU1LTUgMjAtMjAgMzAtMzUgMzUtMTUgNS0zMCAwLTQ1LTVNMzQyIDEzMGMxMC0xNSAyMC0zNSAxNS01NS01LTIwLTIwLTM1LTQwLTQwLTIwLTUtNDAgNS01NSAyMC0xNSAxNS0yMCAzNS0xNSA1NSA1IDIwIDIwIDMwIDM1IDM1IDE1IDUgMzAgMCA0NS01IiBmaWxsPSJub25lIiBzdHJva2U9IiMwMDAiIHN0cm9rZS13aWR0aD0iMTAiIC8+Cjwvc3ZnPg==" width="80" height="80" alt="Drama Llama Logo" />
            <div class="logo-text" style="margin-left: 15px;">
              <span class="pink">Drama</span><span class="teal">Llama</span>
            </div>
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
          
          ${result.toneAnalysis.participantTones && userTier !== 'free' ? `
          <div class="participant-tones">
            <div class="participant-tone-box participant-tone-me">
              <div class="participant-name participant-name-me">${me}</div>
              <div>${result.toneAnalysis.participantTones[me] || 'No specific tone identified'}</div>
            </div>
            <div class="participant-tone-box participant-tone-them">
              <div class="participant-name participant-name-them">${them}</div>
              <div>${result.toneAnalysis.participantTones[them] || 'No specific tone identified'}</div>
            </div>
          </div>
          ` : ''}
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
          ${userTier === 'free' ? `
          <div class="red-flags-box ${result.redFlagsCount && result.redFlagsCount > 0 ? 'has-flags' : 'no-flags'}">
            ${result.redFlagsCount && result.redFlagsCount > 0 
              ? `<div><span class="red-flags-count">${result.redFlagsCount}</span> potential red flag${result.redFlagsCount !== 1 ? 's' : ''} detected.</div>
                 <div>Upgrade to see details about these red flags and receive recommendations.</div>`
              : `<div style="color:#38a169; font-weight:500;">No significant red flags detected in the conversation.</div>`
            }
          </div>
          ` : `
          <div class="section-content">
            ${result.redFlags && result.redFlags.length > 0 
              ? result.redFlags.map(flag => `
                <div class="red-flag-item">
                  <div class="red-flag-type">${flag.type}</div>
                  <div class="red-flag-description">${flag.description}</div>
                  <div class="red-flag-severity">Severity: ${flag.severity}/5</div>
                </div>
              `).join('')
              : `<div style="color:#38a169; font-weight:500; padding: 15px; background-color: #F0FFF4; border-radius: 6px; border-left: 4px solid #38a169;">
                   No significant red flags detected in the conversation.
                 </div>`
            }
          </div>
          `}
        </div>
        
        <div class="document-footer">
          <p>Report generated by Drama Llama AI - Copyright © ${new Date().getFullYear()}</p>
          <p>For more insights into your conversations, visit <a href="https://drama-llama-ai.replit.app">drama-llama-ai.replit.app</a></p>
        </div>
      </div>
    </body>
    </html>
  `;
}

function exportToPdf({ 
  result, 
  me, 
  them, 
  toast, 
  tier = 'free', 
  participants = [], 
  conversationType = 'two_person',
  conversation = ''
}: {
  result: ChatAnalysisResult;
  me: string;
  them: string;
  toast: any;
  tier?: string;
  participants?: string[];
  conversationType?: 'two_person' | 'group_chat';
  conversation?: string;
}) {
  if (!result) {
    toast({
      title: "Export Failed",
      description: "Could not create document. Please try again.",
      variant: "destructive",
    });
    return;
  }
  
  try {
    // Show loading toast
    toast({
      title: "Generating PDF",
      description: "Please wait while we prepare your document...",
    });
    
    // Create document content with tier information
    const formalDocumentContent = generateExportDocument({ 
      result, 
      me, 
      them, 
      tier, 
      participants, 
      conversationType,
      conversation 
    });
    
    // Create a temporary container for the formal document
    const tempContainer = document.createElement('div');
    tempContainer.style.position = 'absolute';
    tempContainer.style.left = '-9999px';
    document.body.appendChild(tempContainer);
    
    // Add document to container
    tempContainer.innerHTML = formalDocumentContent;
    
    // Create a timestamp for unique filenames
    const timestamp = new Date().getTime();
    const fileName = `Drama-Llama-Analysis-${timestamp}.pdf`;
    
    // Configuration for the PDF export with mobile-specific settings
    const options = {
      margin: [10, 10, 10, 10],
      filename: fileName,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { 
        scale: 2, 
        useCORS: true, 
        logging: false,
        allowTaint: true,
        foreignObjectRendering: false
      },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    // Detect mobile devices
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    const isAndroid = /Android/i.test(navigator.userAgent);
    
    // Mobile-specific approach
    if (isIOS || isAndroid) {
      // For mobile devices, use a simpler approach - data URL
      html2pdf().from(tempContainer).set(options).outputPdf('datauristring')
        .then((dataUri: string) => {
          // Remove the temporary container
          document.body.removeChild(tempContainer);
          
          // Open in a new window/tab
          window.open(dataUri, '_blank');
          
          toast({
            title: "PDF Ready",
            description: "Your PDF has opened in a new window. Use the share button to save it.",
          });
        })
        .catch((error: any) => {
          console.error("Mobile PDF error:", error);
          document.body.removeChild(tempContainer);
          toast({
            title: "Export Failed",
            description: "Could not create PDF. Please try again.",
            variant: "destructive",
          });
        });
    } else {
      // Desktop approach - Blob URL and download
      html2pdf().from(tempContainer).set(options).save()
        .then(() => {
          // Remove the temporary container
          document.body.removeChild(tempContainer);
          
          toast({
            title: "Export Successful",
            description: "Your analysis has been downloaded as a PDF.",
          });
        })
        .catch((error: any) => {
          console.error("Desktop PDF error:", error);
          document.body.removeChild(tempContainer);
          toast({
            title: "Export Failed",
            description: "Could not create PDF. Please try again.",
            variant: "destructive",
          });
        });
    }
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