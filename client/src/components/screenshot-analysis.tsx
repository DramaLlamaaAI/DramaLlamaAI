import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, FileImage, Loader2, Camera } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Header from '@/components/header';
import Footer from '@/components/footer';
import BackHomeButton from '@/components/back-home-button';
import { Progress } from '@/components/ui/progress';

export default function ScreenshotAnalysis() {
  const [screenshots, setScreenshots] = useState<File[]>([]);
  const [messageSide, setMessageSide] = useState<'LEFT' | 'RIGHT'>('RIGHT');
  const [myName, setMyName] = useState('');
  const [theirName, setTheirName] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedMessages, setExtractedMessages] = useState<any[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [showReviewStep, setShowReviewStep] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResults, setAnalysisResults] = useState<any>(null);
  const [progress, setProgress] = useState(0);
  
  const { toast } = useToast();

  const changeSpeaker = (messageIndex: number, newSpeaker: string) => {
    const updatedMessages = [...extractedMessages];
    updatedMessages[messageIndex].speaker = newSpeaker;
    setExtractedMessages(updatedMessages);
  };

  const proceedToAnalysis = () => {
    setShowReviewStep(false);
    setShowResults(true);
  };

  const handleScreenshotUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    
    if (imageFiles.length !== files.length) {
      toast({
        title: "Invalid files",
        description: "Please upload only image files",
        variant: "destructive"
      });
      return;
    }
    
    setScreenshots(imageFiles);
  };

  const extractTextFromScreenshots = async () => {
    if (screenshots.length === 0 || !myName.trim() || !theirName.trim()) {
      toast({
        title: "Missing information",
        description: "Please upload screenshots and enter participant names",
        variant: "destructive"
      });
      return;
    }

    setIsExtracting(true);
    setProgress(10);

    try {
      const base64Files = await Promise.all(
        screenshots.map(file => new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            if (typeof reader.result === 'string') {
              resolve(reader.result);
            } else {
              reject(new Error('Failed to read file'));
            }
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        }))
      );

      setProgress(30);

      const response = await fetch('/api/extract-screenshots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          screenshots: base64Files,
          messageSide,
          myName: myName.trim(),
          theirName: theirName.trim()
        })
      });

      setProgress(70);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to extract text from screenshots');
      }

      const data = await response.json();
      setExtractedMessages(data.messages || []);
      setProgress(100);
      setShowReviewStep(true);
      
      toast({
        title: "Text extracted successfully",
        description: `Found ${data.messages?.length || 0} messages`,
      });
    } catch (error: any) {
      console.error('Screenshot extraction error:', error);
      toast({
        title: "Extraction failed",
        description: error.message || "Failed to extract text from screenshots",
        variant: "destructive"
      });
    } finally {
      setIsExtracting(false);
    }
  };

  const handleAnalyze = async () => {
    setIsAnalyzing(true);

    try {
      const response = await fetch('/api/analyze/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: extractedMessages,
          participants: [myName.trim(), theirName.trim()]
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Analysis failed');
      }

      const results = await response.json();
      setAnalysisResults(results);
      setShowResults(true);
      
      toast({
        title: "Analysis complete",
        description: "Your conversation has been analyzed successfully",
      });
    } catch (error: any) {
      console.error('Analysis error:', error);
      toast({
        title: "Analysis failed",
        description: error.message || "Failed to analyze the conversation",
        variant: "destructive"
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const resetAnalysis = () => {
    setScreenshots([]);
    setExtractedMessages([]);
    setAnalysisResults(null);
    setMyName('');
    setTheirName('');
    setShowResults(false);
    setShowReviewStep(false);
    setProgress(0);
  };

  return (
    <>
      <Header />
      <main className="container mx-auto px-4 py-8 max-w-4xl min-h-screen">
        <BackHomeButton className="mb-6" />
        
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Screenshot Analysis</h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Upload screenshots of your conversation to extract and analyze the messages
          </p>
        </div>

        {/* Upload and Setup Step */}
        {!showReviewStep && !showResults && (
          <Card className="w-full max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle className="text-center">Upload Screenshots</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Screenshot Upload */}
              <div className="text-center">
                <Label htmlFor="screenshot-upload" className="cursor-pointer">
                  <div className="border-2 border-dashed border-primary rounded-lg p-8 hover:bg-primary/5 transition-colors">
                    <Camera className="h-12 w-12 text-primary mx-auto mb-4" />
                    <div className="text-lg font-medium text-primary mb-2">Upload Screenshots</div>
                    <div className="text-sm text-gray-600">Select multiple images of your conversation</div>
                  </div>
                </Label>
                <Input
                  id="screenshot-upload"
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleScreenshotUpload}
                  className="hidden"
                />
              </div>

              {screenshots.length > 0 && (
                <div className="text-center">
                  <p className="text-sm text-gray-600 mb-2">{screenshots.length} screenshot(s) selected</p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {screenshots.slice(0, 6).map((file, index) => (
                      <div key={index} className="relative">
                        <img 
                          src={URL.createObjectURL(file)} 
                          alt={`Screenshot ${index + 1}`}
                          className="w-full h-20 object-cover rounded border"
                        />
                      </div>
                    ))}
                    {screenshots.length > 6 && (
                      <div className="flex items-center justify-center bg-gray-100 rounded border h-20">
                        <span className="text-sm text-gray-600">+{screenshots.length - 6} more</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Message Side Selection */}
              <div>
                <Label className="text-sm font-medium">Your messages appear on the:</Label>
                <RadioGroup value={messageSide} onValueChange={(value: 'LEFT' | 'RIGHT') => setMessageSide(value)} className="mt-2">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="RIGHT" id="right" />
                    <Label htmlFor="right">Right side (default)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="LEFT" id="left" />
                    <Label htmlFor="left">Left side</Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Names Input */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="my-name">Your Name:</Label>
                  <Input
                    id="my-name"
                    placeholder="Your name in the chat"
                    value={myName}
                    onChange={(e) => setMyName(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="their-name">Their Name:</Label>
                  <Input
                    id="their-name"
                    placeholder="Their name in the chat"
                    value={theirName}
                    onChange={(e) => setTheirName(e.target.value)}
                  />
                </div>
              </div>

              {isExtracting && (
                <div className="space-y-3">
                  <div className="text-center text-sm text-gray-600">Extracting text from screenshots...</div>
                  <Progress value={progress} className="w-full" />
                </div>
              )}

              <div className="flex justify-center">
                <Button 
                  onClick={extractTextFromScreenshots}
                  disabled={screenshots.length === 0 || !myName.trim() || !theirName.trim() || isExtracting}
                  className="bg-primary hover:bg-primary/90"
                >
                  {isExtracting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Extracting Text...
                    </>
                  ) : (
                    <>
                      <FileImage className="h-4 w-4 mr-2" />
                      Extract Text
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Review Step */}
        {showReviewStep && !showResults && (
          <Card className="w-full max-w-4xl mx-auto">
            <CardHeader>
              <CardTitle className="text-center">Review Extracted Messages</CardTitle>
              <p className="text-center text-gray-600">Verify the extracted text and speaker assignments</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="max-h-96 overflow-y-auto space-y-2">
                {extractedMessages.map((message, index) => (
                  <div key={index} className="border rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">
                        Speaker: {message.speaker}
                      </span>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant={message.speaker === myName ? "default" : "outline"}
                          onClick={() => changeSpeaker(index, myName)}
                        >
                          {myName}
                        </Button>
                        <Button
                          size="sm"
                          variant={message.speaker === theirName ? "default" : "outline"}
                          onClick={() => changeSpeaker(index, theirName)}
                        >
                          {theirName}
                        </Button>
                      </div>
                    </div>
                    <p className="text-sm text-gray-700">{message.text}</p>
                  </div>
                ))}
              </div>

              <div className="flex gap-2 justify-center">
                <Button 
                  variant="outline" 
                  onClick={() => setShowReviewStep(false)}
                  disabled={isAnalyzing}
                >
                  Back
                </Button>
                <Button 
                  onClick={handleAnalyze}
                  disabled={isAnalyzing}
                  className="bg-pink-600 hover:bg-pink-700"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    'Analyze Conversation'
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Results Step */}
        {showResults && analysisResults && (
          <Card className="w-full max-w-4xl mx-auto">
            <CardHeader>
              <CardTitle className="text-center">Analysis Results</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {analysisResults.overallTone && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Overall Tone</h3>
                    <p className="text-gray-700">{analysisResults.overallTone}</p>
                  </div>
                )}
                
                {analysisResults.participantAnalysis && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Participant Analysis</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {Object.entries(analysisResults.participantAnalysis).map(([name, analysis]: [string, any]) => (
                        <div key={name} className="border rounded-lg p-4">
                          <h4 className="font-medium mb-2">{name}</h4>
                          <p className="text-sm text-gray-600">{analysis.summary}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex justify-center">
                  <Button onClick={resetAnalysis} variant="outline">
                    Analyze More Screenshots
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
      <Footer />
    </>
  );
}