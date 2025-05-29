import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Upload, X, ArrowRight, Camera, FileText, Edit3 } from "lucide-react";

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

  const handleAnalyze = async () => {
    if (!extractedText.trim() || !me.trim() || !them.trim()) {
      toast({
        title: "Missing Information",
        description: "Please ensure you have extracted text and entered both participant names.",
        variant: "destructive",
      });
      return;
    }

    await onAnalyze();
  };

  return (
    <div className="space-y-6">
      {/* Step indicator */}
      <div className="flex items-center justify-center space-x-4 mb-8">
        <div className={`flex items-center space-x-2 ${step === "upload" ? "text-blue-600" : selectedImages.length > 0 ? "text-green-600" : "text-gray-400"}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === "upload" ? "bg-blue-100 border-2 border-blue-600" : selectedImages.length > 0 ? "bg-green-100" : "bg-gray-100"}`}>
            <Camera className="w-4 h-4" />
          </div>
          <span className="font-medium">Upload</span>
        </div>
        <ArrowRight className="w-5 h-5 text-gray-400" />
        <div className={`flex items-center space-x-2 ${step === "extract" ? "text-blue-600" : extractedText ? "text-green-600" : "text-gray-400"}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === "extract" ? "bg-blue-100 border-2 border-blue-600" : extractedText ? "bg-green-100" : "bg-gray-100"}`}>
            <FileText className="w-4 h-4" />
          </div>
          <span className="font-medium">Extract</span>
        </div>
        <ArrowRight className="w-5 h-5 text-gray-400" />
        <div className={`flex items-center space-x-2 ${step === "edit" ? "text-blue-600" : "text-gray-400"}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === "edit" ? "bg-blue-100 border-2 border-blue-600" : "bg-gray-100"}`}>
            <Edit3 className="w-4 h-4" />
          </div>
          <span className="font-medium">Edit & Analyze</span>
        </div>
      </div>

      {/* Step 1: Upload Screenshots */}
      {step === "upload" && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-4">Upload Chat Screenshots</h3>
              <p className="text-gray-600 mb-6">
                Upload screenshots of your conversation. Our AI will extract the text automatically.
              </p>
              
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 hover:border-gray-400 transition-colors">
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={onImageUpload}
                  className="hidden"
                />
                
                <div className="space-y-4">
                  <Upload className="mx-auto h-12 w-12 text-gray-400" />
                  <div>
                    <Button
                      type="button"
                      onClick={() => imageInputRef.current?.click()}
                      className="mb-2"
                    >
                      Choose Screenshots
                    </Button>
                    <p className="text-sm text-gray-500">
                      or drag and drop your images here
                    </p>
                  </div>
                </div>
              </div>

              {/* Show selected images */}
              {imagePreviews.length > 0 && (
                <div className="mt-6">
                  <h4 className="font-medium mb-3">Selected Images ({imagePreviews.length})</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {imagePreviews.map((preview, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={preview}
                          alt={`Screenshot ${index + 1}`}
                          className="w-full h-32 object-cover rounded-lg border"
                        />
                        <button
                          onClick={() => onRemoveImage(index)}
                          className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                  
                  <Button
                    onClick={() => setStep("extract")}
                    className="mt-4"
                    disabled={selectedImages.length === 0}
                  >
                    Continue to Text Extraction
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Extract Text */}
      {step === "extract" && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-4">Extract Text from Screenshots</h3>
              <p className="text-gray-600 mb-6">
                Click the button below to automatically extract text from your screenshots.
              </p>
              
              <Button
                onClick={onExtractText}
                disabled={isProcessing || selectedImages.length === 0}
                className="mb-6"
              >
                {isProcessing ? "Extracting Text..." : "Extract Text from Images"}
              </Button>

              {extractedText && (
                <div className="mt-6">
                  <Label htmlFor="extracted-text" className="text-left block mb-2">
                    Extracted Text (You can edit this if needed)
                  </Label>
                  <Textarea
                    id="extracted-text"
                    value={extractedText}
                    onChange={(e) => onTextChange(e.target.value)}
                    rows={10}
                    className="w-full text-left"
                    placeholder="Extracted text will appear here..."
                  />
                  
                  <Button
                    onClick={() => setStep("edit")}
                    className="mt-4"
                    disabled={!extractedText.trim()}
                  >
                    Continue to Edit & Analyze
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Edit and Analyze */}
      {step === "edit" && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-center">Edit Participants & Analyze</h3>
              
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="me-name">Your Name</Label>
                  <Input
                    id="me-name"
                    value={me}
                    onChange={(e) => onMeChange(e.target.value)}
                    placeholder="Enter your name"
                  />
                </div>
                <div>
                  <Label htmlFor="them-name">Other Person's Name</Label>
                  <Input
                    id="them-name"
                    value={them}
                    onChange={(e) => onThemChange(e.target.value)}
                    placeholder="Enter other person's name"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="final-text">Conversation Text</Label>
                <Textarea
                  id="final-text"
                  value={extractedText}
                  onChange={(e) => onTextChange(e.target.value)}
                  rows={12}
                  className="w-full"
                  placeholder="Edit the conversation text here..."
                />
              </div>

              <div className="flex space-x-4">
                <Button
                  variant="outline"
                  onClick={() => setStep("extract")}
                >
                  Back to Extract
                </Button>
                <Button
                  onClick={handleAnalyze}
                  disabled={isProcessing || !extractedText.trim() || !me.trim() || !them.trim()}
                  className="flex-1"
                >
                  {isProcessing ? "Analyzing..." : "Analyze Conversation"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}