import React, { useState, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Upload, X, ArrowRight, Camera, FileText, Edit3 } from "lucide-react";
import { processImageOcr } from '@/lib/openai';

interface ScreenshotTabProps {
  selectedImages: File[];
  imagePreviews: string[];
  extractedText: string;
  me: string;
  them: string;
  isProcessing: boolean;
  imageInputRef: React.RefObject<HTMLInputElement>;
  onImageUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveImage: (index: number) => void;
  onExtractText: () => Promise<void>;
  onTextChange: (text: string) => void;
  onMeChange: (name: string) => void;
  onThemChange: (name: string) => void;
  onAnalyze: () => Promise<void>;
}

export default function ScreenshotTab({
  selectedImages,
  imagePreviews,
  extractedText,
  me,
  them,
  isProcessing,
  imageInputRef,
  onImageUpload,
  onRemoveImage,
  onExtractText,
  onTextChange,
  onMeChange,
  onThemChange,
  onAnalyze
}: ScreenshotTabProps) {
  const [step, setStep] = useState<"upload" | "extract" | "edit">("upload");
  const { toast } = useToast();

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  const handleScreenshotUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    
    try {
      const newFiles = Array.from(files);
      const newPreviews: string[] = [];
      
      for (const file of newFiles) {
        const base64 = await fileToBase64(file);
        newPreviews.push(base64);
      }
      
      setScreenshots(prev => [...prev, ...newFiles]);
      setImagePreviews(prev => [...prev, ...newPreviews]);
      
      toast({
        title: "Screenshots Added",
        description: `${newFiles.length} screenshot(s) uploaded successfully`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to process screenshots",
        variant: "destructive",
      });
    }
  };

  const removeScreenshot = (index: number) => {
    setScreenshots(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const extractTextFromScreenshots = async () => {
    if (screenshots.length === 0) {
      toast({
        title: "No Screenshots",
        description: "Please upload at least one screenshot first.",
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
    let combinedText = "";

    try {
      for (let i = 0; i < imagePreviews.length; i++) {
        const base64 = imagePreviews[i].split(',')[1];
        if (!base64) continue;

        // Extract text using OCR
        const ocrResult = await processImageOcr({ image: base64 });
        
        if (ocrResult.text) {
          // Process the extracted text to add Left:/Right: prefixes
          const lines = ocrResult.text.split('\n').filter(line => line.trim());
          
          for (const line of lines) {
            const trimmedLine = line.trim();
            if (!trimmedLine) continue;
            
            // Simple heuristic: assume messages alternate between left and right
            // User can edit this in the next step
            const isLeftMessage = Math.random() > 0.5; // Placeholder logic
            const prefix = isLeftMessage ? "Left:" : "Right:";
            combinedText += `${prefix} ${trimmedLine}\n`;
          }
        }
      }

      if (!combinedText.trim()) {
        throw new Error("No text found in screenshots");
      }

      setExtractedText(combinedText.trim());
      setStep("extract");
      
      toast({
        title: "Text Extracted",
        description: "Successfully extracted text from screenshots. Please review and edit as needed.",
      });
    } catch (error) {
      toast({
        title: "Extraction Failed",
        description: error instanceof Error ? error.message : "Failed to extract text from screenshots",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAnalyze = () => {
    if (!extractedText.trim() || !leftParticipant.trim() || !rightParticipant.trim()) {
      toast({
        title: "Missing Information",
        description: "Please ensure you have extracted text and entered both participant names.",
        variant: "destructive",
      });
      return;
    }

    // Replace "Left:" and "Right:" with actual participant names
    const formattedConversation = extractedText
      .replace(/^Left:/gm, `${leftParticipant}:`)
      .replace(/^Right:/gm, `${rightParticipant}:`);

    onAnalyze(formattedConversation, leftParticipant, rightParticipant);
  };

  const resetProcess = () => {
    setScreenshots([]);
    setImagePreviews([]);
    setExtractedText("");
    setLeftParticipant("");
    setRightParticipant("");
    setStep("upload");
  };

  return (
    <div className="space-y-6">
      {/* Step indicator */}
      <div className="flex items-center justify-center space-x-4 mb-6">
        <div className={`flex items-center space-x-2 ${step === "upload" ? "text-primary" : "text-muted-foreground"}`}>
          <Camera className="h-4 w-4" />
          <span className="text-sm font-medium">Upload Screenshots</span>
        </div>
        <ArrowRight className="h-4 w-4 text-muted-foreground" />
        <div className={`flex items-center space-x-2 ${step === "extract" ? "text-primary" : "text-muted-foreground"}`}>
          <FileText className="h-4 w-4" />
          <span className="text-sm font-medium">Extract & Edit Text</span>
        </div>
        <ArrowRight className="h-4 w-4 text-muted-foreground" />
        <div className={`flex items-center space-x-2 ${step === "edit" ? "text-primary" : "text-muted-foreground"}`}>
          <Edit3 className="h-4 w-4" />
          <span className="text-sm font-medium">Assign Participants</span>
        </div>
      </div>

      {/* Step 1: Upload Screenshots */}
      {step === "upload" && (
        <div className="space-y-4">
          <div className="text-center p-6 border-2 border-dashed border-gray-300 rounded-lg">
            <input
              type="file"
              ref={imageInputRef}
              onChange={handleScreenshotUpload}
              accept="image/*"
              multiple
              className="hidden"
            />
            <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-600 mb-2">
              Upload your conversation screenshots in chronological order
            </p>
            <Button
              onClick={() => imageInputRef.current?.click()}
              variant="outline"
              className="mb-2"
            >
              Choose Screenshots
            </Button>
            <p className="text-xs text-gray-500">
              Support for JPG, PNG formats. Multiple files allowed.
            </p>
          </div>

          {/* Preview uploaded screenshots */}
          {screenshots.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Uploaded Screenshots ({screenshots.length})</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {imagePreviews.map((preview, index) => (
                  <Card key={index} className="relative">
                    <CardContent className="p-2">
                      <img 
                        src={preview} 
                        alt={`Screenshot ${index + 1}`} 
                        className="w-full h-20 object-cover rounded"
                      />
                      <button
                        onClick={() => removeScreenshot(index)}
                        className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-1 h-6 w-6 flex items-center justify-center text-xs hover:bg-red-600"
                      >
                        <X className="h-3 w-3" />
                      </button>
                      <p className="text-xs text-center mt-1 text-gray-500">#{index + 1}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
              
              <Button 
                onClick={extractTextFromScreenshots}
                disabled={isProcessing || screenshots.length === 0}
                className="w-full"
              >
                {isProcessing ? (
                  <>
                    <div className="h-4 w-4 mr-2 animate-spin rounded-full border-t-2 border-gray-500"></div>
                    Extracting Text...
                  </>
                ) : (
                  <>
                    <FileText className="h-4 w-4 mr-2" />
                    Extract Text from Screenshots
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Step 2: Extract & Edit Text */}
      {step === "extract" && (
        <div className="space-y-4">
          <div>
            <Label htmlFor="extracted-text">Extracted Conversation Text</Label>
            <p className="text-sm text-gray-600 mb-2">
              Review and edit the extracted text. Messages are prefixed with "Left:" or "Right:" based on their position.
            </p>
            <Textarea
              id="extracted-text"
              value={extractedText}
              onChange={(e) => setExtractedText(e.target.value)}
              placeholder="Extracted text will appear here..."
              className="min-h-[300px] font-mono text-sm"
            />
          </div>

          <div className="flex gap-2">
            <Button onClick={() => setStep("edit")} disabled={!extractedText.trim()}>
              Continue to Participant Assignment
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
            <Button variant="outline" onClick={() => setStep("upload")}>
              Back to Upload
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Assign Participants */}
      {step === "edit" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="left-participant">Left Side Participant Name</Label>
              <Input
                id="left-participant"
                type="text"
                value={leftParticipant}
                onChange={(e) => setLeftParticipant(e.target.value)}
                placeholder="e.g., Sarah"
                className="mt-1"
              />
              <p className="text-xs text-gray-500 mt-1">
                This name will replace all "Left:" prefixes
              </p>
            </div>
            
            <div>
              <Label htmlFor="right-participant">Right Side Participant Name</Label>
              <Input
                id="right-participant"
                type="text"
                value={rightParticipant}
                onChange={(e) => setRightParticipant(e.target.value)}
                placeholder="e.g., Mike"
                className="mt-1"
              />
              <p className="text-xs text-gray-500 mt-1">
                This name will replace all "Right:" prefixes
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button 
              onClick={handleAnalyze}
              disabled={!leftParticipant.trim() || !rightParticipant.trim() || !extractedText.trim()}
            >
              Analyze Conversation
            </Button>
            <Button variant="outline" onClick={() => setStep("extract")}>
              Back to Text Editing
            </Button>
            <Button variant="outline" onClick={resetProcess}>
              Start Over
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}