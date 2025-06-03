import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, Loader2, Archive, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Header from '@/components/header';
import Footer from '@/components/footer';
import BackHomeButton from '@/components/back-home-button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

// Step indicator component
function StepIndicator({ currentStep }: { currentStep: number }) {
  const steps = [
    { number: 1, label: "Input Chat" },
    { number: 2, label: "Set Names" },
    { number: 3, label: "Get Results" }
  ];

  return (
    <div className="flex items-center justify-center mb-8">
      {steps.map((step, index) => (
        <div key={step.number} className="flex items-center">
          <div className={`
            flex items-center justify-center w-10 h-10 rounded-full text-sm font-medium
            ${currentStep >= step.number 
              ? 'bg-primary text-white' 
              : 'bg-gray-200 text-gray-600'
            }
          `}>
            {step.number}
          </div>
          <span className={`ml-2 text-sm ${currentStep >= step.number ? 'text-primary font-medium' : 'text-gray-500'}`}>
            {step.label}
          </span>
          {index < steps.length - 1 && (
            <div className={`mx-4 h-0.5 w-8 ${currentStep > step.number ? 'bg-primary' : 'bg-gray-200'}`} />
          )}
        </div>
      ))}
    </div>
  );
}

export default function ChatAnalysisSimple() {
  const [chatFiles, setChatFiles] = useState<File[]>([]);
  const [isProcessingFiles, setIsProcessingFiles] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [myName, setMyName] = useState('');
  const [theirName, setTheirName] = useState('');
  const [extractedMessages, setExtractedMessages] = useState<any[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResults, setAnalysisResults] = useState<any>(null);
  const [progress, setProgress] = useState(0);
  
  const { toast } = useToast();

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    if (files.length === 0) return;
    
    setChatFiles(files);
    setIsProcessingFiles(true);
    setProgress(10);

    try {
      const file = files[0];
      
      // Handle ZIP files (WhatsApp exports)
      if (file.name.endsWith('.zip')) {
        const base64 = await new Promise<string>((resolve, reject) => {
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
        });

        setProgress(30);

        const response = await fetch('/api/extract-chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ file: base64 })
        });

        setProgress(60);

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to extract chat');
        }

        const data = await response.json();
        
        // Convert text to messages format and detect names
        if (data.text) {
          const messages = parseTextToMessages(data.text);
          setExtractedMessages(messages);
          
          // Auto-detect names using the extracted text
          await detectNamesFromText(data.text);
        }
        
        setProgress(100);
        
        toast({
          title: "Chat extracted successfully",
          description: `Found ${data.messages?.length || 0} messages`,
        });
        
        setCurrentStep(2);
      } else {
        // Handle text files
        const text = await file.text();
        // Simple text parsing - could be enhanced
        const lines = text.split('\n').filter(line => line.trim());
        const messages = lines.map((line, index) => ({
          id: index,
          text: line,
          speaker: 'Unknown',
          timestamp: new Date().toISOString()
        }));
        
        setExtractedMessages(messages);
        setProgress(100);
        setCurrentStep(2);
        
        toast({
          title: "Text file uploaded",
          description: `Found ${messages.length} lines to analyze`,
        });
      }
    } catch (error: any) {
      console.error('File processing error:', error);
      toast({
        title: "Processing failed",
        description: error.message || "Failed to process the uploaded file",
        variant: "destructive"
      });
    } finally {
      setIsProcessingFiles(false);
    }
  };

  const handleAnalyze = async () => {
    if (!myName.trim() || !theirName.trim()) {
      toast({
        title: "Missing names",
        description: "Please enter both participant names",
        variant: "destructive"
      });
      return;
    }

    setIsAnalyzing(true);
    setCurrentStep(3);

    try {
      // Convert messages to conversation format expected by the server
      const conversationText = extractedMessages
        .map(msg => `${msg.speaker}: ${msg.content}`)
        .join('\n');

      const response = await fetch('/api/analyze/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversation: conversationText,
          me: myName.trim(),
          them: theirName.trim()
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Analysis failed');
      }

      const results = await response.json();
      setAnalysisResults(results);
      
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

  // Helper function to parse text into messages
  const parseTextToMessages = (text: string) => {
    const lines = text.split('\n').filter(line => line.trim());
    const messages: any[] = [];
    
    // Common WhatsApp message patterns
    const patterns = [
      // [date, time] Name: Message
      /\[\d+[\/-]\d+[\/-]\d+(?:,|\s+)\s*\d+:\d+(?::\d+)?(?:\s*[AP]M)?\]\s*(.*?):\s*(.*)/,
      // date, time - Name: Message  
      /\d+[\/-]\d+[\/-]\d+(?:,|\s+)\s*\d+:\d+(?::\d+)?(?:\s*[AP]M)?\s+-\s*(.*?):\s*(.*)/
    ];
    
    lines.forEach(line => {
      for (const pattern of patterns) {
        const match = line.match(pattern);
        if (match && match[1] && match[2]) {
          const speaker = match[1].trim();
          const content = match[2].trim();
          
          // Skip system messages
          if (!speaker.includes('changed the subject') && 
              !speaker.includes('added') && 
              !speaker.includes('removed') &&
              !speaker.includes('left') &&
              !speaker.includes('joined')) {
            messages.push({
              speaker,
              content,
              timestamp: new Date().toISOString()
            });
          }
          break;
        }
      }
    });
    
    return messages;
  };

  // Auto-detect names using the server endpoint
  const detectNamesFromText = async (text: string) => {
    try {
      console.log('Attempting name detection with text length:', text.length);
      const response = await fetch('/api/analyze/detect-names', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversation: text })
      });

      if (response.ok) {
        const names = await response.json();
        console.log('Detected names:', names);
        if (names.me && names.them) {
          setMyName(names.me);
          setTheirName(names.them);
          toast({
            title: "Names detected",
            description: `Found: ${names.me} and ${names.them}`,
          });
        }
      } else {
        console.error('Name detection API failed:', response.status, response.statusText);
        // Fallback to manual parsing if server detection fails
        const messages = parseTextToMessages(text);
        if (messages.length > 0) {
          const speakerSet = new Set(messages.map(m => m.speaker));
          const speakers = Array.from(speakerSet);
          if (speakers.length >= 2) {
            setMyName(speakers[0]);
            setTheirName(speakers[1]);
            toast({
              title: "Names detected locally",
              description: `Found: ${speakers[0]} and ${speakers[1]}`,
            });
          }
        }
      }
    } catch (error) {
      console.error('Name detection failed:', error);
      // Fallback to manual parsing if server detection fails
      const messages = parseTextToMessages(text);
      if (messages.length > 0) {
        const speakerSet = new Set(messages.map(m => m.speaker));
        const speakers = Array.from(speakerSet);
        if (speakers.length >= 2) {
          setMyName(speakers[0]);
          setTheirName(speakers[1]);
          toast({
            title: "Names detected locally",
            description: `Found: ${speakers[0]} and ${speakers[1]}`,
          });
        }
      }
    }
  };

  // Switch names function
  const switchNames = () => {
    const temp = myName;
    setMyName(theirName);
    setTheirName(temp);
    toast({
      title: "Names switched",
      description: "Swapped 'Your name' and 'Their name'",
    });
  };

  const resetAnalysis = () => {
    setChatFiles([]);
    setExtractedMessages([]);
    setAnalysisResults(null);
    setMyName('');
    setTheirName('');
    setCurrentStep(1);
    setProgress(0);
  };

  return (
    <>
      <Header />
      <main className="container mx-auto px-4 py-8 max-w-4xl min-h-screen">
        <BackHomeButton className="mb-6" />
        
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Chat Analysis</h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Analyze your text conversation to understand communication patterns, emotional tones and potential issues
          </p>
        </div>

        <StepIndicator currentStep={currentStep} />

        {/* Step 1: Upload File */}
        {currentStep === 1 && (
          <Card className="w-full max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle className="text-center">Step 1: Upload Your Chat</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Upload File Button */}
              <div className="text-center">
                <Label htmlFor="file-upload" className="cursor-pointer">
                  <div className="border-2 border-dashed border-primary rounded-lg p-8 hover:bg-primary/5 transition-colors">
                    <Upload className="h-12 w-12 text-primary mx-auto mb-4" />
                    <div className="text-lg font-medium text-primary mb-2">Upload File</div>
                    <div className="text-sm text-gray-600">Select a text file or chat export</div>
                  </div>
                </Label>
                <Input
                  id="file-upload"
                  type="file"
                  accept=".txt,.zip"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>

              {/* WhatsApp Export Option */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="bg-white px-2 text-gray-500">or</span>
                </div>
              </div>

              <div className="text-center">
                <Label htmlFor="whatsapp-upload" className="cursor-pointer">
                  <div className="border border-gray-300 rounded-lg p-6 hover:bg-gray-50 transition-colors">
                    <Archive className="h-8 w-8 text-gray-600 mx-auto mb-3" />
                    <div className="font-medium text-gray-900 mb-1">Upload WhatsApp Export</div>
                    <div className="text-sm text-gray-600">
                      Upload a .txt file with WhatsApp chat exports,<br />
                      or a .zip of WhatsApp chat exports
                    </div>
                  </div>
                </Label>
                <Input
                  id="whatsapp-upload"
                  type="file"
                  accept=".txt,.zip"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>

              {isProcessingFiles && (
                <div className="space-y-3">
                  <div className="text-center text-sm text-gray-600">Processing file...</div>
                  <Progress value={progress} className="w-full" />
                </div>
              )}

              {/* Instructions */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">How to export a WhatsApp chat:</h4>
                <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                  <li>Open the individual or group chat</li>
                  <li>Tap the three dots in the top right</li>
                  <li>Select "More" then "Export chat"</li>
                  <li>Choose "Without media"</li>
                  <li>Save the file and upload it here</li>
                </ol>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Set Names */}
        {currentStep === 2 && (
          <Card className="w-full max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle className="text-center">Step 2: Enter Participant Names</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
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
              
              {/* Switch names button */}
              <div className="text-center">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={switchNames}
                  className="text-blue-600 border-blue-600 hover:bg-blue-50"
                  disabled={!myName || !theirName}
                >
                  ↔ Switch Names
                </Button>
              </div>

              <div className="flex gap-2 justify-center">
                <Button 
                  variant="outline" 
                  onClick={() => setCurrentStep(1)}
                  disabled={isAnalyzing}
                >
                  Back
                </Button>
                <Button 
                  onClick={handleAnalyze}
                  disabled={!myName.trim() || !theirName.trim() || isAnalyzing}
                  className="bg-pink-600 hover:bg-pink-700"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    'Analyze Chat'
                  )}
                </Button>
              </div>

              <div className="bg-gray-50 border rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="h-4 w-4 text-gray-600" />
                  <span className="text-sm font-medium text-gray-700">Auto-Detect Names</span>
                </div>
                <p className="text-sm text-gray-600">
                  We won't store your conversation data. All analysis is performed securely.
                </p>
              </div>

              {extractedMessages.length > 0 && (
                <div className="text-center">
                  <Badge variant="secondary">
                    Analyses used this month: 0 of 2
                  </Badge>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Step 3: Results */}
        {currentStep === 3 && analysisResults && (
          <Card className="w-full max-w-4xl mx-auto">
            <CardHeader>
              <CardTitle className="text-center">Step 3: Analysis Results</CardTitle>
            </CardHeader>
            <CardContent>
              {/* Display analysis results here */}
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
                    Analyze Another Chat
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