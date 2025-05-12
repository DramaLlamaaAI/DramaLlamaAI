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
      
      // Render our formal document component to string with simplified elements for PDF export
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
              font-size: 24px;
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
              <div class="text-logo">
                <span style="font-weight:bold; font-size:24px; color:#FF69B4;">Drama</span><span style="font-weight:bold; font-size:24px; color:#22C9C9;">Llama</span>
              </div>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" alt="Drama Llama Logo" width="100" />
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
                <div class="tone-analysis-box">
                  <p>${result.toneAnalysis.overallTone}</p>
                </div>
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
              <p><strong>This analysis was generated by Drama Llama AI</strong></p>
              <p>Results should be interpreted as general guidance only and not as professional advice.</p>
              <p>© ${new Date().getFullYear()} Drama Llama AI</p>
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
          <div class="p-3 flex justify-between items-center bg-[#22C9C9] text-white">
            <h3 class="text-lg font-bold">Drama Llama Analysis</h3>
            <div class="flex items-center">
              <button id="download-document" class="px-3 py-1 bg-white/20 hover:bg-white/30 text-sm rounded mr-2 transition-colors">
                Download
              </button>
              <button id="close-document-preview" class="px-3 py-1 bg-white/20 hover:bg-white/30 text-sm rounded transition-colors">
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
              <div class="border-b-2 border-[#22C9C9] pb-2 mb-4">
                <h3 class="text-lg font-bold mb-2 text-center text-[#22C9C9]">Download Instructions</h3>
                <p class="text-sm text-center">For mobile devices:</p>
              </div>
              <ol class="text-sm mb-4 ml-5 list-decimal">
                <li class="mb-2">If a download prompt appears, tap "Download"</li>
                <li class="mb-2">If the report opens in a new tab, tap and hold on the page and select "Save" or "Download"</li>
                <li class="mb-2">On some devices, you may need to tap the "..." menu and select "Download"</li>
              </ol>
              <div class="text-sm mb-4 p-3 bg-[#f0f8ff] rounded border-l-4 border-[#22C9C9]">
                <p class="font-bold">Trouble downloading?</p>
                <p>You can also view the report in the preview window and take screenshots</p>
              </div>
              <button id="close-mobile-instructions" class="px-4 py-2 bg-[#22C9C9] text-white rounded self-center hover:bg-[#1baeae] transition-colors">
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