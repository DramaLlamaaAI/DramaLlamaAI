import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Upload, ArrowRight, Edit, Brain, Image } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

interface ScreenshotWorkflowProps {
  canUseFeature: boolean;
  onAnalyze: (conversation: string, me: string, them: string) => void;
}

export default function ScreenshotWorkflowSimple({ canUseFeature, onAnalyze }: ScreenshotWorkflowProps) {
  const [currentStep, setCurrentStep] = useState<'upload' | 'extract' | 'edit'>('upload');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [extractedText, setExtractedText] = useState('');
  const [leftParticipant, setLeftParticipant] = useState('');
  const [rightParticipant, setRightParticipant] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const base64 = await fileToBase64(file);
      setSelectedImage(file);
      setImagePreview(base64);
    } catch (error) {
      toast({
        title: "Upload Failed",
        description: "Could not process the image file",
        variant: "destructive",
      });
    }
  };

  const ocrMutation = useMutation({
    mutationFn: async (data: { image: string }) => {
      const response = await apiRequest('POST', '/api/ocr', data);
      return response.json();
    },
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
      
      const isLeftSide = index % 2 === 0;
      const prefix = isLeftSide ? 'Left:' : 'Right:';
      
      formattedLines.push(`${prefix} ${trimmedLine}`);
    });
    
    return formattedLines.join('\n');
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
      
      if (trimmedLine.startsWith('Left:') || trimmedLine.startsWith('Right:')) {
        const isLeftSide = trimmedLine.startsWith('Left:');
        const messageContent = trimmedLine.replace(/^(Left|Right):\s*/, '');
        const speaker = isLeftSide ? leftParticipant : rightParticipant;
        formattedLines.push(`${speaker}: ${messageContent}`);
      } else {
        formattedLines.push(trimmedLine);
      }
    });
    
    return formattedLines.join('\n');
  };

  const handleAnalyze = () => {
    if (!extractedText.trim()) {
      toast({
        title: "No Text Available",
        description: "Please extract text from an image first",
        variant: "destructive",
      });
      return;
    }

    if (!leftParticipant.trim() || !rightParticipant.trim()) {
      toast({
        title: "Missing Participant Names",
        description: "Please enter names for both participants",
        variant: "destructive",
      });
      return;
    }

    const finalConversation = convertToFinalFormat(extractedText);
    onAnalyze(finalConversation, leftParticipant, rightParticipant);
  };

  const resetWorkflow = () => {
    setCurrentStep('upload');
    setSelectedImage(null);
    setImagePreview(null);
    setExtractedText('');
    setLeftParticipant('');
    setRightParticipant('');
    setIsProcessing(false);
  };

  if (currentStep === 'upload') {
    return (
      <div className="space-y-4">
        <div className="text-center mb-6">
          <div className="bg-purple-100 inline-block p-4 mb-3 rounded-full">
            <Image className="h-8 w-8 text-purple-600" />
          </div>
          <h3 className="text-xl font-medium text-purple-700 mb-2">Step 1: Upload Screenshot</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Upload a screenshot of your conversation and we'll extract the text
          </p>
        </div>

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
                Choose Screenshot
              </Button>
              <p className="text-gray-500 text-sm">or drag and drop your image here</p>
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
    );
  }

  if (currentStep === 'extract') {
    return (
      <div className="space-y-4">
        <div className="text-center mb-6">
          <div className="bg-blue-100 inline-block p-4 mb-3 rounded-full">
            <Edit className="h-8 w-8 text-blue-600" />
          </div>
          <h3 className="text-xl font-medium text-blue-700 mb-2">Step 2: Review Extracted Text</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Text has been extracted with Left/Right prefixes. You can edit if needed.
          </p>
        </div>

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
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <div className="bg-green-100 inline-block p-4 mb-3 rounded-full">
          <Brain className="h-8 w-8 text-green-600" />
        </div>
        <h3 className="text-xl font-medium text-green-700 mb-2">Step 3: Confirm Participants</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Tell us which participant's messages appear on each side of the screenshot.
        </p>
      </div>

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

      <div className="mb-6">
        <Label className="block mb-2 font-medium">Preview of conversation with participant names:</Label>
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
    </div>
  );
}