import { useState, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Heart, Copy, Download } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ventMessage, DeEscalateResponse, getUserUsage } from "@/lib/openai";
import { useToast } from "@/hooks/use-toast";
import html2pdf from 'html2pdf.js';
import { toJpeg } from 'html-to-image';
import BackHomeButton from "@/components/back-home-button";
import RegistrationPrompt from "@/components/registration-prompt";

export default function VentMode() {
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<DeEscalateResponse | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  
  const resultsRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const { data: usage } = useQuery({
    queryKey: ['/api/user/usage'],
    queryFn: getUserUsage,
  });
  
  const usedAnalyses = usage?.used || 0;
  const limit = usage?.limit || 1;
  // Vent mode should always be available regardless of usage limits
  const canUseFeature = true;

  const ventModeMutation = useMutation({
    mutationFn: (message: string) => ventMessage({ message }),
    onSuccess: (data) => {
      setResult(data);
    },
    onError: (error) => {
      toast({
        title: "Vent Mode Processing Failed",
        description: error.message || "Could not process your message. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleVentMode = () => {
    if (!canUseFeature) {
      toast({
        title: "Usage Limit Reached",
        description: `You've reached your monthly limit. Please upgrade your plan for more analyses.`,
        variant: "destructive",
      });
      return;
    }
    
    if (!message.trim()) {
      toast({
        title: "Empty Message",
        description: "Please enter a message to process.",
        variant: "destructive",
      });
      return;
    }

    // Check minimum length for meaningful processing
    if (message.trim().length < 10) {
      toast({
        title: "Message Too Short",
        description: "Please provide a longer message for better analysis and rewriting.",
        variant: "destructive",
      });
      return;
    }
    
    ventModeMutation.mutate(message.trim());
  };
  
  // Export the de-escalated message as PDF
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
      
      // Configure html2pdf options
      const opt = {
        margin: 10,
        filename: `drama-llama-deescalated-message-${new Date().toISOString().split('T')[0]}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };
      
      // Create PDF
      await html2pdf().from(element).set(opt).save();
      
      toast({
        title: "Export Successful",
        description: "Your de-escalated message has been exported as a PDF.",
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
  
  // Export the de-escalated message as image
  const exportAsImage = async () => {
    if (!resultsRef.current || !result) {
      toast({
        title: "Export Failed",
        description: "Could not generate the image. Please try again.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      setIsExporting(true);
      const element = resultsRef.current;
      
      // Create a JPEG image
      const dataUrl = await toJpeg(element, { quality: 0.9, backgroundColor: 'white' });
      
      // Create a link element to download the image
      const link = document.createElement('a');
      link.download = `drama-llama-deescalated-message-${new Date().toISOString().split('T')[0]}.jpg`;
      link.href = dataUrl;
      link.click();
      
      toast({
        title: "Export Successful",
        description: "Your de-escalated message has been exported as an image.",
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
    <section id="ventMode" className="container py-10">
      <div className="mb-4">
        <BackHomeButton />
      </div>
      <Card>
        <CardContent className="p-6">
          <h2 className="text-2xl font-bold mb-4">Vent Mode</h2>
          
          <p className="mb-6 text-muted-foreground">
            Type the emotional message you want to send, and we'll help you rewrite it in a calmer, more effective way while preserving your intent.
          </p>
          
          <div className="mb-6">
            <Textarea
              placeholder="Example: 'I can't believe you did that! This is so frustrating and I'm really upset about how you handled this situation...'"
              className="w-full h-40 resize-none"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={2000}
            />
            <div className="flex justify-between mt-2 text-xs text-muted-foreground">
              <span>Minimum 10 characters for processing</span>
              <span>{message.length}/2000 characters</span>
            </div>
          </div>
          
          <div className="mb-6 flex gap-3">
            <div className="relative inline-block">
              <Button
                onClick={handleVentMode}
                disabled={ventModeMutation.isPending || message.length < 10 || !canUseFeature}
                variant="default"
                className="flex items-center pr-12 shadow-md rounded-lg"
                style={{ background: 'linear-gradient(90deg, #22C9C9, #FF69B4)', color: 'white' }}
              >
                {ventModeMutation.isPending ? "Processing..." : "Transform Message"}
                <span className="absolute -top-2 -right-2 bg-green-500 text-white text-xs px-2 py-0.5 rounded-full font-bold shadow-lg border border-white">
                  FREE
                </span>
              </Button>
            </div>
            
            {message.length > 0 && (
              <Button
                onClick={() => {
                  setMessage("");
                  setResult(null);
                }}
                variant="outline"
                className="flex items-center gap-2"
                disabled={ventModeMutation.isPending}
              >
                Clear
              </Button>
            )}
          </div>

          {ventModeMutation.isPending && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                <div>
                  <p className="text-blue-800 font-medium">Analyzing your message...</p>
                  <p className="text-blue-600 text-sm">Creating a calmer, more effective version</p>
                </div>
              </div>
            </div>
          )}
          
          {/* Registration prompt moved to bottom */}
          
          {result && (
            <div className="rounded-lg border border-green-200 bg-green-50 p-6 mb-6 slide-in" ref={resultsRef}>
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  <h3 className="font-semibold text-green-800">Your Calmer Message</h3>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs flex items-center gap-1 h-8 border-green-300 text-green-700 hover:bg-green-100"
                  onClick={() => {
                    navigator.clipboard.writeText(result.rewritten);
                    toast({
                      title: "Copied to Clipboard",
                      description: "The calmer version has been copied to your clipboard.",
                    });
                  }}
                >
                  <Copy className="h-3.5 w-3.5 mr-1" />
                  Copy Text
                </Button>
              </div>
              
              <div className="bg-white p-4 rounded-lg border border-green-200 mb-4 shadow-sm">
                <p className="text-gray-800 leading-relaxed">{result.rewritten}</p>
              </div>
              
              <div className="border-t border-green-200 pt-4">
                <h4 className="text-sm font-semibold text-green-800 mb-2 flex items-center gap-2">
                  <Heart className="h-4 w-4 text-green-600" />
                  Why This Works Better
                </h4>
                <p className="text-sm text-green-700 leading-relaxed">
                  {result.explanation}
                </p>
              </div>
            </div>
          )}

          {ventModeMutation.isError && (
            <Alert className="mb-6 border-red-200 bg-red-50">
              <AlertDescription className="text-red-700">
                We encountered an issue processing your message. Please try again or check your internet connection.
              </AlertDescription>
            </Alert>
          )}
          
          <Alert className="bg-gray-50 border border-gray-200 rounded-lg shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full" style={{ background: 'linear-gradient(90deg, #22C9C9, #FF69B4)' }}>
                <Heart className="h-4 w-4 fill-red-500 text-white" />
              </div>
              <AlertDescription className="text-gray-700 font-medium">
                Vent Mode helps transform emotional reactions into constructive communication.
              </AlertDescription>
            </div>
          </Alert>
        </CardContent>
      </Card>
      
      {/* Registration prompt for anonymous/free tier users */}
      {result && usage?.tier === 'free' && (
        <div className="mt-6">
          <RegistrationPrompt tier={usage.tier} />
        </div>
      )}
    </section>
  );
}