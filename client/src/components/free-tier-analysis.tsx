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
  
  // Create and show download dialog for PDF file 
  const exportToPdf = async () => {
    if (!resultsRef.current || !result) {
      toast({
        title: "Export Failed",
        description: "Could not generate PDF. Please try again.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      setIsExporting(true);
      const element = resultsRef.current;
      
      // Show a toast to confirm the process has started
      toast({
        title: "Creating PDF",
        description: "Please wait while we generate your PDF...",
      });
      
      // Configure html2pdf options
      const opt = {
        margin: 10,
        filename: `drama-llama-analysis-${new Date().toISOString().split('T')[0]}.pdf`,
        image: { type: 'jpeg', quality: 0.95 },
        html2canvas: { 
          scale: 2, 
          useCORS: true,
          allowTaint: true
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };
      
      // Create a download dialog container
      let downloadDialog = document.createElement('div');
      downloadDialog.className = 'fixed inset-0 bg-black/50 flex items-center justify-center z-50';
      
      // Get PDF as blob for direct download link
      const pdfBlob = await html2pdf().from(element).set(opt).outputPdf('blob');
      const blobUrl = URL.createObjectURL(pdfBlob);
      
      // Create the dialog content with a button instead of a link
      downloadDialog.innerHTML = `
        <div class="bg-white rounded-lg p-6 max-w-sm mx-auto">
          <h3 class="text-lg font-bold mb-4">Your PDF is Ready!</h3>
          <p class="mb-4">Tap the button below to download your analysis as a PDF file.</p>
          <div class="flex justify-center">
            <button 
              id="download-pdf-button"
              class="bg-primary text-white font-medium py-2 px-4 rounded hover:bg-primary/90"
            >
              Download PDF
            </button>
          </div>
          <button id="close-dialog" class="mt-4 w-full text-gray-500">Close</button>
        </div>
      `;
      
      // Add to document
      document.body.appendChild(downloadDialog);
      
      // Create an actual download function
      const triggerDownload = () => {
        // Create an invisible link element
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = `drama-llama-analysis-${new Date().toISOString().split('T')[0]}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Show download success message
        toast({
          title: "Download Started",
          description: "Your PDF is downloading now. Check your Downloads folder.",
        });
      };
      
      // Add click handlers
      document.getElementById('download-pdf-button')?.addEventListener('click', triggerDownload);
      document.getElementById('close-dialog')?.addEventListener('click', () => {
        document.body.removeChild(downloadDialog);
        URL.revokeObjectURL(blobUrl);
      });
      
      toast({
        title: "PDF Ready",
        description: "Tap the download button in the popup.",
      });
    } catch (error) {
      console.error("PDF export error:", error);
      toast({
        title: "Export Failed",
        description: "Could not generate the PDF. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };
  
  // Create and show download dialog for image file
  const exportAsImage = async () => {
    if (!resultsRef.current || !result) {
      toast({
        title: "Export Failed",
        description: "Could not generate image. Please try again.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      setIsExporting(true);
      const element = resultsRef.current;
      
      // Show a toast to confirm the process has started
      toast({
        title: "Creating Image",
        description: "Please wait while we generate your image...",
      });
      
      // Create a JPEG image with optimized settings
      const dataUrl = await toJpeg(element, { 
        cacheBust: true,
        quality: 0.92,
        backgroundColor: 'white',
        canvasWidth: 1080,
        pixelRatio: 2
      });
      
      // Create a download dialog container
      let downloadDialog = document.createElement('div');
      downloadDialog.className = 'fixed inset-0 bg-black/50 flex items-center justify-center z-50';
      
      // Create the dialog content with a button instead of a link
      downloadDialog.innerHTML = `
        <div class="bg-white rounded-lg p-6 max-w-sm mx-auto">
          <h3 class="text-lg font-bold mb-4">Your Image is Ready!</h3>
          <p class="mb-4">Tap the button below to download your analysis as an image.</p>
          <div class="flex justify-center">
            <button 
              id="download-image-button"
              class="bg-primary text-white font-medium py-2 px-4 rounded hover:bg-primary/90"
            >
              Download Image
            </button>
          </div>
          <button id="close-dialog" class="mt-4 w-full text-gray-500">Close</button>
        </div>
      `;
      
      // Add to document
      document.body.appendChild(downloadDialog);
      
      // Create an actual download function
      const triggerImageDownload = () => {
        // Create an invisible link element
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = `drama-llama-analysis-${new Date().toISOString().split('T')[0]}.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Show download success message
        toast({
          title: "Download Started",
          description: "Your image is downloading now. Check your Downloads folder.",
        });
      };
      
      // Add click handlers
      document.getElementById('download-image-button')?.addEventListener('click', triggerImageDownload);
      document.getElementById('close-dialog')?.addEventListener('click', () => {
        document.body.removeChild(downloadDialog);
      });
      
      toast({
        title: "Image Ready",
        description: "Tap the download button in the popup.",
      });
      
    } catch (error) {
      console.error("Image export error:", error);
      toast({
        title: "Export Failed",
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
            {isExporting ? 'Exporting...' : 'Export as PDF'}
          </Button>
          <Button 
            variant="outline"
            onClick={exportAsImage}
            disabled={isExporting}
          >
            {isExporting ? 'Exporting...' : 'Export as Image'}
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