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
  
  // Direct PDF download with inline viewer
  const exportToPdf = async () => {
    if (!resultsRef.current || !result) {
      toast({
        title: "PDF Export Failed",
        description: "Could not generate PDF. Please try again.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      setIsExporting(true);
      const element = resultsRef.current;
      
      toast({
        title: "Preparing PDF",
        description: "Please wait while we generate your PDF...",
      });
      
      // Configure html2pdf options - simplified for better mobile compatibility
      const opt = {
        margin: 5,
        filename: `drama-llama-analysis-${new Date().toISOString().split('T')[0]}.pdf`,
        image: { type: 'jpeg', quality: 0.8 },
        html2canvas: { scale: 1.5 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };
      
      try {
        // For mobile compatibility, create an embedded viewer
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black/80 flex flex-col items-center z-50';
        modal.style.overflowY = 'auto';
        
        modal.innerHTML = `
          <div class="bg-white w-full h-full flex flex-col">
            <div class="p-3 flex justify-between items-center bg-gray-100 border-b">
              <h3 class="text-lg font-bold">Your PDF</h3>
              <div class="flex gap-2">
                <button id="download-pdf-directly" class="px-3 py-1 bg-primary text-white text-sm rounded">
                  Download
                </button>
                <button id="close-pdf-viewer" class="px-3 py-1 bg-gray-200 text-sm rounded">
                  Close
                </button>
              </div>
            </div>
            <div id="pdf-loading-message" class="flex-1 flex flex-col items-center justify-center">
              <div class="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
              <p class="mt-4">Generating PDF...</p>
            </div>
            <div id="pdf-container" class="flex-1 w-full" style="display:none;"></div>
          </div>
        `;
        
        document.body.appendChild(modal);
        document.body.style.overflow = 'hidden'; // Prevent background scrolling
        
        // Create PDF directly with loading indicator
        const pdfOutput = await html2pdf().from(element).set(opt).outputPdf();
        
        // Convert to base64 for direct embedding
        const base64PDF = btoa(pdfOutput);
        const dataUri = `data:application/pdf;base64,${base64PDF}`;
        
        // Create download blob for direct save
        const pdfBlob = new Blob([pdfOutput], { type: 'application/pdf' });
        const blobUrl = URL.createObjectURL(pdfBlob);
        
        // Show PDF in viewer
        const pdfContainer = document.getElementById('pdf-container');
        const loadingMessage = document.getElementById('pdf-loading-message');
        
        if (pdfContainer && loadingMessage) {
          loadingMessage.style.display = 'none';
          pdfContainer.style.display = 'block';
          
          // For mobile, show the PDF directly in the container
          pdfContainer.innerHTML = `
            <iframe src="${dataUri}" style="width:100%; height:100%; border:none;"></iframe>
          `;
        }
        
        // Add direct download handler
        document.getElementById('download-pdf-directly')?.addEventListener('click', () => {
          const downloadLink = document.createElement('a');
          downloadLink.href = blobUrl;
          downloadLink.download = `drama-llama-analysis-${new Date().toISOString().split('T')[0]}.pdf`;
          downloadLink.click();
        });
        
        // Add close button handler
        document.getElementById('close-pdf-viewer')?.addEventListener('click', () => {
          document.body.removeChild(modal);
          document.body.style.overflow = ''; // Restore scrolling
          URL.revokeObjectURL(blobUrl);
        });
        
        toast({
          title: "PDF Ready",
          description: "Your PDF is ready to view and download",
          duration: 3000,
        });
        
      } catch (err) {
        console.error("PDF generation error", err);
        toast({
          title: "PDF Generation Failed",
          description: "Trying alternative method...",
        });
        
        // Fallback to traditional save method
        await html2pdf().from(element).set(opt).save();
      }
      
    } catch (error) {
      console.error("PDF export error:", error);
      toast({
        title: "PDF Export Failed",
        description: "Could not generate the PDF. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };
  
  // Mobile View-and-Save Image approach
  const exportAsImage = async () => {
    if (!resultsRef.current || !result) {
      toast({
        title: "Image Export Failed",
        description: "Could not generate image. Please try again.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      setIsExporting(true);
      const element = resultsRef.current;
      
      toast({
        title: "Preparing Image",
        description: "Please wait while we generate your image...",
      });
      
      // Create a JPEG image with mobile-optimized settings
      const dataUrl = await toJpeg(element, { 
        cacheBust: true,
        quality: 0.95,
        backgroundColor: 'white',
        canvasWidth: 1200,
        pixelRatio: 2
      });
      
      // Create a modal that displays the image with instructions
      const modal = document.createElement('div');
      modal.className = 'fixed inset-0 bg-black/80 flex flex-col items-center justify-center z-50 p-4';
      modal.style.overflowY = 'auto';
      
      const currentDate = new Date().toISOString().split('T')[0];
      const filename = `drama-llama-analysis-${currentDate}.jpg`;
      
      modal.innerHTML = `
        <div class="bg-white rounded-lg w-full max-w-md p-4 flex flex-col items-center">
          <h3 class="text-lg font-bold mb-2">Your Image is Ready</h3>
          <p class="text-sm text-center mb-3">On most phones, press and hold the image below, then choose "Save image" or "Download image" from the menu</p>
          <div class="mb-3 w-full bg-gray-100 p-2 rounded">
            <img src="${dataUrl}" alt="Analysis Result" class="w-full border border-gray-300 rounded" />
          </div>
          <div class="flex w-full justify-center">
            <button id="close-image-modal" class="px-4 py-2 bg-gray-200 rounded">Close</button>
          </div>
        </div>
      `;
      
      document.body.appendChild(modal);
      
      // Add event listener to close button
      document.getElementById('close-image-modal')?.addEventListener('click', () => {
        document.body.removeChild(modal);
      });
      
      toast({
        title: "Image Ready",
        description: "Press and hold on the image to save it to your device",
        duration: 10000,
      });
      
    } catch (error) {
      console.error("Image export error:", error);
      toast({
        title: "Image Export Failed",
        description: "Could not generate the image. Please try again.",
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