import React, { useState, useRef } from 'react';
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChatAnalysisResult } from '@shared/schema';
import html2pdf from 'html2pdf.js';
import { toJpeg } from 'html-to-image';
import { useToast } from "@/hooks/use-toast";

interface FreeTierAnalysisProps {
  result: ChatAnalysisResult;
  me: string;
  them: string;
}

export function FreeTierAnalysis({ result, me, them }: FreeTierAnalysisProps) {
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);
  
  // Export as formal branded document with text copying
  const exportToPdf = async () => {
    if (!result) {
      toast({
        title: "Export Failed",
        description: "Could not create document. Please try again.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      setIsExporting(true);
      
      // Create a temporary container for the formal document
      const tempContainer = document.createElement('div');
      tempContainer.style.position = 'absolute';
      tempContainer.style.left = '-9999px';
      document.body.appendChild(tempContainer);
      
      // Render our formal document component to string
      const formalDocumentContent = `
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
            
            /* Mobile styles */
            @media (max-width: 640px) {
              .document-header {
                flex-direction: column;
                text-align: center;
              }
              
              .logo-container {
                margin: 0 auto 15px;
              }
            }
          </style>
        </head>
        <body>
          <div class="drama-llama-document">
            <div class="document-header">
              <div class="logo-container">
                <img src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDI1IiBoZWlnaHQ9IjQyNSIgdmlld0JveD0iMCAwIDQyNSA0MjUiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxwYXRoIGQ9Ik0yNDguNSA0MDAuNUMyMjEuNTAzIDQwMC41IDEzNyA0MDAuNSA5MCA0MDAuNUM0MyA0MDAuNSA0MyAzNDIgNDMgMzAwQzQzIDI1OCA0MyAyMTYgNDMgMTgwQzQzIDE0NCA0MyAxMDggOTAgMTAwQzEzNyA5MiAyMTAuNzU2IDk2LjI2NTEgMjQ4LjUgMTE0LjVDMjg2LjI0NCAxMzIuNzM1IDM1MS45MDIgMTkyLjYyOSAzODIgMjIwQzQxMi4wOTggMjQ3LjM3MSAzODIgMzAwIDM1MSAzMjBDMzIwIDM0MCAyNzUuNDk3IDQwMC41IDI0OC41IDQwMC41WiIgZmlsbD0iIzIyQzlDOSIvPgo8cGF0aCBkPSJNMjc0IDI0MFYyNzNMMTk3IDI0MGwtMS41IC0zM0wyNzQgMjQwWiIgZmlsbD0id2hpdGUiLz4KPHBhdGggZD0iTTEyNyAyNzAuNVYzMDBMMTk3IDI3M2wtMiAtMzNMMTI3IDI3MC41WiIgZmlsbD0id2hpdGUiLz4KPGNpcmNsZSBjeD0iMTk3LjUiIGN5PSIxOTAuNSIgcj0iNzYuNSIgZmlsbD0id2hpdGUiLz4KPHBhdGggZD0iTTIyMiAyMjRDMjIyIDIxNSAyMTkgMjAxLjUgMjExLjUgMTk1QzIwNiAxOTAuMiAyMDEuMzMzIDE4OS4zMzMgMTk5LjUgMTg5LjVMMTk4IDIxN0wxODEuNSAyMTdMMTgwIDIxNC41TDE4MC41IDE4OS41QzE3NyAxOTAuMzMzIDE3MCAxOTQgMTcwIDIwMkMxNzAgMjEwIDE2NyAyMjMuNSAxNzIuNSAyMzBDMTc4IDIzNi41IDE5MS41IDI0MCAxOTggMjM5LjVDMjA0LjUgMjM5IDIxOSAyMzUuNSAyMjIgMjI0WiIgZmlsbD0iIzIyQzlDOSIvPgo8Y2lyY2xlIGN4PSIxOTAuNSIgY3k9IjE3NiIgcj0iMTUuNSIgZmlsbD0iYmxhY2siLz4KPGNpcmNsZSBjeD0iMTkwLjUiIGN5PSIxNzMiIHI9IjQuNSIgZmlsbD0id2hpdGUiLz4KPC9zdmc+Cg==" alt="Drama Llama Logo" />
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
            
            <div class="document-title">
              Chat Analysis Results
            </div>
            
            <div class="document-section">
              <div class="section-title">Overall Tone</div>
              <div class="section-content">
                ${result.toneAnalysis.overallTone}
              </div>
            </div>
            
            ${result.healthScore ? `
            <div class="document-section">
              <div class="section-title">Conversation Health</div>
              <div class="health-score">
                <div class="health-score-label">Health Score:</div>
                <div class="health-score-value health-score-${result.healthScore.color}">
                  ${result.healthScore.label} (${result.healthScore.score}/10)
                </div>
              </div>
            </div>
            ` : ''}
            
            ${result.toneAnalysis.emotionalState && result.toneAnalysis.emotionalState.length > 0 ? `
            <div class="document-section">
              <div class="section-title">Emotional States</div>
              <div class="section-content">
                ${result.toneAnalysis.emotionalState.map(emotion => `
                <div class="emotion-item">
                  <div class="emotion-label">${emotion.emotion}</div>
                  <div class="emotion-bar-container">
                    <div 
                      class="emotion-bar" 
                      style="width: ${emotion.intensity * 100}%"
                    ></div>
                  </div>
                </div>
                `).join('')}
              </div>
            </div>
            ` : ''}
            
            ${result.redFlagsCount !== undefined ? `
            <div class="document-section">
              <div class="section-title">Red Flags</div>
              <div class="section-content">
                <p>
                  <span class="red-flags-count">
                    ${result.redFlagsCount} potential red flag${result.redFlagsCount !== 1 ? 's' : ''}
                  </span> ${result.redFlagsCount === 0 ? 'were' : 'was'} identified in this conversation.
                  ${result.redFlagsCount > 0 ? ' Upgrade to see detailed analysis of each red flag.' : ''}
                </p>
              </div>
            </div>
            ` : ''}
            
            ${result.communication && result.communication.patterns ? `
            <div class="document-section">
              <div class="section-title">Communication Patterns</div>
              <div class="section-content">
                <ul class="pattern-list">
                  ${result.communication.patterns.map(pattern => `
                  <li class="pattern-item">${pattern}</li>
                  `).join('')}
                </ul>
              </div>
            </div>
            ` : ''}
            
            <div class="document-footer">
              <p>This analysis was generated by Drama Llama AI.</p>
              <p>Results should be interpreted as general guidance only.</p>
            </div>
          </div>
        </body>
        </html>
      `;
      
      // Show the formal document in a modal
      const modal = document.createElement('div');
      modal.className = 'fixed inset-0 bg-black/80 flex flex-col z-50 p-0 md:p-4';
      
      modal.innerHTML = `
        <div class="bg-white rounded-lg w-full h-full md:h-auto md:max-h-[90vh] flex flex-col overflow-hidden">
          <div class="p-3 flex justify-between items-center bg-primary text-white">
            <h3 class="text-lg font-bold">Drama Llama Analysis</h3>
            <div class="flex items-center">
              <button id="copy-document" class="px-3 py-1 bg-white/20 text-sm rounded mr-2">
                Copy Document
              </button>
              <button id="close-document-preview" class="px-3 py-1 bg-white/20 text-sm rounded">
                Close
              </button>
            </div>
          </div>
          <div class="flex-1 overflow-auto p-0 bg-white" id="document-preview-container"></div>
        </div>
      `;
      
      document.body.appendChild(modal);
      document.body.style.overflow = 'hidden'; // Prevent scrolling
      
      // Set the document preview
      const previewContainer = document.getElementById('document-preview-container');
      if (previewContainer) {
        const iframe = document.createElement('iframe');
        iframe.style.width = '100%';
        iframe.style.height = '100%';
        iframe.style.border = 'none';
        previewContainer.appendChild(iframe);
        
        const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
        if (iframeDoc) {
          iframeDoc.open();
          iframeDoc.write(formalDocumentContent);
          iframeDoc.close();
        }
      }
      
      // Add copy handler
      document.getElementById('copy-document')?.addEventListener('click', () => {
        try {
          // Create temporary textarea for reliable copying
          const textarea = document.createElement('textarea');
          textarea.value = formalDocumentContent;
          textarea.style.position = 'fixed';  // Make the textarea out of viewport
          document.body.appendChild(textarea);
          textarea.select();
          
          const successful = document.execCommand('copy');
          document.body.removeChild(textarea);
          
          if (successful) {
            toast({
              title: "Copied to Clipboard",
              description: "Document HTML copied! You can paste it in a text editor and save as .html",
              duration: 3000,
            });
          } else {
            throw new Error("Copy command failed");
          }
        } catch (err) {
          console.error("Old-style clipboard copy failed:", err);
          
          // Try modern clipboard API as fallback
          navigator.clipboard.writeText(formalDocumentContent)
            .then(() => {
              toast({
                title: "Copied to Clipboard",
                description: "Document HTML copied! You can paste it in a text editor and save as .html",
                duration: 3000,
              });
            })
            .catch(clipboardErr => {
              console.error("Modern clipboard API also failed:", clipboardErr);
              toast({
                title: "Copy Failed",
                description: "Please try again or take screenshots instead.",
                variant: "destructive",
              });
            });
        }
      });
      
      // Add close handler
      document.getElementById('close-document-preview')?.addEventListener('click', () => {
        document.body.removeChild(modal);
        document.body.style.overflow = ''; // Restore scrolling
      });
      
      // Remove the temporary container
      document.body.removeChild(tempContainer);
      
    } catch (error) {
      console.error("Document export failed:", error);
      toast({
        title: "Export Failed",
        description: "Please try taking screenshots instead.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };
  
  // Extremely simplified screenshot feature for mobile compatibility
  const exportAsImage = async () => {
    if (!resultsRef.current || !result) {
      toast({
        title: "Screenshot Failed",
        description: "Could not create image. Please try again.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      setIsExporting(true);
      
      toast({
        title: "Creating Image",
        description: "Please wait...",
        duration: 3000,
      });
      
      try {
        // Generate image with minimal settings for better mobile compatibility
        const element = resultsRef.current;
        const dataUrl = await toJpeg(element, { 
          cacheBust: true,
          quality: 0.8,
          backgroundColor: 'white',
          canvasWidth: 1000,
          pixelRatio: 1
        });
        
        // Skip trying to download directly, just show the image for saving
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black/95 flex flex-col z-50';
        
        modal.innerHTML = `
          <div class="p-3 flex justify-between items-center bg-gray-900 text-white">
            <h3 class="text-sm font-bold">Long-press on image to save</h3>
            <button id="close-fullscreen-image" class="px-3 py-1 bg-gray-700 text-sm rounded">
              Close
            </button>
          </div>
          <div class="flex-1 overflow-auto flex items-center justify-center">
            <img src="${dataUrl}" alt="Analysis Result" class="max-w-full" />
          </div>
        `;
        
        document.body.appendChild(modal);
        document.body.style.overflow = 'hidden'; // Prevent scrolling behind modal
        
        // Add close handler
        document.getElementById('close-fullscreen-image')?.addEventListener('click', () => {
          document.body.removeChild(modal);
          document.body.style.overflow = ''; // Restore scrolling
        });
        
        toast({
          title: "Screenshot Ready",
          description: "Long-press on the image to save it to your phone",
          duration: 5000,
        });
        
      } catch (error) {
        console.error("Screenshot generation failed:", error);
        toast({
          title: "Screenshot Failed",
          description: "Please try taking a manual screenshot instead.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Image export error:", error);
      toast({
        title: "Screenshot Failed",
        description: "Please try taking a manual screenshot instead.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };
  
  return (
    <div ref={resultsRef} className="mb-4 p-4 bg-white border rounded-lg shadow-sm">
      <div className="flex flex-col gap-6">
        {/* Free Tier Summary Section */}
        <div>
          <h4 className="font-medium mb-3">Conversation Summary</h4>
          <div className="flex flex-col gap-4">
            <div className="p-4 bg-muted rounded-lg">
              <h5 className="text-sm font-medium text-muted-foreground mb-1">Overall Tone</h5>
              <p className="text-2xl font-semibold">
                {result.toneAnalysis?.overallTone?.split(".")[0] || "Neutral"}
              </p>
              <p className="text-sm text-gray-500 mt-2">
                {result.toneAnalysis?.overallTone?.includes(".") ? 
                  result.toneAnalysis.overallTone.substring(result.toneAnalysis.overallTone.indexOf('.')+1).trim() :
                  "This conversation shows signs of emotional strain."}
              </p>
            </div>
          </div>
        </div>
        
        {/* Free Tier Participant Summary */}
        <div>
          <h4 className="font-medium mb-3">Participant Summary</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="shadow-none border-[#22C9C9] border-l-2">
              <CardContent className="p-4">
                <CardTitle className="text-base font-medium text-[#22C9C9] mb-1">{me}</CardTitle>
                <p className="text-sm text-gray-700">
                  {result.toneAnalysis?.participantTones?.[me]?.split(".")[0] || 
                    (result.healthScore?.score && result.healthScore.score < 60 ? "Frustrated" : "Balanced")}
                </p>
              </CardContent>
            </Card>
            <Card className="shadow-none border-[#FF69B4] border-l-2">
              <CardContent className="p-4">
                <CardTitle className="text-base font-medium text-[#FF69B4] mb-1">{them}</CardTitle>
                <p className="text-sm text-gray-700">
                  {result.toneAnalysis?.participantTones?.[them]?.split(".")[0] || 
                    (result.healthScore?.score && result.healthScore.score < 60 ? "Defensive" : "Responsive")}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
        
        {/* Free Tier Health Meter */}
        <div>
          <h4 className="font-medium mb-3">Conversation Health Meter</h4>
          <div className="p-4 bg-muted rounded-lg">
            <div className="flex justify-between items-center mb-1 text-xs text-gray-500">
              <span>Severe Conflict</span>
              <span>Very Healthy</span>
            </div>
            <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className={`h-full ${
                  result.healthScore && result.healthScore.score >= 80 ? 'bg-emerald-500' :
                  result.healthScore && result.healthScore.score >= 60 ? 'bg-lime-500' :
                  result.healthScore && result.healthScore.score >= 40 ? 'bg-amber-500' :
                  'bg-red-500'
                }`}
                style={{ width: result.healthScore ? `${result.healthScore.score}%` : '50%' }}
              ></div>
            </div>
            <p className="text-sm mt-2 text-gray-700">
              {result.healthScore && result.healthScore.score >= 80 ? 'Healthy communication with mutual respect.' :
                result.healthScore && result.healthScore.score >= 60 ? 'Generally positive with some areas for improvement.' :
                result.healthScore && result.healthScore.score >= 40 ? 'Moderate to High Tension' :
                'Significant tension present, needs attention.'}
            </p>
          </div>
        </div>
        
        {/* Free Tier Sample Quote */}
        {result.keyQuotes && result.keyQuotes.length > 0 && (
          <div>
            <h4 className="font-medium mb-3">Sample Quote</h4>
            <Card className="shadow-none">
              <CardContent className="p-4">
                <div className="flex flex-col space-y-3">
                  <div className="flex items-center gap-2">
                    <div 
                      className="h-2 w-2 rounded-full" 
                      style={{ 
                        backgroundColor: result.keyQuotes[0].speaker === me ? '#22C9C9' : '#FF69B4'
                      }}
                    ></div>
                    <span className="font-medium" style={{ 
                      color: result.keyQuotes[0].speaker === me ? '#22C9C9' : '#FF69B4'
                    }}>
                      {result.keyQuotes[0].speaker}
                    </span>
                  </div>
                  <div className="pl-4 border-l-2" style={{ 
                    borderColor: result.keyQuotes[0].speaker === me ? '#22C9C9' : '#FF69B4' 
                  }}>
                    <p className="italic text-gray-600">"{result.keyQuotes[0].quote}"</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
        
        {/* Red Flags Teaser - Only shown when health score is below 80 */}
        {(result.healthScore && result.healthScore.score < 80) && (
          <div className="p-4 bg-red-50 rounded-lg border border-red-100 mb-4">
            <div className="flex justify-between items-center">
              <h4 className="text-lg font-medium text-red-700">
                Red Flags Detected: {
                  // Show real count if available, otherwise determine based on health score
                  result.redFlagsCount !== undefined ? result.redFlagsCount : 
                  result.healthScore.score < 40 ? 3 : 
                  result.healthScore.score < 60 ? 2 : 1
                }
              </h4>
              <div className="px-2 py-1 bg-red-100 text-xs text-red-800 font-medium rounded-full">Upgrade to see details</div>
            </div>
            <p className="text-sm text-red-600 mt-2">
              This conversation contains potentially concerning patterns that may need attention.
              Upgrade to Personal plan to see detailed analysis.
            </p>
          </div>
        )}
        
        {/* Export Buttons */}
        <div className="flex justify-end mb-4">
          <Button
            onClick={exportToPdf}
            disabled={isExporting}
            className="mr-2"
            variant="outline"
          >
            {isExporting ? 'Downloading...' : 'Download as PDF'}
          </Button>
          <Button 
            variant="outline"
            onClick={exportAsImage}
            disabled={isExporting}
          >
            {isExporting ? 'Downloading...' : 'Download as Image'}
          </Button>
        </div>
        
        {/* Upgrade CTA */}
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 mt-2">
          <h4 className="font-medium text-blue-800 mb-2">Want deeper insights?</h4>
          <p className="text-blue-700 mb-3">
            Unlock full communication patterns, risk assessments, and style breakdowns with Drama Llama AI Personal Plan – Just £3.99/month
          </p>
          <Button className="bg-blue-600 hover:bg-blue-700">
            Upgrade to Personal
          </Button>
        </div>
      </div>
    </div>
  );
}