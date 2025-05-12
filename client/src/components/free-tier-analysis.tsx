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
                <img src="${llamaImage}" alt="Drama Llama Logo" />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" alt="Drama Llama Logo" />
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