import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Image, Brain } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { fileToBase64 } from "@/lib/utils";
import { processImageOcr } from "@/lib/openai";

interface ScreenshotTabProps {
  canUseFeature: boolean;
  onAnalyze: (conversation: string, me: string, them: string) => void;
}

export default function ScreenshotTab({ canUseFeature, onAnalyze }: ScreenshotTabProps) {
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [screenshotMe, setScreenshotMe] = useState("");
  const [screenshotThem, setScreenshotThem] = useState("");
  const [messageOrientation, setMessageOrientation] = useState<"left" | "right">("right");
  const [isProcessing, setIsProcessing] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleScreenshotUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    try {
      const base64 = await fileToBase64(file);
      setSelectedImage(file);
      setImagePreview(base64);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to process screenshot",
        variant: "destructive",
      });
    }
  };

  const handleScreenshotAnalysis = async () => {
    if (!selectedImage || !screenshotMe || !screenshotThem) {
      toast({
        title: "Missing Information", 
        description: "Please upload a screenshot and enter participant names.",
        variant: "destructive",
      });
      return;
    }

    if (!canUseFeature) {
      toast({
        title: "Usage Limit Reached",
        description: "Please upgrade your plan to continue analyzing conversations.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    try {
      const base64 = imagePreview?.split(',')[1];
      if (!base64) throw new Error("Invalid image data");

      // Extract text using OCR
      const ocrResult = await processImageOcr({ image: base64 });
      
      if (!ocrResult.text) {
        throw new Error("No text found in screenshot");
      }

      // Format the conversation based on message orientation
      const formattedConversation = formatScreenshotText(ocrResult.text, screenshotMe, screenshotThem, messageOrientation);
      
      // Call the parent analysis function
      onAnalyze(formattedConversation, screenshotMe, screenshotThem);
    } catch (error) {
      toast({
        title: "Analysis Failed",
        description: error instanceof Error ? error.message : "Failed to analyze screenshot",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const formatScreenshotText = (extractedText: string, me: string, them: string, orientation: "left" | "right"): string => {
    const lines = extractedText.split('\n').filter(line => line.trim());
    let formattedLines: string[] = [];
    
    lines.forEach((line, index) => {
      const trimmedLine = line.trim();
      if (!trimmedLine) return;
      
      // Alternate messages based on orientation
      const isUserMessage = orientation === "right" ? (index % 2 === 1) : (index % 2 === 0);
      const speaker = isUserMessage ? me : them;
      
      formattedLines.push(`${speaker}: ${trimmedLine}`);
    });
    
    return formattedLines.join('\n');
  };

  return (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <div className="bg-purple-100 inline-block p-4 mb-3 rounded-full">
          <Image className="h-8 w-8 text-purple-600" />
        </div>
        <h3 className="text-xl font-medium text-purple-700 mb-2">Screenshot Analysis</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Upload a screenshot of your conversation and let AI extract and analyze the text
        </p>
      </div>

      {/* Participant Name Fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <Label htmlFor="screenshot-me" className="block mb-2 font-medium">Your Name (Me)</Label>
          <Input
            id="screenshot-me"
            placeholder="Enter your name"
            value={screenshotMe}
            onChange={(e) => setScreenshotMe(e.target.value)}
            className="w-full"
          />
        </div>
        <div>
          <Label htmlFor="screenshot-them" className="block mb-2 font-medium">Their Name</Label>
          <Input
            id="screenshot-them"
            placeholder="Enter their name"
            value={screenshotThem}
            onChange={(e) => setScreenshotThem(e.target.value)}
            className="w-full"
          />
        </div>
      </div>

      {/* Message Orientation Selector */}
      <div className="mb-4">
        <Label className="block mb-2 font-medium">Where do your messages appear?</Label>
        <div className="grid grid-cols-2 gap-4">
          <div 
            className={`p-4 border rounded-lg cursor-pointer transition-all ${
              messageOrientation === "left" ? "border-purple-500 bg-purple-50" : "border-gray-200"
            }`}
            onClick={() => setMessageOrientation("left")}
          >
            <div className="flex items-center mb-2">
              <div className="w-3 h-3 rounded-full bg-gray-400 mr-2"></div>
              <span className="text-sm">My messages on left</span>
            </div>
          </div>
          <div 
            className={`p-4 border rounded-lg cursor-pointer transition-all ${
              messageOrientation === "right" ? "border-purple-500 bg-purple-50" : "border-gray-200"
            }`}
            onClick={() => setMessageOrientation("right")}
          >
            <div className="flex items-center mb-2 justify-end">
              <span className="text-sm">My messages on right</span>
              <div className="w-3 h-3 rounded-full bg-blue-400 ml-2"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Screenshot Upload */}
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
        <input
          type="file"
          ref={imageInputRef}
          onChange={handleScreenshotUpload}
          accept="image/*"
          className="hidden"
        />
        
        {!selectedImage ? (
          <div className="text-center">
            <Button
              type="button"
              variant="outline"
              onClick={() => imageInputRef.current?.click()}
              className="mb-2"
            >
              <Image className="h-4 w-4 mr-2" />
              Select Screenshot
            </Button>
            
            <p className="text-xs text-gray-500 mt-2">
              Supports: JPG, PNG, WebP
            </p>
          </div>
        ) : (
          <div>
            <p className="text-sm font-medium text-purple-700 mb-2">
              Screenshot selected: {selectedImage.name}
            </p>
            {imagePreview && (
              <div className="mt-4 mb-4">
                <img 
                  src={imagePreview} 
                  alt="Screenshot preview" 
                  className="max-w-full max-h-64 mx-auto rounded-lg shadow-lg"
                />
              </div>
            )}
            
            <div className="flex gap-2 justify-center">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setSelectedImage(null);
                  setImagePreview(null);
                }}
              >
                Remove
              </Button>
              <Button
                type="button"
                onClick={handleScreenshotAnalysis}
                disabled={!canUseFeature || !screenshotMe || !screenshotThem || isProcessing}
              >
                {isProcessing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Processing...
                  </>
                ) : (
                  <>
                    <Brain className="h-4 w-4 mr-2" />
                    {canUseFeature ? 'Analyze Screenshot' : 'Usage Limit Reached'}
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}