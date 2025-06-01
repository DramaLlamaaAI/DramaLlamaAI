import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, FileImage, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ExtractedMessage {
  text: string;
  side: 'left' | 'right';
  id: string;
}

export default function ScreenshotAnalysisNew() {
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
    setShowPreview(false); // Reset preview when new files are uploaded
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
        
        // Convert the response to our format
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

  const updateMessage = (id: string, newText: string) => {
    setExtractedMessages(prev => ({
      left: prev.left.map(msg => msg.id === id ? { ...msg, text: newText } : msg),
      right: prev.right.map(msg => msg.id === id ? { ...msg, text: newText } : msg)
    }));
  };

  const moveMessage = (id: string, fromSide: 'left' | 'right') => {
    const toSide = fromSide === 'left' ? 'right' : 'left';
    
    setExtractedMessages(prev => {
      const message = prev[fromSide].find(msg => msg.id === id);
      if (!message) return prev;

      return {
        left: fromSide === 'left' 
          ? prev.left.filter(msg => msg.id !== id)
          : [...prev.left, { ...message, side: 'left' }],
        right: fromSide === 'right'
          ? prev.right.filter(msg => msg.id !== id)
          : [...prev.right, { ...message, side: 'right' }]
      };
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Screenshot Analysis</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Step 1: Upload Screenshots */}
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

          {/* Step 2: User Configuration */}
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

          {/* Step 3: Extract Button */}
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

      {/* Step 4: Preview and Edit */}
      {showPreview && (
        <Card>
          <CardHeader>
            <CardTitle>Extracted Messages Preview</CardTitle>
            <p className="text-sm text-gray-600">
              Edit any message if OCR made errors, or click the arrow to move messages between sides
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Side Messages */}
              <div>
                <h3 className="font-semibold mb-3 text-gray-700">
                  Left Side ({messageSide === 'LEFT' ? myName : theirName})
                </h3>
                <div className="space-y-2">
                  {extractedMessages.left.map((message) => (
                    <div key={message.id} className="flex items-center space-x-2">
                      <Input
                        value={message.text}
                        onChange={(e) => updateMessage(message.id, e.target.value)}
                        className="flex-1"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => moveMessage(message.id, 'left')}
                      >
                        →
                      </Button>
                    </div>
                  ))}
                  {extractedMessages.left.length === 0 && (
                    <p className="text-gray-500 italic">No messages</p>
                  )}
                </div>
              </div>

              {/* Right Side Messages */}
              <div>
                <h3 className="font-semibold mb-3 text-gray-700">
                  Right Side ({messageSide === 'RIGHT' ? myName : theirName})
                </h3>
                <div className="space-y-2">
                  {extractedMessages.right.map((message) => (
                    <div key={message.id} className="flex items-center space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => moveMessage(message.id, 'right')}
                      >
                        ←
                      </Button>
                      <Input
                        value={message.text}
                        onChange={(e) => updateMessage(message.id, e.target.value)}
                        className="flex-1"
                      />
                    </div>
                  ))}
                  {extractedMessages.right.length === 0 && (
                    <p className="text-gray-500 italic">No messages</p>
                  )}
                </div>
              </div>
            </div>

            {/* Step 5: Submit for Analysis */}
            <div className="mt-6 pt-6 border-t">
              <Button className="w-full" size="lg">
                Analyze Conversation
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}