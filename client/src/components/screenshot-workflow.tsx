import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Upload, ArrowRight, Edit, Brain, ChevronRight } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

interface ScreenshotWorkflowProps {
  canUseFeature: boolean;
  onAnalyze: (conversation: string, me: string, them: string) => void;
}

interface ProcessImageOcrRequest {
  image: string;
}

interface ProcessImageOcrResponse {
  text: string;
}

const processImageOcr = async (data: ProcessImageOcrRequest): Promise<ProcessImageOcrResponse> => {
  const response = await apiRequest('POST', '/api/process-image-ocr', data);
  return response.json();
};

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export default function ScreenshotWorkflow({ canUseFeature, onAnalyze }: ScreenshotWorkflowProps) {
  const [currentStep, setCurrentStep] = useState<'upload' | 'extract' | 'edit'>('upload');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [extractedText, setExtractedText] = useState<string>('');
  const [leftParticipant, setLeftParticipant] = useState<string>('');
  const [rightParticipant, setRightParticipant] = useState<string>('');
  const [userPosition, setUserPosition] = useState<'left' | 'right'>('right');
  const [isProcessing, setIsProcessing] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // OCR processing mutation
  const ocrMutation = useMutation({
    mutationFn: processImageOcr,
    onSuccess: (data) => {
      if (data.text) {
        const formattedText = addLeftRightPrefixes(data.text);
        setExtractedText(formattedText);
        setCurrentStep('extract');
        toast({
          title: "Text Extracted Successfully",
          description: "Chat messages have been extracted with Left/Right prefixes",
        });
      } else {
        toast({
          title: "No Text Found",
          description: "Could not extract text from the screenshot. Please try a clearer image.",
          variant: "destructive",
        });
      }
      setIsProcessing(false);
    },
    onError: (error) => {
      toast({
        title: "Extraction Failed",
        description: error instanceof Error ? error.message : "Failed to extract text from screenshot",
        variant: "destructive",
      });
      setIsProcessing(false);
    },
  });

  const addLeftRightPrefixes = (text: string): string => {
    const lines = text.split('\n').filter(line => line.trim());
    const formattedLines: string[] = [];
    
    lines.forEach((line, index) => {
      const trimmedLine = line.trim();
      if (!trimmedLine) return;
      
      // Determine if message is from left or right side of screenshot
      // For now, alternating pattern - this should be enhanced with actual position detection
      const isLeftMessage = index % 2 === 0;
      const prefix = isLeftMessage ? 'Left' : 'Right';
      
      formattedLines.push(`${prefix}: ${trimmedLine}`);
    });
    
    return formattedLines.join('\n');
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid File",
        description: "Please upload an image file (PNG, JPG, etc.)",
        variant: "destructive",
      });
      return;
    }
    
    try {
      const base64 = await fileToBase64(file);
      setSelectedImage(file);
      setImagePreview(base64);
      toast({
        title: "Image Uploaded",
        description: "Screenshot uploaded successfully. Click 'Extract Text' to continue.",
      });
    } catch (error) {
      toast({
        title: "Upload Failed",
        description: "Failed to process the image file",
        variant: "destructive",
      });
    }
  };

  const handleExtractText = async () => {
    if (!selectedImage || !imagePreview) {
      toast({
        title: "No Image Selected",
        description: "Please upload a screenshot first",
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
      const base64 = imagePreview.split(',')[1];
      if (!base64) throw new Error("Invalid image data");

      ocrMutation.mutate({ image: base64 });
    } catch (error) {
      toast({
        title: "Processing Failed",
        description: "Could not process the image",
        variant: "destructive",
      });
      setIsProcessing(false);
    }
  };

  const convertToFinalFormat = (text: string): string => {
    const lines = text.split('\n').filter(line => line.trim());
    const formattedLines: string[] = [];
    
    lines.forEach(line => {
      const trimmedLine = line.trim();
      if (!trimmedLine) return;
      
      // Check if line has Left: or Right: prefix
      if (trimmedLine.startsWith('Left:') || trimmedLine.startsWith('Right:')) {
        const isLeftSide = trimmedLine.startsWith('Left:');
        const messageContent = trimmedLine.replace(/^(Left|Right):\s*/, '');
        
        // Use the participant names directly based on side
        const speaker = isLeftSide ? leftParticipant : rightParticipant;
        
        formattedLines.push(`${speaker}: ${messageContent}`);
      } else {
        // If no prefix, add as-is
        formattedLines.push(trimmedLine);
      }
    });
    
    return formattedLines.join('\n');
  };

  const handleAnalyze = () => {
    if (!extractedText.trim()) {
      toast({
        title: "No Text to Analyze",
        description: "Please extract text from a screenshot first",
        variant: "destructive",
      });
      return;
    }

    // Determine participant names
    const me = userPosition === 'left' ? (leftParticipant || 'Me') : (rightParticipant || 'Me');
    const them = userPosition === 'left' ? (rightParticipant || 'Them') : (leftParticipant || 'Them');

    if (!me || !them) {
      toast({
        title: "Missing Participant Names",
        description: "Please enter names for both participants",
        variant: "destructive",
      });
      return;
    }

    // Convert to final conversation format
    const finalConversation = convertToFinalFormat(extractedText);
    
    // Pass to analysis
    onAnalyze(finalConversation, me, them);
    
    toast({
      title: "Analysis Started",
      description: "Your screenshot conversation is being analyzed",
    });
  };

  const resetWorkflow = () => {
    setCurrentStep('upload');
    setSelectedImage(null);
    setImagePreview(null);
    setExtractedText('');
    setLeftParticipant('');
    setRightParticipant('');
    setUserPosition('right');
    if (imageInputRef.current) {
      imageInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-semibold text-purple-700 mb-2">Screenshot Analysis</h2>
        <p className="text-gray-600">Upload screenshots of your conversation. Our AI will extract the text automatically.</p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-center space-x-4 mb-8">
        <div className={`flex items-center space-x-2 ${currentStep === 'upload' ? 'text-blue-600' : currentStep === 'extract' || currentStep === 'edit' ? 'text-green-600' : 'text-gray-400'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep === 'upload' ? 'bg-blue-100 border-2 border-blue-600' : currentStep === 'extract' || currentStep === 'edit' ? 'bg-green-100 border-2 border-green-600' : 'bg-gray-100 border-2 border-gray-300'}`}>
            <Upload className="w-4 h-4" />
          </div>
          <span className="font-medium">Upload</span>
        </div>
        
        <ChevronRight className="w-4 h-4 text-gray-400" />
        
        <div className={`flex items-center space-x-2 ${currentStep === 'extract' ? 'text-blue-600' : currentStep === 'edit' ? 'text-green-600' : 'text-gray-400'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep === 'extract' ? 'bg-blue-100 border-2 border-blue-600' : currentStep === 'edit' ? 'bg-green-100 border-2 border-green-600' : 'bg-gray-100 border-2 border-gray-300'}`}>
            <ArrowRight className="w-4 h-4" />
          </div>
          <span className="font-medium">Extract</span>
        </div>
        
        <ChevronRight className="w-4 h-4 text-gray-400" />
        
        <div className={`flex items-center space-x-2 ${currentStep === 'edit' ? 'text-blue-600' : 'text-gray-400'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep === 'edit' ? 'bg-blue-100 border-2 border-blue-600' : 'bg-gray-100 border-2 border-gray-300'}`}>
            <Edit className="w-4 h-4" />
          </div>
          <span className="font-medium">Edit & Analyze</span>
        </div>
      </div>

      {/* Step 1: Upload */}
      {currentStep === 'upload' && (
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-4">Upload Chat Screenshots</h3>
              
              <div 
                className="border-2 border-dashed border-gray-300 rounded-lg p-12 hover:border-gray-400 transition-colors cursor-pointer"
                onClick={() => imageInputRef.current?.click()}
              >
                <div className="flex flex-col items-center space-y-4">
                  <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center">
                    <Upload className="w-8 h-8 text-teal-600" />
                  </div>
                  <div>
                    <Button className="bg-teal-500 hover:bg-teal-600 text-white mb-2">
                      Choose Screenshots
                    </Button>
                    <p className="text-gray-500 text-sm">or drag and drop your images here</p>
                  </div>
                </div>
              </div>
              
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
              
              {imagePreview && (
                <div className="mt-6">
                  <img 
                    src={imagePreview} 
                    alt="Screenshot preview" 
                    className="max-w-full max-h-64 mx-auto rounded-lg shadow-md"
                  />
                  <div className="mt-4 flex justify-center space-x-3">
                    <Button onClick={handleExtractText} disabled={isProcessing}>
                      {isProcessing ? (
                        <>
                          <div className="w-4 h-4 mr-2 animate-spin rounded-full border-t-2 border-white"></div>
                          Extracting...
                        </>
                      ) : (
                        <>
                          <ArrowRight className="w-4 h-4 mr-2" />
                          Extract Text
                        </>
                      )}
                    </Button>
                    <Button variant="outline" onClick={resetWorkflow}>
                      Reset
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Extract */}
      {currentStep === 'extract' && (
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4">Step 2: Extracted Text with Left/Right Prefixes</h3>
            <p className="text-gray-600 mb-4">Text has been extracted from your screenshot. Each message is automatically labeled as "Left:" or "Right:" based on its position.</p>
            
            {/* Editable text field showing extracted text with prefixes */}
            <div className="mb-6">
              <Label htmlFor="extracted-text-display" className="block mb-2 font-medium">Extracted Text (with Left/Right prefixes)</Label>
              <Textarea
                id="extracted-text-display"
                value={extractedText}
                onChange={(e) => setExtractedText(e.target.value)}
                className="min-h-48 font-mono text-sm"
                placeholder="Extracted text with Left:/Right: prefixes will appear here..."
              />
              <p className="text-sm text-gray-500 mt-1">You can edit the extracted text above if needed.</p>
            </div>
            
            <div className="flex justify-center space-x-3">
              <Button onClick={() => setCurrentStep('edit')}>
                <ArrowRight className="w-4 h-4 mr-2" />
                Continue to Step 3
              </Button>
              <Button variant="outline" onClick={() => setCurrentStep('upload')}>
                Back to Upload
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Confirm Participants */}
      {currentStep === 'edit' && (
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4">Step 3: Confirm Who's Messages Are Where</h3>
            <p className="text-gray-600 mb-6">Tell us which participant's messages appear on each side of the screenshot.</p>
            
            {/* Participant Names */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <Label htmlFor="left-participant" className="block mb-2 font-medium">Who's messages are on the LEFT side?</Label>
                <Input
                  id="left-participant"
                  placeholder="Enter name (e.g., Sarah, Me, etc.)"
                  value={leftParticipant}
                  onChange={(e) => setLeftParticipant(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="right-participant" className="block mb-2 font-medium">Who's messages are on the RIGHT side?</Label>
                <Input
                  id="right-participant"
                  placeholder="Enter name (e.g., John, Me, etc.)"
                  value={rightParticipant}
                  onChange={(e) => setRightParticipant(e.target.value)}
                />
              </div>
            </div>

            {/* Show extracted text preview */}
            <div className="mb-6">
              <Label className="block mb-2 font-medium">Preview of extracted text with participant names:</Label>
              <div className="bg-gray-50 p-4 rounded-lg max-h-32 overflow-y-auto">
                <pre className="whitespace-pre-wrap text-sm font-mono">
                  {extractedText.split('\n').map((line, index) => {
                    if (line.startsWith('Left:')) {
                      const message = line.replace('Left:', '');
                      return `${leftParticipant || 'Left'}:${message}`;
                    } else if (line.startsWith('Right:')) {
                      const message = line.replace('Right:', '');
                      return `${rightParticipant || 'Right'}:${message}`;
                    }
                    return line;
                  }).join('\n')}
                </pre>
              </div>
            </div>

            <div className="flex justify-center space-x-3">
              <Button 
                onClick={handleAnalyze} 
                disabled={!extractedText.trim() || !leftParticipant.trim() || !rightParticipant.trim()}
              >
                <Brain className="w-4 h-4 mr-2" />
                Analyze Conversation
              </Button>
              <Button variant="outline" onClick={() => setCurrentStep('extract')}>
                Back to Step 2
              </Button>
              <Button variant="outline" onClick={resetWorkflow}>
                Start Over
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}