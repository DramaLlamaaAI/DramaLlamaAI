import React, { useState, useRef } from 'react';
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChatAnalysisResult } from '@shared/schema';
import html2pdf from 'html2pdf.js';
import { toJpeg } from 'html-to-image';
import { useToast } from "@/hooks/use-toast";
import llamaImage from '@/assets/drama-llama-sunglasses.jpg';
import llamaLogo from '@/assets/drama-llama-logo.svg';
import BackHomeButton from "@/components/back-home-button";

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
              border-left: 4px solid #22C9C9;
              padding-left: 10px;
              color: #22C9C9;
              border-left: 4px solid #22C9C9;
              padding-left: 10px;
            }
            
            .participant-me {
              color: #22C9C9;
              font-weight: 600;
            }
            
            .participant-them {
              color: #FF69B4;
              font-weight: 600;
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
                <svg width="100" height="100" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
                  <!-- Background -->
                  <rect width="200" height="200" fill="#22C9C9" />
                  
                  <!-- Llama head shape -->
                  <path d="M100 25 C 65 25, 45 50, 40 90 C 35 130, 40 160, 60 175 C 80 190, 120 190, 140 175 C 160 160, 165 130, 160 90 C 155 50, 135 25, 100 25" fill="#FF69B4" stroke="#000" stroke-width="4" />
                  
                  <!-- Ears -->
                  <path d="M55 60 C 45 30, 30 30, 35 45 C 40 60, 45 70, 55 60" fill="#FF69B4" stroke="#000" stroke-width="3" />
                  <path d="M145 60 C 155 30, 170 30, 165 45 C 160 60, 155 70, 145 60" fill="#FF69B4" stroke="#000" stroke-width="3" />
                  
                  <!-- Face details -->
                  <path d="M75 140 C 85 145, 115 145, 125 140" stroke="#000" stroke-width="2" fill="none" />
                  <path d="M85 110 C 90 105, 95 105, 100 110" stroke="#000" stroke-width="1.5" fill="none" />
                  <path d="M115 110 C 110 105, 105 105, 100 110" stroke="#000" stroke-width="1.5" fill="none" />
                  
                  <!-- Muzzle -->
                  <ellipse cx="100" cy="125" rx="20" ry="15" fill="#FFCBA4" stroke="#000" stroke-width="2" />

                  <!-- Sunglasses -->
                  <path d="M40 85 L 160 85" stroke="#000" stroke-width="5" />
                  <path d="M50 85 C 50 75, 70 70, 80 85" stroke="#000" stroke-width="4" fill="none" />
                  <path d="M150 85 C 150 75, 130 70, 120 85" stroke="#000" stroke-width="4" fill="none" />
                  
                  <path d="M40 85 Q 55 75 80 85 Q 90 95 100 85 Q 110 95 120 85 Q 145 75 160 85" fill="#000" />
                  
                  <!-- Reflections on glasses -->
                  <path d="M60 80 L 70 83" stroke="#fff" stroke-width="2" />
                  <path d="M130 80 L 140 83" stroke="#fff" stroke-width="2" />
                </svg>
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
                <p>${result.toneAnalysis.overallTone}</p>
                <p class="participants-info">
                  Conversation between <span class="participant-me">${me}</span> and <span class="participant-them">${them}</span>
                </p>
              </div>
            </div>
            
            ${result.healthScore ? `
            <div class="document-section">
              <div class="section-title">Conversation Health</div>
              <div class="health-score">
                <div class="health-score-label">Health Score:</div>
                <div class="health-score-value health-score-${result.healthScore.color}">
                  ${result.healthScore.label} (${Math.min(10, result.healthScore.score)}/10)
                </div>
              </div>
            </div>
            ` : ''}
            
            ${result.redFlagsCount !== undefined ? `
            <div class="document-section">
              <div class="section-title">Red Flags</div>
              <div class="section-content">
                <div class="red-flags-box ${result.redFlagsCount > 0 ? 'has-flags' : 'no-flags'}">
                  <p>
                    <span class="red-flags-count">
                      ${result.redFlagsCount} potential red flag${result.redFlagsCount !== 1 ? 's' : ''}
                    </span> ${result.redFlagsCount === 0 ? 'were' : 'was'} identified in this conversation.
                    ${result.redFlagsCount > 0 ? ' Upgrade to see detailed analysis of each red flag.' : ''}
                  </p>
                </div>
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
              <button id="download-document" class="px-3 py-1 bg-white/20 text-sm rounded mr-2">
                Download
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
      
      // Add download handler
      document.getElementById('download-document')?.addEventListener('click', () => {
        try {
          // Create a blob from the HTML content - this is what makes it downloadable
          const blob = new Blob([formalDocumentContent], { type: 'text/html' });
          
          // Create a downloadable URL
          const url = URL.createObjectURL(blob);
          
          // Create a mobile-friendly download approach
          toast({
            title: "Downloading Report",
            description: "Preparing your Drama Llama analysis report...",
            duration: 2000,
          });
          
          // First try direct download with link click
          const downloadLink = document.createElement('a');
          downloadLink.href = url;
          downloadLink.download = `drama-llama-analysis-${new Date().toISOString().split('T')[0]}.html`;
          downloadLink.style.display = 'none';
          document.body.appendChild(downloadLink);
          
          // This triggers the download in most browsers including mobile
          downloadLink.click();
          
          // Clean up
          setTimeout(() => {
            document.body.removeChild(downloadLink);
            URL.revokeObjectURL(url);
          }, 100);
          
          // Show additional instructions for mobile users
          const mobileInstructions = document.createElement('div');
          mobileInstructions.className = 'fixed inset-0 bg-black/80 flex flex-col items-center justify-center z-[60] p-4';
          
          mobileInstructions.innerHTML = `
            <div class="bg-white rounded-lg w-full max-w-md p-5 flex flex-col">
              <h3 class="text-lg font-bold mb-2 text-center">Download Instructions</h3>
              <p class="text-sm mb-4 text-center">For mobile devices:</p>
              <ol class="text-sm mb-4 ml-5 list-decimal">
                <li class="mb-2">If a download prompt appears, tap "Download"</li>
                <li class="mb-2">If the report opens in a new tab, tap and hold on the page and select "Save" or "Download"</li>
                <li class="mb-2">On some devices, you may need to tap the "..." menu and select "Download"</li>
              </ol>
              <div class="text-sm mb-4 p-3 bg-blue-50 rounded">
                <p class="font-bold">Trouble downloading?</p>
                <p>You can also view the report in the preview window and take screenshots</p>
              </div>
              <button id="close-mobile-instructions" class="px-4 py-2 bg-primary text-white rounded self-center">
                Got it
              </button>
            </div>
          `;
          
          // Add to DOM after a short delay to ensure the download starts first
          setTimeout(() => {
            document.body.appendChild(mobileInstructions);
            
            // Add close handler
            document.getElementById('close-mobile-instructions')?.addEventListener('click', () => {
              document.body.removeChild(mobileInstructions);
            });
          }, 1000);
          
        } catch (err) {
          console.error("Download failed:", err);
          toast({
            title: "Download Failed",
            description: "Please try viewing the document in a browser and saving it manually",
            variant: "destructive",
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
        
        {/* Participant Summary removed from Free Tier */}
        
        {/* Free Tier Health Meter */}
        <div>
          <h4 className="font-medium mb-3">Conversation Health Meter</h4>
          <div className="p-4 bg-muted rounded-lg">
            <div className="flex flex-col items-center mb-4">
              <div className="relative w-full h-12 bg-white border border-gray-200 rounded-full overflow-hidden">
                {/* Tick marks - 20%, 40%, 60%, 80% */}
                <div className="absolute w-0.5 h-3 bg-gray-300 top-[50%] transform -translate-y-1/2 left-[20%]"></div>
                <div className="absolute w-0.5 h-3 bg-gray-300 top-[50%] transform -translate-y-1/2 left-[40%]"></div>
                <div className="absolute w-0.5 h-3 bg-gray-300 top-[50%] transform -translate-y-1/2 left-[60%]"></div>
                <div className="absolute w-0.5 h-3 bg-gray-300 top-[50%] transform -translate-y-1/2 left-[80%]"></div>
                
                {/* Progress bar showing dynamic health score */}
                <div className="absolute h-6 top-[50%] transform -translate-y-1/2 left-0 rounded-full" 
                  style={{
                    width: `${result.healthScore ? Math.min(100, result.healthScore.score) : 50}%`,
                    background: `linear-gradient(to right, 
                      #ef4444 0%, 
                      #f59e0b 40%, 
                      #84cc16 70%, 
                      #22c55e 100%
                    )`
                  }}
                ></div>
              </div>
              
              {/* Meter scale */}
              <div className="flex justify-between items-center w-full text-xs text-gray-500 mt-2 px-2">
                <span>Conflict</span>
                <span>Moderate</span>
                <span>Very Healthy</span>
              </div>
            </div>
            
            {/* Score display */}
            <div className="text-center">
              <div className="text-2xl font-bold mb-1">
                {result.healthScore ? result.healthScore.score : 50}<span className="text-sm font-normal text-gray-500">/100</span>
              </div>
              <p className="text-sm mt-2 text-gray-700">
                {result.healthScore && result.healthScore.score >= 80 ? 'Healthy communication with mutual respect.' :
                  result.healthScore && result.healthScore.score >= 60 ? 'Generally positive with some areas for improvement.' :
                  result.healthScore && result.healthScore.score >= 40 ? 'Moderate to High Tension' :
                  'Significant tension present, needs attention.'}
              </p>
            </div>
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
        
        {/* Red Flags Section */}
        {result.healthScore && (
          <>
            {/* Zero Red Flags - Green success message */}
            {(result.redFlagsCount === 0) && (
              <div className="p-4 bg-green-50 rounded-lg border border-green-100 mb-4">
                <div className="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500 mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <h4 className="text-lg font-medium text-green-700">
                    No Red Flags Detected
                  </h4>
                </div>
                <p className="mt-2 ml-7 text-sm text-green-600">
                  This conversation appears healthy with positive communication patterns.
                </p>
              </div>
            )}
            
            {/* Red Flags Detected - Only shown when health score is below 80 and there are red flags */}
            {(result.healthScore.score < 80 && (result.redFlagsCount !== undefined && result.redFlagsCount > 0)) && (
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
                </div>
                
                {/* Specific pattern indicators based on red flags and health score */}
                <div className="mt-3 mb-3">
                  <ul className="text-sm text-red-600 space-y-1.5">
                    {/* More intelligent detection of communication patterns based on overall tone */}
                    {(() => {
                      // Get the lowercase overall tone for pattern matching
                      const tone = result.toneAnalysis?.overallTone?.toLowerCase() || '';
                      const patterns = result.communication?.patterns || [];
                      const patternsText = patterns.join(' ').toLowerCase();
                      
                      // Create an array to store detected issues
                      const detectedIssues = [];
                      
                      // Check for manipulation patterns
                      if (tone.includes('manipulat') || 
                          tone.includes('control') || 
                          patternsText.includes('manipulat') ||
                          result.healthScore.score < 30) {
                        detectedIssues.push(
                          <li key="manipulation" className="flex items-center">
                            <span className="mr-1.5">•</span> Manipulation patterns detected
                          </li>
                        );
                      }
                      
                      // Check for gaslighting
                      if (tone.includes('gaslight') || 
                          tone.includes('reality distort') || 
                          tone.includes('making you doubt') ||
                          tone.includes('question your reality') ||
                          patternsText.includes('gaslight') ||
                          result.healthScore.score < 35) {
                        detectedIssues.push(
                          <li key="gaslighting" className="flex items-center">
                            <span className="mr-1.5">•</span> Gaslighting behaviors detected
                          </li>
                        );
                      }
                      
                      // Check for passive-aggressive behavior
                      if (tone.includes('passive-aggress') || 
                          tone.includes('passive aggress') ||
                          tone.includes('indirect hostil') ||
                          patternsText.includes('passive') && patternsText.includes('aggress')) {
                        detectedIssues.push(
                          <li key="passive-aggressive" className="flex items-center">
                            <span className="mr-1.5">•</span> Passive-aggressive communication detected
                          </li>
                        );
                      }
                      
                      // Check for love-bombing
                      if (tone.includes('love bomb') || 
                          tone.includes('excessive affection') ||
                          tone.includes('overwhelming attention') ||
                          patternsText.includes('love bomb')) {
                        detectedIssues.push(
                          <li key="love-bombing" className="flex items-center">
                            <span className="mr-1.5">•</span> Love-bombing patterns detected
                          </li>
                        );
                      }
                      
                      // Check for trauma-bonding
                      if (tone.includes('trauma') || 
                          tone.includes('cycle of abuse') ||
                          tone.includes('intermittent reinforcement') ||
                          patternsText.includes('trauma bond')) {
                        detectedIssues.push(
                          <li key="trauma-bonding" className="flex items-center">
                            <span className="mr-1.5">•</span> Trauma-bonding patterns detected
                          </li>
                        );
                      }
                      
                      // Check for victim blaming
                      if (tone.includes('blame') || 
                          tone.includes('fault') ||
                          tone.includes('guilt') && tone.includes('shift') ||
                          tone.includes('responsib') && (tone.includes('deflect') || tone.includes('avoid'))) {
                        detectedIssues.push(
                          <li key="victim-blaming" className="flex items-center">
                            <span className="mr-1.5">•</span> Victim-blaming behaviors detected
                          </li>
                        );
                      }
                      
                      // Check for narcissistic traits
                      if (tone.includes('narciss') || 
                          tone.includes('self-center') ||
                          tone.includes('grandiose') ||
                          tone.includes('entitle') ||
                          patternsText.includes('narciss')) {
                        detectedIssues.push(
                          <li key="narcissism" className="flex items-center">
                            <span className="mr-1.5">•</span> Narcissistic behavior patterns detected
                          </li>
                        );
                      }
                      
                      // Check for parental conflict
                      if (tone.includes('parent') || 
                          tone.includes('child') && tone.includes('conflict') ||
                          tone.includes('custody') ||
                          patternsText.includes('co-parent')) {
                        detectedIssues.push(
                          <li key="parental-conflict" className="flex items-center">
                            <span className="mr-1.5">•</span> Co-parenting conflict detected
                          </li>
                        );
                      }
                      
                      // Check for aggression/hostility/violence
                      if (tone.includes('aggress') || 
                          tone.includes('hostile') || 
                          tone.includes('violen') || 
                          tone.includes('threat') || 
                          tone.includes('abus') ||
                          tone.includes('intimi') ||
                          tone.includes('coerci')) {
                        detectedIssues.push(
                          <li key="aggression" className="flex items-center">
                            <span className="mr-1.5">•</span> Extreme aggression or hostility detected
                          </li>
                        );
                      }
                      
                      // Check for emotional blackmail
                      if (tone.includes('blackmail') || 
                          tone.includes('guilt trip') ||
                          tone.includes('emotional manipulat')) {
                        detectedIssues.push(
                          <li key="emotional-blackmail" className="flex items-center">
                            <span className="mr-1.5">•</span> Emotional blackmail detected
                          </li>
                        );
                      }
                      
                      // Check for power imbalance
                      if (tone.includes('power imbalance') || 
                          tone.includes('control') ||
                          tone.includes('dominat') ||
                          tone.includes('submission') ||
                          tone.includes('coerci')) {
                        detectedIssues.push(
                          <li key="power-imbalance" className="flex items-center">
                            <span className="mr-1.5">•</span> Power imbalance detected
                          </li>
                        );
                      }
                      
                      // If we have too many detected issues, show only the most significant ones
                      // to avoid overwhelming the user with redundant information
                      if (detectedIssues.length > 3) {
                        return detectedIssues.slice(0, 3);
                      }
                      
                      // If we have no detected issues but a poor health score,
                      // show a generic warning based on health score
                      if (detectedIssues.length === 0 && result.healthScore.score < 50) {
                        return [
                          <li key="general-concern" className="flex items-center">
                            <span className="mr-1.5">•</span> Concerning interaction patterns detected
                          </li>
                        ];
                      }
                      
                      return detectedIssues;
                    })()}
                  </ul>
                </div>
                
                <p className="text-sm text-red-600 mb-3">
                  Get detailed insights about these patterns and recommended responses:
                </p>
                
                {/* Upgrade buttons */}
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button 
                    variant="outline" 
                    className="bg-red-100 hover:bg-red-200 text-red-800 border-red-300 flex-1"
                    onClick={() => window.location.href = '/pricing'}
                  >
                    Upgrade Here
                  </Button>
                  <Button 
                    variant="outline"
                    className="bg-purple-100 hover:bg-purple-200 text-purple-800 border-purple-300 flex-1"
                    onClick={() => window.location.href = '/instant-deep-dive'}
                  >
                    One Time Insight
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
        
        {/* Export Buttons */}
        <div className="flex justify-end mb-4">
          <Button
            onClick={exportToPdf}
            disabled={isExporting}
            className="mr-2"
            variant="outline"
          >
            {isExporting ? 'Creating...' : 'Create Formal Report'}
          </Button>
          <Button 
            variant="outline"
            onClick={exportAsImage}
            disabled={isExporting}
          >
            {isExporting ? 'Creating...' : 'View as Image'}
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