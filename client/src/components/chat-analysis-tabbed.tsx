import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Upload, FileImage, Loader2, Camera, FileText, Archive } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function ChatAnalysisTabbed() {
  // Screenshot analysis state
  const [screenshots, setScreenshots] = useState<File[]>([]);
  const [messageSide, setMessageSide] = useState<'LEFT' | 'RIGHT'>('RIGHT');
  const [myName, setMyName] = useState('');
  const [theirName, setTheirName] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedMessages, setExtractedMessages] = useState<any[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResults, setAnalysisResults] = useState<any>(null);
  
  // Import chat state
  const [chatFiles, setChatFiles] = useState<File[]>([]);
  const [isProcessingFiles, setIsProcessingFiles] = useState(false);
  
  const { toast } = useToast();

  const handleScreenshotUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    
    if (imageFiles.length !== files.length) {
      toast({
        title: "Invalid files",
        description: "Please upload only image files",
        variant: "destructive"
      });
    }
    
    setScreenshots(imageFiles);
  };

  const handleChatFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter(file => 
      file.type === 'text/plain' || 
      file.type === 'application/zip' ||
      file.name.endsWith('.txt') ||
      file.name.endsWith('.zip')
    );
    
    if (validFiles.length !== files.length) {
      toast({
        title: "Invalid files",
        description: "Please upload only .txt or .zip files",
        variant: "destructive"
      });
    }
    
    setChatFiles(validFiles);
  };

  const extractText = async () => {
    if (screenshots.length === 0) {
      toast({
        title: "No screenshots",
        description: "Please upload at least one screenshot",
        variant: "destructive"
      });
      return;
    }

    if (!myName.trim() || !theirName.trim()) {
      toast({
        title: "Missing names",
        description: "Please enter both your name and their name",
        variant: "destructive"
      });
      return;
    }

    setIsExtracting(true);

    try {
      const allMessages = [];
      
      for (let i = 0; i < screenshots.length; i++) {
        const formData = new FormData();
        formData.append('image', screenshots[i]);
        formData.append('messageSide', messageSide);
        formData.append('myName', myName.trim());
        formData.append('theirName', theirName.trim());

        const response = await fetch('/api/ocr/azure-clean', {
          method: 'POST',
          body: formData
        });

        if (!response.ok) {
          throw new Error(`Failed to process screenshot ${i + 1}`);
        }

        const result = await response.json();
        console.log('Extraction result:', result);
        
        if (result.success && result.results?.[0]?.messages) {
          allMessages.push(...result.results[0].messages);
        }
      }

      setExtractedMessages(allMessages);
      setShowResults(true);

      toast({
        title: "Text extracted successfully",
        description: `Found ${allMessages.length} messages. Ready to analyze!`
      });

    } catch (error) {
      console.error('Extraction error:', error);
      toast({
        title: "Extraction failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive"
      });
    } finally {
      setIsExtracting(false);
    }
  };

  const analyzeExtractedMessages = async () => {
    if (extractedMessages.length === 0) {
      toast({
        title: "No messages to analyze",
        description: "Please extract text from screenshots first",
        variant: "destructive"
      });
      return;
    }

    setIsAnalyzing(true);

    try {
      // Convert extracted messages to conversation format
      const conversationText = extractedMessages
        .map(msg => `${msg.speaker}: ${msg.text}`)
        .join('\n');

      const response = await fetch('/api/analyze/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          conversationText: conversationText
        })
      });

      if (!response.ok) {
        throw new Error('Analysis failed');
      }

      const result = await response.json();
      setAnalysisResults(result);
      
      toast({
        title: "Analysis complete",
        description: "Your conversation has been analyzed successfully"
      });

    } catch (error) {
      console.error('Analysis error:', error);
      toast({
        title: "Analysis failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive"
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const processChatFiles = async () => {
    if (chatFiles.length === 0) {
      toast({
        title: "No files selected",
        description: "Please upload WhatsApp export files",
        variant: "destructive"
      });
      return;
    }

    setIsProcessingFiles(true);

    try {
      for (const file of chatFiles) {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch('/api/chat/import', {
          method: 'POST',
          body: formData
        });

        if (!response.ok) {
          throw new Error(`Failed to process ${file.name}`);
        }

        const result = await response.json();
        console.log('Import result:', result);
      }

      toast({
        title: "Files processed successfully",
        description: "Chat files imported and analyzed"
      });

    } catch (error) {
      console.error('Import error:', error);
      toast({
        title: "Import failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive"
      });
    } finally {
      setIsProcessingFiles(false);
    }
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="screenshot" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="screenshot" className="flex items-center gap-2">
            <Camera className="h-4 w-4" />
            Screenshot Analysis
          </TabsTrigger>
          <TabsTrigger value="import" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Import Chat
          </TabsTrigger>
        </TabsList>

        <TabsContent value="screenshot" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Screenshot Analysis</CardTitle>
              <p className="text-sm text-gray-600">
                Upload WhatsApp screenshots to extract and analyze conversations
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <Label htmlFor="screenshots">Upload Screenshots</Label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <input
                    id="screenshots"
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleScreenshotUpload}
                    className="hidden"
                  />
                  <label htmlFor="screenshots" className="cursor-pointer">
                    <Upload className="mx-auto h-12 w-12 text-gray-400" />
                    <p className="mt-2 text-sm text-gray-600">
                      Click to upload screenshots or drag and drop
                    </p>
                  </label>
                </div>
                
                {screenshots.length > 0 && (
                  <div className="grid grid-cols-3 gap-4">
                    {screenshots.map((file, index) => (
                      <div key={index} className="flex items-center space-x-2 p-2 bg-gray-50 rounded">
                        <FileImage className="h-4 w-4" />
                        <span className="text-sm truncate">{file.name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="leftParticipant">Left Side Participant</Label>
                  <Input
                    id="leftParticipant"
                    value={theirName}
                    onChange={(e) => setTheirName(e.target.value)}
                    placeholder="Name of person on left"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rightParticipant">Right Side Participant</Label>
                  <Input
                    id="rightParticipant"
                    value={myName}
                    onChange={(e) => setMyName(e.target.value)}
                    placeholder="Name of person on right"
                  />
                </div>
              </div>

              <Button 
                onClick={extractText} 
                disabled={isExtracting || screenshots.length === 0}
                className="w-full"
              >
                {isExtracting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Extracting Text...
                  </>
                ) : (
                  'Extract Text from Screenshots'
                )}
              </Button>

              {showResults && extractedMessages.length > 0 && (
                <div className="space-y-4 border-t pt-6">
                  <h3 className="text-lg font-medium">Extracted Messages ({extractedMessages.length})</h3>
                  <div className="max-h-60 overflow-y-auto space-y-2 border rounded p-4 bg-gray-50">
                    {extractedMessages.map((msg, index) => (
                      <div key={index} className="flex items-start space-x-2">
                        <span className="font-medium text-sm text-blue-600">{msg.speaker}:</span>
                        <span className="text-sm">{msg.text}</span>
                      </div>
                    ))}
                  </div>
                  
                  <Button 
                    onClick={analyzeExtractedMessages}
                    disabled={isAnalyzing}
                    className="w-full"
                  >
                    {isAnalyzing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Analyzing Conversation...
                      </>
                    ) : (
                      'Analyze Extracted Conversation'
                    )}
                  </Button>

                  {analysisResults && (
                    <div className="space-y-4 border-t pt-6">
                      <h3 className="text-lg font-medium">Analysis Results</h3>
                      <div className="space-y-3 border rounded p-4 bg-green-50">
                        {analysisResults.overallTone && (
                          <div>
                            <span className="font-medium">Overall Tone:</span>
                            <span className="ml-2">{analysisResults.overallTone.tone} ({analysisResults.overallTone.confidence}%)</span>
                          </div>
                        )}
                        {analysisResults.healthScore && (
                          <div>
                            <span className="font-medium">Health Score:</span>
                            <span className="ml-2">{analysisResults.healthScore.score}/100</span>
                          </div>
                        )}
                        {analysisResults.redFlagsDetected && (
                          <div>
                            <span className="font-medium text-red-600">Red Flags Detected:</span>
                            <span className="ml-2">Yes</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="import" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Import WhatsApp Chat</CardTitle>
              <p className="text-sm text-gray-600">
                Upload WhatsApp export files (.txt or .zip) for direct analysis
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <Label htmlFor="chatFiles">Upload Chat Files</Label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <input
                    id="chatFiles"
                    type="file"
                    multiple
                    accept=".txt,.zip,text/plain,application/zip"
                    onChange={handleChatFileUpload}
                    className="hidden"
                  />
                  <label htmlFor="chatFiles" className="cursor-pointer">
                    <Archive className="mx-auto h-12 w-12 text-gray-400" />
                    <p className="mt-2 text-sm text-gray-600">
                      Click to upload WhatsApp export files (.txt or .zip)
                    </p>
                    <p className="text-xs text-gray-500">
                      Export from WhatsApp: Chat → More → Export Chat
                    </p>
                  </label>
                </div>
                
                {chatFiles.length > 0 && (
                  <div className="space-y-2">
                    {chatFiles.map((file, index) => (
                      <div key={index} className="flex items-center space-x-2 p-2 bg-gray-50 rounded">
                        {file.name.endsWith('.zip') ? (
                          <Archive className="h-4 w-4" />
                        ) : (
                          <FileText className="h-4 w-4" />
                        )}
                        <span className="text-sm truncate">{file.name}</span>
                        <span className="text-xs text-gray-500">
                          ({(file.size / 1024).toFixed(1)} KB)
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <Button 
                onClick={processChatFiles}
                disabled={isProcessingFiles || chatFiles.length === 0}
                className="w-full"
              >
                {isProcessingFiles ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing Files...
                  </>
                ) : (
                  'Import and Analyze Chat Files'
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}