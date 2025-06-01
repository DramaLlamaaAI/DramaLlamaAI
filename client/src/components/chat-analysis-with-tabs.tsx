import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Upload, FileImage, Loader2, MessageSquare, Camera } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ExtractedMessage {
  text: string;
  side: 'left' | 'right';
  id: string;
}

export default function ChatAnalysisWithTabs() {
  // Screenshot analysis state
  const [screenshots, setScreenshots] = useState<File[]>([]);
  const [messageSide, setMessageSide] = useState<'LEFT' | 'RIGHT'>('RIGHT');
  const [myName, setMyName] = useState('');
  const [theirName, setTheirName] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedMessages, setExtractedMessages] = useState<{
    left: ExtractedMessage[];
    right: ExtractedMessage[];
  }>({ left: [], right: [] });
  const [showPreview, setShowPreview] = useState(false);
  
  // Import chat state
  const [chatText, setChatText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  const { toast } = useToast();

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
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
    setShowPreview(false);
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
      const allLeftMessages: ExtractedMessage[] = [];
      const allRightMessages: ExtractedMessage[] = [];

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
        
        if (result.success && result.results?.[0]) {
          const messages = result.results[0].messages || [];
          
          messages.forEach((msg: any, index: number) => {
            const messageId = `${i}-${index}`;
            const messageObj: ExtractedMessage = {
              text: msg.text,
              side: msg.speaker === myName ? (messageSide === 'LEFT' ? 'left' : 'right') : (messageSide === 'LEFT' ? 'right' : 'left'),
              id: messageId
            };

            if (messageObj.side === 'left') {
              allLeftMessages.push(messageObj);
            } else {
              allRightMessages.push(messageObj);
            }
          });
        }
      }

      setExtractedMessages({
        left: allLeftMessages,
        right: allRightMessages
      });
      setShowPreview(true);

      toast({
        title: "Text extracted successfully",
        description: `Found ${allLeftMessages.length + allRightMessages.length} messages`
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

  const analyzeImportedChat = async () => {
    if (!chatText.trim()) {
      toast({
        title: "No chat text",
        description: "Please paste your chat conversation",
        variant: "destructive"
      });
      return;
    }

    setIsAnalyzing(true);

    try {
      const response = await fetch('/api/analysis/direct', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          conversationText: chatText.trim()
        })
      });

      if (!response.ok) {
        throw new Error('Analysis failed');
      }

      const result = await response.json();
      
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

  return (
    <div className="space-y-6">
      <Tabs defaultValue="screenshot" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="screenshot" className="flex items-center gap-2">
            <Camera className="h-4 w-4" />
            Screenshot Analysis
          </TabsTrigger>
          <TabsTrigger value="import" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Import Chat
          </TabsTrigger>
        </TabsList>

        <TabsContent value="screenshot" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Screenshot Analysis</CardTitle>
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
                    onChange={handleFileUpload}
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
                  <Label htmlFor="myName">My Name</Label>
                  <Input
                    id="myName"
                    value={myName}
                    onChange={(e) => setMyName(e.target.value)}
                    placeholder="Enter your name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="theirName">Their Name</Label>
                  <Input
                    id="theirName"
                    value={theirName}
                    onChange={(e) => setTheirName(e.target.value)}
                    placeholder="Enter their name"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <Label>My messages are on the:</Label>
                <RadioGroup value={messageSide} onValueChange={(value) => setMessageSide(value as 'LEFT' | 'RIGHT')}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="LEFT" id="left" />
                    <Label htmlFor="left">Left side (Gray bubbles)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="RIGHT" id="right" />
                    <Label htmlFor="right">Right side (Green/Blue bubbles)</Label>
                  </div>
                </RadioGroup>
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
                  'Extract Text'
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="import" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Import Chat</CardTitle>
              <p className="text-sm text-gray-600">
                Paste your chat conversation below to analyze it directly
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="chatText">Chat Conversation</Label>
                <Textarea
                  id="chatText"
                  value={chatText}
                  onChange={(e) => setChatText(e.target.value)}
                  placeholder="Paste your chat conversation here..."
                  className="min-h-[300px]"
                />
              </div>
              
              <Button 
                onClick={analyzeImportedChat}
                disabled={isAnalyzing || !chatText.trim()}
                className="w-full"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  'Analyze Chat'
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}