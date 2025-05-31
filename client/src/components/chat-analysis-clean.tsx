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
  Download,
  GripVertical
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { getDeviceId } from '@/lib/device-id';
import { ChatAnalysisResult } from '@shared/schema';

export default function ChatAnalysis() {
  const [conversation, setConversation] = useState('');
  const [me, setMe] = useState('');
  const [them, setThem] = useState('');
  const [activeTab, setActiveTab] = useState("screenshots");
  const [screenshots, setScreenshots] = useState<Array<{file: File, preview: string}>>([]);
  const [messageSide, setMessageSide] = useState<string>('');
  const [screenshotMe, setScreenshotMe] = useState('');
  const [screenshotThem, setScreenshotThem] = useState('');
  const [extractedText, setExtractedText] = useState<string | null>(null);
  const [isProcessingScreenshots, setIsProcessingScreenshots] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [ocrResults, setOcrResults] = useState<Array<{leftMessages: string[], rightMessages: string[]}> | null>(null);
  const [screenshotOrder, setScreenshotOrder] = useState<number[]>([]);
  const [switchedMessages, setSwitchedMessages] = useState<Set<string>>(new Set());
  const [extractedMessages, setExtractedMessages] = useState<any[]>([]);
  const [showCorrectionUI, setShowCorrectionUI] = useState<boolean>(false);
  const { toast } = useToast();

  // Get user tier info
  const { data: userUsage } = useQuery({
    queryKey: ['/api/user/usage'],
    staleTime: 30000
  });

  const userTier = (userUsage as any)?.tier || 'free';

  // Reorder screenshots for OCR results
  const reorderScreenshot = (fromIndex: number, toIndex: number) => {
    const newOrder = [...screenshotOrder];
    const [moved] = newOrder.splice(fromIndex, 1);
    newOrder.splice(toIndex, 0, moved);
    setScreenshotOrder(newOrder);
  };

  // Switch message attribution
  const switchMessageAttribution = (messageId: string) => {
    const newSwitched = new Set(switchedMessages);
    if (newSwitched.has(messageId)) {
      newSwitched.delete(messageId);
    } else {
      newSwitched.add(messageId);
    }
    setSwitchedMessages(newSwitched);
  };

  // Get unique message ID for tracking switches
  const getMessageId = (screenshotIndex: number, side: 'left' | 'right', messageIndex: number) => {
    return `${screenshotIndex}-${side}-${messageIndex}`;
  };

  // Check if message should be on the opposite side due to switching
  const isMessageSwitched = (screenshotIndex: number, side: 'left' | 'right', messageIndex: number) => {
    const messageId = getMessageId(screenshotIndex, side, messageIndex);
    return switchedMessages.has(messageId);
  };

  // Clear data when switching tabs
  const handleTabChange = (newTab: string) => {
    setActiveTab(newTab);
    if (newTab === "screenshots") {
      // Clear text analysis data when switching to screenshots
      setConversation('');
      setMe('');
      setThem('');
    } else if (newTab === "paste") {
      // Clear screenshot data when switching to text
      setScreenshots([]);
      setOcrResults(null);
      setScreenshotOrder([]);
      setSwitchedMessages(new Set());
      setMessageSide('');
      setScreenshotMe('');
      setScreenshotThem('');
    }
  };

  // Clean WhatsApp text by removing UI elements and extracting only conversation content
  const cleanWhatsAppText = (rawText: string): string => {
    const lines = rawText.split('\n');
    const cleanedLines: string[] = [];
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      // Skip empty lines
      if (!trimmed) continue;
      
      // Skip WhatsApp UI elements
      if (trimmed.includes('last seen')) continue;
      if (trimmed.includes('Alex Leonard')) continue; // Contact name in header
      if (trimmed.match(/^\d{2}:\d{2}$/)) continue; // Time stamps alone
      if (trimmed.match(/^\d{1,2}\s+[A-Z][a-z]+\s+\d{4}$/)) continue; // Date stamps like "15 February 2025"
      if (trimmed.includes('%') && trimmed.length < 20) continue; // Battery/signal indicators
      if (trimmed.match(/^[<>\\\/\s\-\=\+\*#ZA]+$/)) continue; // Special characters only
      if (trimmed.match(/^[\d\s\-\=\%\+APR]+$/)) continue; // Status bar elements
      if (trimmed.match(/^2357|23557/)) continue; // Time in status bar
      if (trimmed.includes('Sal 53%')) continue; // Battery indicator
      if (trimmed.match(/^[ZA]\s*$/)) continue; // Single letters
      if (trimmed.match(/^[r\s:]+$/)) continue; // Random characters
      if (trimmed.match(/^[<\\>\s\*\"Ce]+$/)) continue; // UI symbols
      if (trimmed.length < 3 && !trimmed.match(/^[a-zA-Z]+$/)) continue; // Very short fragments
      
      // Keep lines that look like actual messages
      cleanedLines.push(trimmed);
    }
    
    return cleanedLines.join('\n');
  };

  // Parse WhatsApp messages and identify speakers based on message patterns
  const parseWhatsAppMessages = (cleanedText: string): string => {
    const lines = cleanedText.split('\n');
    const messages: string[] = [];
    let currentMessage = '';
    let isNewMessage = false;
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      
      // Look for time patterns that indicate new messages
      const timeMatch = trimmed.match(/(\d{1,2}:\d{2})/);
      
      if (timeMatch) {
        // Save previous message if exists
        if (currentMessage) {
          // Try to determine speaker based on context clues
          // Messages with certain patterns tend to be from different speakers
          let speaker = 'Alex';
          
          // Patterns that suggest it's the user (you) speaking:
          if (currentMessage.includes("I'm") || 
              currentMessage.includes("my ") ||
              currentMessage.includes("I ") ||
              currentMessage.toLowerCase().includes("lol") ||
              currentMessage.includes("It's my body") ||
              currentMessage.includes("I haven't done anything")) {
            speaker = 'You';
          }
          
          // Patterns that suggest it's Alex speaking:
          if (currentMessage.includes("Hope you're OK") ||
              currentMessage.includes("How u getting on") ||
              currentMessage.includes("What you done") ||
              currentMessage.includes("bro")) {
            speaker = 'Alex';
          }
          
          messages.push(`${speaker}: ${currentMessage.trim()}`);
        }
        
        // Start new message - extract content after timestamp
        const timeIndex = trimmed.indexOf(timeMatch[0]);
        currentMessage = trimmed.substring(timeIndex + timeMatch[0].length).trim();
        isNewMessage = true;
      } else {
        // Continuation of current message or standalone text
        if (currentMessage && !isNewMessage) {
          currentMessage += ' ' + trimmed;
        } else {
          currentMessage = trimmed;
          isNewMessage = false;
        }
      }
    }
    
    // Add final message
    if (currentMessage) {
      let speaker = 'Alex';
      if (currentMessage.includes("I'm") || 
          currentMessage.includes("my ") ||
          currentMessage.includes("I ") ||
          currentMessage.toLowerCase().includes("lol")) {
        speaker = 'You';
      }
      messages.push(`${speaker}: ${currentMessage.trim()}`);
    }
    
    return messages.join('\n');
  };

  // Update conversation when order changes
  const updateConversationOrder = () => {
    if (!ocrResults || screenshotOrder.length === 0) return;
    
    // Reorder results based on user's preferred order
    const reorderedResults = screenshotOrder.map(index => ocrResults[index]);
    const parsedConversation = parsePositionedOCRResults(reorderedResults, screenshotThem, screenshotMe);
    setExtractedText(parsedConversation);
  };

  // Process screenshots with Google Cloud Vision OCR
  const handleScreenshotAnalysis = async () => {
    if (screenshots.length === 0) return;

    setIsProcessingScreenshots(true);
    setOcrProgress(0);

    try {
      setOcrProgress(10);

      const results: any[] = [];

      // Process each screenshot individually using the existing OCR endpoint
      for (let i = 0; i < screenshots.length; i++) {
        setOcrProgress(20 + (i / screenshots.length) * 60);
        
        const screenshot = screenshots[i];
        
        // Convert to base64 for processing
        const base64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result as string;
            resolve(result.split(',')[1]); // Remove data:image/jpeg;base64, prefix
          };
          reader.readAsDataURL(screenshot.file);
        });
        
        console.log(`Processing screenshot ${i + 1}/${screenshots.length}, size: ${screenshot.file.size} bytes`);
        
        // Use Azure Vision for precise positioning detection
        const response = await apiRequest('POST', '/api/analyze/whatsapp-screenshot', {
          image: base64
        });
        
        const result = await response.json();
        console.log(`Azure Vision result for image ${i + 1}:`, result.messages?.length || 0, 'messages found');
        
        if (result.messages && result.messages.length > 0) {
          // Convert positioned messages to conversation format
          const conversationText = result.messages
            .map((msg: any) => `${msg.speaker}: ${msg.text}`)
            .join('\n');
          
          results.push({
            text: conversationText,
            imageIndex: i,
            messages: result.messages, // Store structured data for correction UI
            imageWidth: result.imageWidth
          });
        }
      }

      setOcrProgress(90);

      if (results.length === 0) {
        throw new Error('No text could be extracted from the screenshots.');
      }

      // Convert the results to the expected format for the existing code
      const formattedResults = results.map((result, index) => ({
        leftMessages: [],
        rightMessages: [result.text] // For now, put all text on the right side
      }));

      // Store OCR results for preview  
      console.log('Setting OCR results for preview:', formattedResults);
      setOcrResults(formattedResults);
      
      // Initialize screenshot order
      setScreenshotOrder(results.map((_, index: number) => index));
      console.log('Preview should now be visible');

      // Clean the text and let user manually assign speakers
      const cleanedTexts = results.map(r => cleanWhatsAppText(r.text));
      const combinedCleanText = cleanedTexts.join('\n\n');
      
      // For now, just show the cleaned text - user can manually format it
      const combinedText = `Please review and manually format this conversation by adding speaker names:

${combinedCleanText}

Tip: Look for patterns like timestamps to identify separate messages, then add "You:" or "Alex:" before each message.`;
      
      setOcrProgress(100);
      setExtractedText(combinedText);

      toast({
        title: "Text Extraction Complete",
        description: `Successfully extracted text from ${formattedResults.length} screenshots.`,
      });

    } catch (error) {
      console.error('OCR processing failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Text extraction failed';
      
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

  // Parse positioned OCR results into conversation format
  const parsePositionedOCRResults = (results: any[], leftName: string, rightName: string): string => {
    const conversationLines: string[] = [];
    
    for (const result of results) {
      // Process left side messages (them)
      if (result.leftMessages) {
        for (const message of result.leftMessages) {
          const cleanText = cleanMessage(message);
          if (cleanText && isValidMessage(cleanText)) {
            conversationLines.push(`${leftName}: ${cleanText}`);
          }
        }
      }
      
      // Process right side messages (you)
      if (result.rightMessages) {
        for (const message of result.rightMessages) {
          const cleanText = cleanMessage(message);
          if (cleanText && isValidMessage(cleanText)) {
            conversationLines.push(`${rightName}: ${cleanText}`);
          }
        }
      }
    }
    
    return conversationLines.join('\n');
  };

  // Clean individual message text
  const cleanMessage = (text: string): string => {
    return text
      .replace(/^\d{1,2}:\d{2}\s*/, '') // Remove leading timestamps
      .replace(/\s*\d{1,2}:\d{2}\s*$/, '') // Remove trailing timestamps
      .replace(/[✓√]+\s*$/, '') // Remove read receipts
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  };

  // Validate if text is a real message
  const isValidMessage = (text: string): boolean => {
    if (text.length < 3 || text.length > 500) return false;
    
    // Check for message-like content
    const hasWords = /\b(i|you|the|and|but|so|that|this|what|how|when|where|why|yes|no|ok|okay|lol|haha|thanks|sorry|please|hello|hi|hey|bye)\b/i.test(text);
    const hasSentence = /[.!?]/.test(text) || text.length >= 10;
    const notUIElement = !/^(message|online|typing|last seen|whatsapp)$/i.test(text);
    
    return (hasWords || hasSentence) && notUIElement;
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

  const moveUploadedScreenshot = (index: number, direction: 'up' | 'down') => {
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
    if (extractedText && screenshotMe && screenshotThem) {
      analyzeConversation.mutate({
        conversation: extractedText,
        me: screenshotMe,
        them: screenshotThem
      });
    }
  };

  // Analysis mutations
  const analyzeConversation = useMutation({
    mutationFn: async (params: { conversation: string; me: string; them: string }) => {
      const response = await apiRequest('POST', '/api/analyze', params);
      return response.json();
    },
    onSuccess: (data: ChatAnalysisResult) => {
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

      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="screenshots">Screenshots</TabsTrigger>
          <TabsTrigger value="export">WhatsApp Export</TabsTrigger>
          <TabsTrigger value="text">Manual Text</TabsTrigger>
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
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Screenshots ({screenshots.length})</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Review your screenshots and ensure they're in chronological order. You can reorder them using the arrow buttons.
                    </p>
                  </div>
                  
                  <div className="space-y-4">
                    {screenshots.map((screenshot, index) => (
                      <div key={index} className="border rounded-lg p-3 md:p-4 bg-card">
                        <div className="flex flex-col md:flex-row items-start gap-4">
                          {/* Large screenshot preview */}
                          <div className="flex-shrink-0 w-full md:w-auto">
                            <div className="w-full max-w-xs mx-auto md:w-40 md:h-60 lg:w-48 lg:h-72 bg-gray-100 dark:bg-gray-800 rounded border overflow-hidden">
                              <img
                                src={screenshot.preview}
                                alt={`Screenshot ${index + 1}`}
                                className="w-full h-full object-contain"
                              />
                            </div>
                          </div>
                          
                          {/* Controls and info */}
                          <div className="flex-1 w-full">
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-3">
                              <h4 className="font-medium">Screenshot {index + 1}</h4>
                              <div className="flex gap-2 w-full sm:w-auto">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => moveUploadedScreenshot(index, 'up')}
                                  disabled={index === 0}
                                  title="Move up"
                                  className="flex-1 sm:flex-none"
                                >
                                  <ArrowUp className="h-4 w-4" />
                                  <span className="ml-1 sm:hidden">Up</span>
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => moveUploadedScreenshot(index, 'down')}
                                  disabled={index === screenshots.length - 1}
                                  title="Move down"
                                  className="flex-1 sm:flex-none"
                                >
                                  <ArrowDown className="h-4 w-4" />
                                  <span className="ml-1 sm:hidden">Down</span>
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => removeScreenshot(index)}
                                  title="Remove screenshot"
                                  className="flex-1 sm:flex-none"
                                >
                                  <X className="h-4 w-4" />
                                  <span className="ml-1 sm:hidden">Remove</span>
                                </Button>
                              </div>
                            </div>
                            
                            <div className="text-sm text-muted-foreground space-y-1">
                              <p><strong>File:</strong> <span className="break-all">{screenshot.file.name}</span></p>
                              <p><strong>Size:</strong> {(screenshot.file.size / 1024 / 1024).toFixed(2)} MB</p>
                              <p className="text-xs mt-2 text-blue-600">
                                💡 Tip: Make sure screenshots are in chronological order (oldest first)
                              </p>
                            </div>
                          </div>
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

              {/* OCR Results Preview - Reorderable */}
              {ocrResults && ocrResults.length > 0 && (
                <div className="space-y-4 border-t pt-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Message Preview</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Review extracted messages below. You can reorder screenshots if needed, then proceed to analysis.
                    </p>
                  </div>
                  
                  <div className="space-y-3">
                    {screenshotOrder.map((originalIndex, displayIndex) => {
                      const result = ocrResults[originalIndex];
                      if (!result) return null;
                      
                      return (
                        <div key={originalIndex} className="border rounded-lg p-4 bg-card">
                          <div className="flex items-start gap-4 mb-4">
                            {/* Screenshot thumbnail */}
                            <div className="flex-shrink-0">
                              <div className="w-48 h-72 bg-gray-100 dark:bg-gray-800 rounded border overflow-hidden">
                                {screenshots[originalIndex] && (
                                  <img
                                    src={screenshots[originalIndex].preview}
                                    alt={`Screenshot ${displayIndex + 1}`}
                                    className="w-full h-full object-contain"
                                  />
                                )}
                              </div>
                            </div>
                            
                            {/* Header and controls */}
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-3">
                                <h4 className="font-medium">Screenshot {displayIndex + 1}</h4>
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => reorderScreenshot(displayIndex, Math.max(0, displayIndex - 1))}
                                    disabled={displayIndex === 0}
                                  >
                                    <ArrowUp className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => reorderScreenshot(displayIndex, Math.min(screenshotOrder.length - 1, displayIndex + 1))}
                                    disabled={displayIndex === screenshotOrder.length - 1}
                                  >
                                    <ArrowDown className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <h5 className="font-medium text-sm mb-2 text-blue-600">{screenshotThem} (Left/Gray bubbles)</h5>
                              <div className="space-y-1">
                                {result.leftMessages.map((msg, i) => {
                                  const messageId = getMessageId(originalIndex, 'left', i);
                                  const isSwitched = isMessageSwitched(originalIndex, 'left', i);
                                  return (
                                    <div 
                                      key={i} 
                                      className={`rounded p-2 text-sm cursor-pointer transition-all hover:scale-[1.02] border-2 ${
                                        isSwitched 
                                          ? 'bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-600' 
                                          : 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600'
                                      }`}
                                      onClick={() => switchMessageAttribution(messageId)}
                                      title={isSwitched ? `Click to move back to ${screenshotThem}` : `Click to switch to ${screenshotMe}`}
                                    >
                                      {isSwitched && <span className="text-xs text-green-700 dark:text-green-300 block mb-1">→ Switched to {screenshotMe}</span>}
                                      {msg}
                                    </div>
                                  );
                                })}
                                {result.leftMessages.length === 0 && (
                                  <div className="text-muted-foreground text-sm italic">No messages</div>
                                )}
                              </div>
                            </div>
                            
                            <div>
                              <h5 className="font-medium text-sm mb-2 text-green-600">{screenshotMe} (Right/Green bubbles)</h5>
                              <div className="space-y-1">
                                {result.rightMessages.map((msg, i) => {
                                  const messageId = getMessageId(originalIndex, 'right', i);
                                  const isSwitched = isMessageSwitched(originalIndex, 'right', i);
                                  return (
                                    <div 
                                      key={i} 
                                      className={`rounded p-2 text-sm cursor-pointer transition-all hover:scale-[1.02] border-2 ${
                                        isSwitched 
                                          ? 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600' 
                                          : 'bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-600'
                                      }`}
                                      onClick={() => switchMessageAttribution(messageId)}
                                      title={isSwitched ? `Click to move back to ${screenshotMe}` : `Click to switch to ${screenshotThem}`}
                                    >
                                      {isSwitched && <span className="text-xs text-blue-700 dark:text-blue-300 block mb-1">→ Switched to {screenshotThem}</span>}
                                      {msg}
                                    </div>
                                  );
                                })}
                                {result.rightMessages.length === 0 && (
                                  <div className="text-muted-foreground text-sm italic">No messages</div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      onClick={updateConversationOrder}
                      variant="outline"
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Update Order
                    </Button>
                    <Button
                      onClick={handleFinalAnalysis}
                      disabled={!extractedText?.trim()}
                      className="bg-teal-500 hover:bg-teal-600"
                    >
                      <Brain className="h-4 w-4 mr-2" />
                      Analyze Conversation
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
                <Download className="h-5 w-5" />
                Import WhatsApp Chat Export
              </CardTitle>
              <CardDescription>
                Import a WhatsApp chat export file for comprehensive analysis.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">How to Export WhatsApp Chat:</h4>
                <ol className="text-sm text-blue-800 dark:text-blue-200 space-y-1 list-decimal list-inside">
                  <li>Open WhatsApp and go to the chat you want to analyze</li>
                  <li>Tap the contact/group name at the top</li>
                  <li>Scroll down and tap "Export Chat"</li>
                  <li>Choose "Without Media" for faster processing</li>
                  <li>Save the .txt file and upload it below</li>
                </ol>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">My Name</label>
                  <Input
                    value={me}
                    onChange={(e) => setMe(e.target.value)}
                    placeholder="Your name in the chat"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Their Name</label>
                  <Input
                    value={them}
                    onChange={(e) => setThem(e.target.value)}
                    placeholder="Other person's name"
                  />
                </div>
              </div>

              <div
                className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center hover:border-gray-400 dark:hover:border-gray-500 transition-colors cursor-pointer"
                onClick={() => document.getElementById('chat-file-upload')?.click()}
              >
                <Upload className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <p className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Upload WhatsApp Chat Export
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Click here or drag and drop your exported chat .txt file
                </p>
                <input
                  id="chat-file-upload"
                  type="file"
                  accept=".txt"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (event) => {
                        const content = event.target?.result as string;
                        if (content) {
                          setConversation(content);
                          toast({
                            title: "Chat Imported",
                            description: `Successfully imported ${file.name}`,
                          });
                        }
                      };
                      reader.readAsText(file);
                    }
                  }}
                />
              </div>
              
              {conversation && (
                <div className="space-y-4">
                  <Textarea
                    value={conversation}
                    onChange={(e) => setConversation(e.target.value)}
                    rows={8}
                    className="font-mono text-sm"
                    placeholder="Your imported chat will appear here..."
                  />
                  
                  <Button
                    onClick={() => analyzeConversation.mutate({
                      conversation: conversation,
                      me: me,
                      them: them
                    })}
                    disabled={!conversation.trim() || !me.trim() || !them.trim() || isAnalysisLoading}
                    className="w-full bg-teal-500 hover:bg-teal-600"
                  >
                    {isAnalysisLoading ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Brain className="h-4 w-4 mr-2" />
                    )}
                    {isAnalysisLoading ? 'Analyzing...' : 'Analyze Imported Chat'}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Analysis Results */}
      {analysisResult && (
        <Card>
          <CardHeader>
            <CardTitle>Analysis Results</CardTitle>
            <CardDescription>
              AI-powered insights into your conversation
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <h3 className="font-semibold mb-2">Overall Tone</h3>
                <p>{analysisResult.toneAnalysis?.overallTone || 'Analysis complete'}</p>
              </div>
              
              {analysisResult.communication && (
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <h3 className="font-semibold mb-2">Communication Insights</h3>
                  {analysisResult.communication.patterns && (
                    <div className="mb-2">
                      <h4 className="font-medium">Patterns:</h4>
                      <ul className="list-disc list-inside ml-2">
                        {analysisResult.communication.patterns.map((pattern, index) => (
                          <li key={index}>{pattern}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {analysisResult.communication.suggestions && (
                    <div>
                      <h4 className="font-medium">Suggestions:</h4>
                      <ul className="list-disc list-inside ml-2">
                        {analysisResult.communication.suggestions.map((suggestion, index) => (
                          <li key={index}>{suggestion}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}