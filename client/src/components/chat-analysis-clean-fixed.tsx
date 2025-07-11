import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { 
  Upload, 
  MessageCircle, 
  Brain, 
  Loader2, 
  AlertTriangle, 
  Shield, 
  Heart, 
  TrendingUp, 
  Users, 
  Eye,
  ArrowUp,
  ArrowDown,
  X,
  Edit,
  Download
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { ChatAnalysisResponse } from '@shared/schema';
import AnalysisDisplay from '@/components/ui/analysis-display';

export default function ChatAnalysis() {
  const [conversation, setConversation] = useState('');
  const [screenshots, setScreenshots] = useState<Array<{file: File, preview: string}>>([]);
  const [messageSide, setMessageSide] = useState<string>('');
  const [screenshotMe, setScreenshotMe] = useState('');
  const [screenshotThem, setScreenshotThem] = useState('');
  const [extractedText, setExtractedText] = useState<string | null>(null);
  const [isProcessingScreenshots, setIsProcessingScreenshots] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const { toast } = useToast();

  // Get user tier info
  const { data: userUsage } = useQuery({
    queryKey: ['/api/user/usage'],
    staleTime: 30000
  });

  const userTier = userUsage?.tier || 'free';

  // Process screenshots with OCR
  const handleScreenshotAnalysis = async () => {
    if (screenshots.length === 0) return;

    setIsProcessingScreenshots(true);
    setOcrProgress(0);

    try {
      let allExtractedTexts: string[] = [];
      
      for (let i = 0; i < screenshots.length; i++) {
        const screenshot = screenshots[i];
        setOcrProgress((i / screenshots.length) * 80);

        try {
          const Tesseract = await import('tesseract.js');
          
          const result = await Tesseract.recognize(screenshot.file, 'eng', {
            logger: (m) => {
              if (m.status === 'recognizing text') {
                console.log(`OCR Progress for image ${i + 1}: ${Math.round(m.progress * 100)}%`);
              }
            }
          });

          console.log(`OCR Result for image ${i + 1}:`, result);
          
          if (result && result.data && result.data.text) {
            const extractedText = result.data.text.trim();
            console.log(`Raw text from image ${i + 1} (${extractedText.length} chars):`, extractedText);
            
            if (extractedText.length > 0) {
              allExtractedTexts.push(extractedText);
              console.log(`Successfully extracted text from image ${i + 1}`);
            } else {
              console.warn(`Image ${i + 1} processed but no text found`);
            }
          } else {
            console.error(`Image ${i + 1} failed - invalid result structure`);
          }
        } catch (imageError) {
          console.error(`Failed to process image ${i + 1}:`, imageError);
        }
      }

      setOcrProgress(90);

      if (allExtractedTexts.length === 0) {
        throw new Error('No text could be extracted from any screenshots. Try manual text input instead.');
      }

      const combinedText = allExtractedTexts.join('\n\n');
      const parsedConversation = parseScreenshotText(combinedText, messageSide, screenshotMe, screenshotThem);
      
      setOcrProgress(100);
      setExtractedText(parsedConversation);

      toast({
        title: "Text Extraction Complete",
        description: `Successfully extracted text from ${allExtractedTexts.length} of ${screenshots.length} screenshots.`,
      });

    } catch (error) {
      console.error('OCR processing failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown OCR processing error occurred';
      
      toast({
        title: "Text Extraction Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsProcessingScreenshots(false);
      setOcrProgress(0);
    }
  };

  // Parse extracted text into conversation format
  const parseScreenshotText = (text: string, side: string, myName: string, theirName: string): string => {
    const lines = text.split('\n').filter(line => line.trim());
    return lines.map(line => {
      const trimmedLine = line.trim();
      if (!trimmedLine) return '';
      
      // Simple heuristic: assume messages alternate or can be identified by position
      // This is a basic implementation - real OCR parsing would be more sophisticated
      const speaker = Math.random() > 0.5 ? myName : theirName; // Placeholder logic
      return `${speaker}: ${trimmedLine}`;
    }).filter(Boolean).join('\n');
  };

  // Handle file upload
  const handleFileUpload = (files: FileList | null) => {
    if (!files) return;
    
    const newScreenshots: Array<{file: File, preview: string}> = [];
    
    Array.from(files).forEach(file => {
      if (file.type.startsWith('image/')) {
        const preview = URL.createObjectURL(file);
        newScreenshots.push({ file, preview });
      }
    });
    
    setScreenshots(prev => [...prev, ...newScreenshots]);
  };

  const removeScreenshot = (index: number) => {
    setScreenshots(prev => {
      const newScreenshots = [...prev];
      URL.revokeObjectURL(newScreenshots[index].preview);
      newScreenshots.splice(index, 1);
      return newScreenshots;
    });
  };

  const moveScreenshot = (index: number, direction: 'up' | 'down') => {
    setScreenshots(prev => {
      const newScreenshots = [...prev];
      const newIndex = direction === 'up' ? index - 1 : index + 1;
      
      if (newIndex >= 0 && newIndex < newScreenshots.length) {
        [newScreenshots[index], newScreenshots[newIndex]] = [newScreenshots[newIndex], newScreenshots[index]];
      }
      
      return newScreenshots;
    });
  };

  const handleFinalAnalysis = () => {
    if (extractedText) {
      analyzeConversation.mutate(extractedText);
    }
  };

  // Analysis mutations
  const analyzeConversation = useMutation({
    mutationFn: async (conversation: string) => {
      const response = await apiRequest('POST', '/api/analyze', { conversation });
      return response.json();
    },
    onSuccess: (data: ChatAnalysisResponse) => {
      toast({
        title: "Analysis Complete",
        description: "Your conversation has been analyzed successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Analysis Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const isAnalysisLoading = analyzeConversation.isPending;
  const analysisResult = analyzeConversation.data;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Chat Analysis</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Upload chat screenshots or paste conversation text to get AI-powered insights into communication patterns, emotional dynamics, and relationship health.
        </p>
      </div>

      <Tabs defaultValue="screenshots" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="screenshots">Screenshot Analysis</TabsTrigger>
          <TabsTrigger value="text">Text Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="screenshots" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Upload Chat Screenshots
              </CardTitle>
              <CardDescription>
                Upload screenshots of your chat conversation. The AI will extract and analyze the text automatically.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <div 
                  className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center hover:border-gray-400 dark:hover:border-gray-500 transition-colors cursor-pointer"
                  onClick={() => document.getElementById('screenshot-upload')?.click()}
                >
                  <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    Choose screenshot files
                  </p>
                  <p className="text-gray-500 dark:text-gray-400">
                    Select multiple images of your chat conversation
                  </p>
                  <input
                    id="screenshot-upload"
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={(e) => handleFileUpload(e.target.files)}
                    className="hidden"
                  />
                </div>
              </div>

              {screenshots.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Screenshots ({screenshots.length})</h3>
                  <div className="grid gap-4">
                    {screenshots.map((screenshot, index) => (
                      <div key={index} className="flex items-center gap-4 p-3 border rounded-lg">
                        <img 
                          src={screenshot.preview} 
                          alt={`Screenshot ${index + 1}`}
                          className="w-16 h-16 object-cover rounded"
                        />
                        <div className="flex-1">
                          <p className="font-medium">Screenshot {index + 1}</p>
                          <p className="text-sm text-muted-foreground">{screenshot.file.name}</p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => moveScreenshot(index, 'up')}
                            disabled={index === 0}
                          >
                            <ArrowUp className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => moveScreenshot(index, 'down')}
                            disabled={index === screenshots.length - 1}
                          >
                            <ArrowDown className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => removeScreenshot(index)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {screenshots.length > 0 && (
                <div className="space-y-4 border-t pt-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Message Layout</h3>
                    <p className="text-base mb-4">My messages are on the:</p>
                  </div>
                  
                  <div className="flex gap-4">
                    <Button
                      variant={messageSide === 'left' ? 'default' : 'outline'}
                      onClick={() => setMessageSide('left')}
                      className="flex-1 py-3"
                    >
                      LEFT
                    </Button>
                    <Button
                      variant={messageSide === 'right' ? 'default' : 'outline'}
                      onClick={() => setMessageSide('right')}
                      className="flex-1 py-3"
                    >
                      RIGHT
                    </Button>
                  </div>
                </div>
              )}

              {screenshots.length > 0 && messageSide && (
                <div className="space-y-4 border-t pt-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Participant Names</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Enter the names of the conversation participants for better analysis.
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">My Name</label>
                      <Input
                        value={screenshotMe}
                        onChange={(e) => setScreenshotMe(e.target.value)}
                        placeholder="Your name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Their Name</label>
                      <Input
                        value={screenshotThem}
                        onChange={(e) => setScreenshotThem(e.target.value)}
                        placeholder="Other person's name"
                      />
                    </div>
                  </div>
                </div>
              )}

              {screenshots.length > 0 && messageSide && screenshotMe && screenshotThem && (
                <div className="space-y-4 border-t pt-6">
                  {isProcessingScreenshots ? (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span>Processing screenshots...</span>
                      </div>
                      <Progress value={ocrProgress} className="w-full" />
                    </div>
                  ) : (
                    <Button
                      onClick={handleScreenshotAnalysis}
                      className="w-full bg-teal-500 hover:bg-teal-600"
                    >
                      <Brain className="h-4 w-4 mr-2" />
                      Extract Text from Screenshots
                    </Button>
                  )}
                </div>
              )}

              {/* Manual Text Input Option */}
              {screenshots.length > 0 && messageSide && screenshotMe && screenshotThem && !isProcessingScreenshots && extractedText === null && (
                <div className="space-y-4 border-t pt-6">
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                    <h4 className="font-medium mb-2">Alternative: Manual Text Input</h4>
                    <p className="text-sm text-muted-foreground mb-3">
                      If the automatic text extraction didn't work well, you can manually type or paste your conversation below.
                    </p>
                    <Button
                      onClick={() => setExtractedText('')}
                      variant="outline"
                      size="sm"
                    >
                      Skip OCR - Enter Text Manually
                    </Button>
                  </div>
                </div>
              )}

              {/* Extracted Text Preview */}
              {extractedText !== null && (
                <div className="space-y-4 border-t pt-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-2">
                      {extractedText ? 'Extracted Conversation' : 'Manual Text Input'}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      {extractedText 
                        ? 'Review the extracted text below. You can edit it before analysis.'
                        : 'Enter your conversation text below. Format it as "Name: message" for each line.'
                      }
                    </p>
                  </div>
                  
                  <Textarea
                    value={extractedText || ''}
                    onChange={(e) => setExtractedText(e.target.value)}
                    rows={10}
                    className="font-mono text-sm"
                    placeholder={extractedText ? "Extracted conversation will appear here..." : `Enter conversation like:\n${screenshotMe}: Hello, how are you?\n${screenshotThem}: I'm doing well, thanks!`}
                  />
                  
                  <div className="flex gap-2">
                    <Button
                      onClick={handleFinalAnalysis}
                      disabled={!extractedText?.trim()}
                      className="bg-teal-500 hover:bg-teal-600"
                    >
                      <Brain className="h-4 w-4 mr-2" />
                      Analyze Conversation
                    </Button>
                    <Button
                      onClick={() => {
                        setExtractedText(null);
                        setScreenshots([]);
                        setMessageSide('');
                        setScreenshotMe('');
                        setScreenshotThem('');
                      }}
                      variant="outline"
                    >
                      Start Over
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="text" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5" />
                Direct Text Input
              </CardTitle>
              <CardDescription>
                Paste or type your conversation directly for analysis.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                value={conversation}
                onChange={(e) => setConversation(e.target.value)}
                rows={15}
                className="font-mono text-sm"
                placeholder="Paste your conversation here..."
              />
              
              <Button
                onClick={() => analyzeConversation.mutate(conversation)}
                disabled={!conversation.trim() || isAnalysisLoading}
                className="w-full bg-teal-500 hover:bg-teal-600"
              >
                {isAnalysisLoading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Brain className="h-4 w-4 mr-2" />
                )}
                {isAnalysisLoading ? 'Analyzing...' : 'Analyze Conversation'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Analysis Results */}
      {analysisResult && (
        <AnalysisDisplay result={analysisResult} tier={userTier} />
      )}
    </div>
  );
}