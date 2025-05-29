import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Image, Upload, X, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';
import ScreenshotTab from './screenshot-tab';

interface ScreenshotAnalysisProps {
  user: any;
  selectedTier: string;
  deviceId: string;
}

export default function ScreenshotAnalysis({ user, selectedTier, deviceId }: ScreenshotAnalysisProps) {
  const [me, setMe] = useState('');
  const [them, setThem] = useState('');
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [extractedText, setExtractedText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [showResults, setShowResults] = useState(false);
  const [conversation, setConversation] = useState('');
  const imageInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    if (selectedImages.length + files.length > 10) {
      toast({
        title: "Too many images",
        description: "You can only upload up to 10 screenshots at once.",
        variant: "destructive",
      });
      return;
    }

    setSelectedImages(prev => [...prev, ...files]);
    
    // Create previews
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreviews(prev => [...prev, e.target?.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemoveImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleExtractText = async () => {
    if (selectedImages.length === 0) {
      toast({
        title: "No images selected",
        description: "Please select at least one screenshot to extract text.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    try {
      let combinedText = '';
      
      // Process each image individually using OCR
      for (let i = 0; i < selectedImages.length; i++) {
        const image = selectedImages[i];
        
        // Convert image to base64 with media type
        const { base64Data, mediaType } = await new Promise<{base64Data: string, mediaType: string}>((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            const result = e.target?.result as string;
            // Extract media type and base64 data
            const [header, base64] = result.split(',');
            const mediaType = header.match(/data:([^;]+)/)?.[1] || 'image/jpeg';
            resolve({ base64Data: base64, mediaType });
          };
          reader.readAsDataURL(image);
        });

        // Send to OCR endpoint
        const response = await fetch('/api/ocr', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            image: base64Data,
            mediaType: mediaType 
          }),
        });

        if (!response.ok) {
          throw new Error(`Failed to extract text from image ${i + 1}`);
        }

        const data = await response.json();
        if (data.text) {
          combinedText += data.text + '\n\n';
        }
      }

      setExtractedText(combinedText.trim());
      
      // Auto-detect participant assignments if prefixes are present
      const hasLeftRight = combinedText.includes('Left:') || combinedText.includes('Right:');
      if (hasLeftRight) {
        setMe('Left Person');
        setThem('Right Person');
        toast({
          title: "Text extracted with positioning",
          description: "Participant positions detected automatically. You can edit the names as needed.",
        });
      } else {
        toast({
          title: "Text extracted successfully",
          description: "You can now edit the text and assign participant names.",
        });
      }
    } catch (error) {
      console.error('Text extraction error:', error);
      toast({
        title: "Extraction failed",
        description: "Unable to extract text from the screenshots. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAnalyze = async () => {
    if (!extractedText.trim() || !me.trim() || !them.trim()) {
      toast({
        title: "Missing information",
        description: "Please ensure you have extracted text and provided participant names.",
        variant: "destructive",
      });
      return;
    }

    // Replace Left: and Right: with actual participant names
    const finalConversation = extractedText
      .replace(/Left:/g, `${me}:`)
      .replace(/Right:/g, `${them}:`);

    setConversation(finalConversation);
    setIsProcessing(true);

    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      if (!user) {
        headers['X-Device-ID'] = deviceId;
      }

      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          conversation: finalConversation,
          me: me.trim(),
          them: them.trim(),
          tier: selectedTier,
          deviceId: user ? undefined : deviceId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Analysis failed');
      }

      const analysisResult = await response.json();
      setResult(analysisResult);
      setShowResults(true);

      toast({
        title: "Analysis complete",
        description: "Your conversation has been analyzed successfully!",
      });
    } catch (error: any) {
      console.error('Analysis error:', error);
      toast({
        title: "Analysis failed",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {!showResults ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-purple-700">Screenshot Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <ScreenshotTab
              selectedImages={selectedImages}
              imagePreviews={imagePreviews}
              extractedText={extractedText}
              me={me}
              them={them}
              isProcessing={isProcessing}
              imageInputRef={imageInputRef}
              onImageUpload={handleImageUpload}
              onRemoveImage={handleRemoveImage}
              onExtractText={handleExtractText}
              onTextChange={setExtractedText}
              onMeChange={setMe}
              onThemChange={setThem}
              onAnalyze={handleAnalyze}
            />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Results display */}
          {result && (
            <Card>
              <CardHeader>
                <CardTitle className="text-purple-700">Analysis Results</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Overview Card */}
                <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-6 rounded-lg border">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="text-lg font-semibold text-purple-700 mb-3">Overall Health Score</h3>
                      <div className="flex items-center space-x-4">
                        <div className="relative w-20 h-20">
                          <CircularProgressbar
                            value={result?.healthScore || 0}
                            text={`${result?.healthScore || 0}%`}
                            styles={buildStyles({
                              textSize: '16px',
                              pathColor: result && result.healthScore >= 70 ? '#10b981' : result && result.healthScore >= 40 ? '#f59e0b' : '#ef4444',
                              textColor: result && result.healthScore >= 70 ? '#10b981' : result && result.healthScore >= 40 ? '#f59e0b' : '#ef4444',
                              trailColor: '#e5e7eb',
                            })}
                          />
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 mb-1">
                            {result && result.healthScore >= 70 ? 'Healthy communication patterns detected' :
                             result && result.healthScore >= 40 ? 'Some concerning patterns identified' :
                             'Significant communication issues detected'}
                          </p>
                          <p className="text-xs text-gray-500">
                            Based on {selectedTier} tier analysis
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="text-lg font-semibold text-purple-700 mb-3">Analysis Summary</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Participants:</span>
                          <span className="font-medium">{result?.participants?.join(', ') || `${me}, ${them}`}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Messages analyzed:</span>
                          <span className="font-medium">{result?.messageCount || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Analysis depth:</span>
                          <span className="font-medium capitalize">{selectedTier}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Show additional analysis sections based on tier */}
                {result.summary && (
                  <div className="bg-white p-6 rounded-lg border">
                    <h3 className="text-lg font-semibold text-purple-700 mb-3">Summary</h3>
                    <p className="text-gray-700">{result.summary}</p>
                  </div>
                )}

                {/* New Analysis Button */}
                <div className="flex justify-center pt-6">
                  <Button 
                    onClick={() => {
                      setShowResults(false);
                      setResult(null);
                      setSelectedImages([]);
                      setImagePreviews([]);
                      setExtractedText('');
                      setMe('');
                      setThem('');
                      setConversation('');
                    }}
                    className="bg-purple-600 hover:bg-purple-700 text-white"
                  >
                    Start New Analysis
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}