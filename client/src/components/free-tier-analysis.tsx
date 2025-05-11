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
  
  // Simple Direct PDF download - mobile optimized
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
        title: "Creating PDF",
        description: "Please wait while we generate your PDF...",
      });
      
      // Configure html2pdf options - highly simplified for better mobile compatibility
      const opt = {
        margin: 10,
        filename: `drama-llama-analysis-${new Date().toISOString().split('T')[0]}.pdf`,
        image: { type: 'jpeg', quality: 0.8 },
        html2canvas: { scale: 1, logging: false },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };
      
      // Mobile-friendly approach - direct download with reliable method
      const pdfBlob = await html2pdf().from(element).set(opt).outputPdf('blob');
      
      // Create a simple confirmation dialog instead of trying to display PDF
      const modal = document.createElement('div');
      modal.className = 'fixed inset-0 bg-black/80 flex flex-col items-center justify-center z-50 p-4';
      
      modal.innerHTML = `
        <div class="bg-white rounded-lg w-full max-w-sm p-5 flex flex-col items-center text-center">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 text-green-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
          <h3 class="text-lg font-bold mb-2">PDF Created Successfully</h3>
          <p class="text-sm mb-4">Your PDF is ready to download. Click the button below to save it to your device.</p>
          <button id="download-pdf-directly" class="w-full py-2 px-4 bg-primary text-white rounded mb-3">
            Download PDF
          </button>
          <button id="close-pdf-dialog" class="w-full py-2 px-4 bg-gray-200 rounded">
            Cancel
          </button>
        </div>
      `;
      
      document.body.appendChild(modal);
      
      // Create URL for download
      const blobUrl = URL.createObjectURL(pdfBlob);
      
      // Add download handler
      document.getElementById('download-pdf-directly')?.addEventListener('click', () => {
        const downloadLink = document.createElement('a');
        downloadLink.href = blobUrl;
        downloadLink.download = `drama-llama-analysis-${new Date().toISOString().split('T')[0]}.pdf`;
        downloadLink.click();
        
        // On mobile, need to keep the dialog open to allow the download to complete
        toast({
          title: "Download Started",
          description: "Look for the PDF in your downloads folder",
          duration: 5000,
        });
      });
      
      // Add close handler
      document.getElementById('close-pdf-dialog')?.addEventListener('click', () => {
        document.body.removeChild(modal);
        URL.revokeObjectURL(blobUrl);
      });
        
    } catch (error) {
      console.error("PDF export error:", error);
      toast({
        title: "PDF Export Failed",
        description: "Could not generate the PDF. Trying simpler method...",
        variant: "destructive",
      });
      
      // Fallback to traditional save method
      try {
        const opt = {
          margin: 10,
          filename: `drama-llama-analysis-${new Date().toISOString().split('T')[0]}.pdf`,
          image: { type: 'jpeg', quality: 0.7 },
          html2canvas: { scale: 1 },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };
        
        await html2pdf().from(resultsRef.current).set(opt).save();
        
      } catch (fallbackError) {
        console.error("Fallback PDF export also failed:", fallbackError);
        toast({
          title: "Export Failed",
          description: "Please try again or take a screenshot instead.",
          variant: "destructive",
        });
      }
    } finally {
      setIsExporting(false);
    }
  };
  
  // Simplified Mobile-friendly Image download
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
        title: "Creating Image",
        description: "Please wait while we generate your image...",
      });
      
      // Create a JPEG image with mobile-optimized settings
      const dataUrl = await toJpeg(element, { 
        cacheBust: true,
        quality: 0.9,
        backgroundColor: 'white',
        canvasWidth: 1080,
        pixelRatio: 1.5
      });
      
      // Show a simple download dialog
      const modal = document.createElement('div');
      modal.className = 'fixed inset-0 bg-black/80 flex flex-col items-center justify-center z-50 p-4';
      
      modal.innerHTML = `
        <div class="bg-white rounded-lg w-full max-w-sm p-5 flex flex-col items-center text-center">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 text-green-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
          <h3 class="text-lg font-bold mb-2">Image Created Successfully</h3>
          <p class="text-sm mb-4">Your image is ready to download. Click the button below to save it.</p>
          <button id="save-image-directly" class="w-full py-2 px-4 bg-primary text-white rounded mb-3">
            Download Image
          </button>
          <button id="show-image-preview" class="w-full py-2 px-4 bg-secondary text-white rounded mb-3">
            View Image
          </button>
          <button id="close-image-dialog" class="w-full py-2 px-4 bg-gray-200 rounded">
            Cancel
          </button>
        </div>
      `;
      
      document.body.appendChild(modal);
      
      // Direct save when download button is clicked
      document.getElementById('save-image-directly')?.addEventListener('click', () => {
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = `drama-llama-analysis-${new Date().toISOString().split('T')[0]}.jpg`;
        link.click();
        
        toast({
          title: "Download Started",
          description: "Look for the image in your downloads folder",
          duration: 5000,
        });
      });
      
      // Show image in a new window for saving on devices where direct download doesn't work
      document.getElementById('show-image-preview')?.addEventListener('click', () => {
        document.body.removeChild(modal);
        
        // Create fullscreen image modal
        const imageModal = document.createElement('div');
        imageModal.className = 'fixed inset-0 bg-black/95 flex flex-col z-50';
        
        imageModal.innerHTML = `
          <div class="p-3 flex justify-between items-center bg-gray-900 text-white">
            <h3 class="text-lg font-bold">Press and hold image to save</h3>
            <button id="close-image-preview" class="px-3 py-1 bg-gray-700 text-sm rounded">
              Close
            </button>
          </div>
          <div class="flex-1 overflow-auto p-4 flex items-center justify-center">
            <img src="${dataUrl}" alt="Analysis Result" class="max-w-full max-h-full border border-gray-700" />
          </div>
        `;
        
        document.body.appendChild(imageModal);
        
        document.getElementById('close-image-preview')?.addEventListener('click', () => {
          document.body.removeChild(imageModal);
        });
      });
      
      // Add close handler
      document.getElementById('close-image-dialog')?.addEventListener('click', () => {
        document.body.removeChild(modal);
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