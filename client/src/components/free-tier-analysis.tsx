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
                <img src="data:image/jpeg;base64,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" alt="Drama Llama Logo" />
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
                  ${result.healthScore.label} (${Math.min(10, result.healthScore.score)}/10)
                </div>
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