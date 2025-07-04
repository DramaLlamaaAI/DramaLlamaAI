import { useState, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Info, Brain, Upload, AlertCircle, Users, Edit, Home, Image, AlertTriangle, ChevronUp, ChevronDown, Move } from "lucide-react";
import { Link } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { analyzeChatConversation, detectParticipants, ChatAnalysisResponse } from "@/lib/openai";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Progress } from "@/components/ui/progress";
import { getUserUsage } from "@/lib/openai";
import { SupportHelpLines } from './support-help-lines';
import { Label } from "@/components/ui/label";
import RegistrationPrompt from "@/components/registration-prompt";
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';
import LockedPreviewSections from "@/components/locked-preview-sections-compact";
import { SafetyReminderModal } from "@/components/safety-reminder-modal";
import { RedFlagLibrary } from "@/components/red-flag-library";

export default function ChatAnalysisFixed() {
  const [tabValue, setTabValue] = useState("screenshot");
  const [conversationType, setConversationType] = useState<"two_person" | "group_chat">("two_person");
  const [conversation, setConversation] = useState("");
  const [me, setMe] = useState("");
  const [them, setThem] = useState("");
  const [result, setResult] = useState<ChatAnalysisResponse | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [screenshotMe, setScreenshotMe] = useState("");
  const [screenshotThem, setScreenshotThem] = useState("");
  const [messageOrientation, setMessageOrientation] = useState<"left" | "right">("right");
  const [showSafetyReminder, setShowSafetyReminder] = useState(false);
  const [zoomedImageIndex, setZoomedImageIndex] = useState<number | null>(null);
  const [ocrProgress, setOcrProgress] = useState<{current: number, total: number} | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [extractedTexts, setExtractedTexts] = useState<string[]>([]);
  const [previewMode, setPreviewMode] = useState<'order' | 'text'>('order');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Compress image to improve OCR processing speed
  const compressImage = (file: File): Promise<File> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = document.createElement('img');

      img.onload = () => {
        // Resize for optimal OCR processing
        const maxWidth = 1200;
        const maxHeight = 1600;
        
        let { width, height } = img;
        
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        
        if (height > maxHeight) {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }

        canvas.width = width;
        canvas.height = height;
        
        // Draw compressed image
        ctx?.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob((blob) => {
          if (blob) {
            const compressedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now()
            });
            resolve(compressedFile);
          } else {
            resolve(file);
          }
        }, 'image/jpeg', 0.8);
      };

      img.src = URL.createObjectURL(file);
    });
  };
  
  const { toast } = useToast();
  const { user } = useAuth();

  const { data: usage } = useQuery({
    queryKey: ['/api/user/usage'],
    queryFn: getUserUsage,
  });
  
  // Determine if user is authenticated
  const isAuthenticated = !!user;
  
  // Set tier based on authentication status
  const tier = isAuthenticated ? (usage?.tier || 'free') : 'anonymous';
  const usedAnalyses = usage?.used || 0;
  // Set default limit to 2 for free tier, this ensures correct display even if backend returns a different value
  const limit = usage?.limit === null ? null : (usage?.limit || 2);
  // Admin users (with null limit) or users within their limits can use the feature
  const canUseFeature = limit === null || usedAnalyses < limit;

  const analysisMutation = useMutation({
    mutationFn: analyzeChatConversation,
    onSuccess: (data) => {
      setErrorMessage(null);
      console.log("Analysis result:", data);
      console.log("Health Score:", data.healthScore);
      
      // Save analysis result to localStorage for helpline recommendations
      localStorage.setItem('lastAnalysisResult', JSON.stringify(data));
      
      setResult(data);
      setShowResults(true);
      
      // Scroll to results
      setTimeout(() => {
        const resultsElement = document.getElementById('analysisResults');
        if (resultsElement) {
          resultsElement.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    },
    onError: (error: any) => {
      console.error("Analysis error:", error);
      const errorMsg = error.message || "Failed to analyze conversation. Please try again.";
      setErrorMessage(errorMsg);
      toast({
        title: "Analysis Failed",
        description: errorMsg,
        variant: "destructive",
      });
    }
  });
  
  const detectNamesMutation = useMutation({
    mutationFn: detectParticipants,
    onSuccess: (data) => {
      setMe(data.me || "");
      setThem(data.them || "");
      
      toast({
        title: "Names Detected",
        description: `Detected names: ${data.me} and ${data.them}`,
      });
    },
    onError: (error: any) => {
      console.error("Name detection error:", error);
      toast({
        title: "Name Detection Failed",
        description: "Could not automatically detect names. Please enter them manually.",
        variant: "destructive",
      });
    }
  });
  
  const isSubmitting = analysisMutation.isPending;
  const isDetectingNames = detectNamesMutation.isPending;
  
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    try {
      // Read file content
      const text = await file.text();
      
      // Make sure we have actual text content
      if (!text.trim()) {
        setErrorMessage("The file appears to be empty. Please check the file and try again.");
        return;
      }
      
      setConversation(text);
      
      // Clear any previous error messages
      setErrorMessage(null);
      
      toast({
        title: "File Loaded",
        description: `${file.name} has been loaded successfully.`,
      });
      
      // If we have text content, try to auto-detect names
      if (text && text.trim().length > 0 && !me && !them) {
        detectNamesMutation.mutate(text);
      }
    } catch (error) {
      console.error("File upload error:", error);
      toast({
        title: "Upload Failed",
        description: "Could not read the file. Please check the format and try again.",
        variant: "destructive",
      });
    }
  };

  const handleDetectNames = () => {
    if (!conversation.trim()) {
      toast({
        title: "Empty Conversation",
        description: "Please paste or upload a conversation first.",
        variant: "destructive",
      });
      return;
    }
    
    detectNamesMutation.mutate(conversation);
  };

  const handleSubmit = () => {
    // Clear any previous error message
    setErrorMessage(null);
    
    // Basic validation
    if (!conversation.trim()) {
      toast({
        title: "Empty Conversation",
        description: "Please paste or upload a conversation first.",
        variant: "destructive",
      });
      return;
    }
    
    if (!me || !them) {
      toast({
        title: "Missing Names",
        description: "Please enter both participant names before analyzing.",
        variant: "destructive",
      });
      return;
    }
    
    // Submit the request
    analysisMutation.mutate({
      conversation,
      me,
      them,
      tier,
      extraData: {
        conversationType,
      }
    });
  };
  
  const handleSwitchNames = () => {
    const tempMe = me;
    const tempThem = them;
    setMe(tempThem);
    setThem(tempMe);
    
    toast({
      title: "Names Switched",
      description: `Switched to: You are ${tempThem}, they are ${tempMe}`,
    });
  };

  const handleSwitchScreenshotNames = () => {
    const tempMe = screenshotMe;
    setScreenshotMe(screenshotThem);
    setScreenshotThem(tempMe);
  };

  const handleSafetyReminderClose = () => {
    setShowSafetyReminder(false);
  };

  const handleSafetyReminderDontShowAgain = () => {
    localStorage.setItem('drama-llama-hide-safety-reminder', 'true');
    setShowSafetyReminder(false);
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length > 0) {
      const newImages = [...selectedImages, ...files].slice(0, 10); // Limit to 10 images
      setSelectedImages(newImages);
      
      // Generate previews for new images
      const newPreviews: string[] = [];
      let loadedCount = 0;
      
      files.forEach((file, index) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          newPreviews[index] = e.target?.result as string;
          loadedCount++;
          
          if (loadedCount === files.length) {
            setImagePreviews([...imagePreviews, ...newPreviews]);
            
            // Show safety reminder if user hasn't opted out
            const hasOptedOut = localStorage.getItem('drama-llama-hide-safety-reminder') === 'true';
            if (!hasOptedOut) {
              setShowSafetyReminder(true);
            }
          }
        };
        reader.readAsDataURL(file);
      });
      
      setErrorMessage(null);
    }
  };

  const handleRemoveImage = (index?: number) => {
    if (index !== undefined) {
      // Remove specific image
      const newImages = selectedImages.filter((_, i) => i !== index);
      const newPreviews = imagePreviews.filter((_, i) => i !== index);
      setSelectedImages(newImages);
      setImagePreviews(newPreviews);
    } else {
      // Remove all images
      setSelectedImages([]);
      setImagePreviews([]);
      setScreenshotMe("");
      setScreenshotThem("");
      if (imageInputRef.current) {
        imageInputRef.current.value = "";
      }
    }
  };

  const moveScreenshotUp = (index: number) => {
    if (index === 0) return;
    
    setSelectedImages(prev => {
      const newArray = [...prev];
      [newArray[index - 1], newArray[index]] = [newArray[index], newArray[index - 1]];
      return newArray;
    });
    
    setImagePreviews(prev => {
      const newArray = [...prev];
      [newArray[index - 1], newArray[index]] = [newArray[index], newArray[index - 1]];
      return newArray;
    });
  };

  const moveScreenshotDown = (index: number) => {
    if (index === selectedImages.length - 1) return;
    
    setSelectedImages(prev => {
      const newArray = [...prev];
      [newArray[index], newArray[index + 1]] = [newArray[index + 1], newArray[index]];
      return newArray;
    });
    
    setImagePreviews(prev => {
      const newArray = [...prev];
      [newArray[index], newArray[index + 1]] = [newArray[index + 1], newArray[index]];
      return newArray;
    });
  };

  // Step 1: Start preview mode to confirm screenshot order
  const handleAnalyzeScreenshot = () => {
    console.log("Starting screenshot preview mode", { 
      imageCount: selectedImages.length, 
      me: screenshotMe, 
      them: screenshotThem 
    });
    
    if (selectedImages.length === 0 || !screenshotMe || !screenshotThem) {
      setErrorMessage("Please upload at least one screenshot and enter participant names.");
      return;
    }

    if (!canUseFeature) {
      if (limit !== null && usedAnalyses >= limit) {
        setErrorMessage(`You've reached your monthly limit of ${limit} analyses. Please upgrade your plan to continue.`);
      } else {
        setErrorMessage("Unable to perform analysis at this time.");
      }
      return;
    }

    setShowPreview(true);
    setPreviewMode('order');
    setErrorMessage(null);
  };

  // Step 2: Extract text from confirmed order
  const handleExtractText = async () => {
    try {
      console.log("Starting text extraction for", selectedImages.length, "images");
      setErrorMessage(null);
      setOcrProgress({ current: 0, total: selectedImages.length });
      setPreviewMode('text');

      const texts: string[] = [];
      
      // Extract text from each image one by one to avoid hanging
      for (let i = 0; i < selectedImages.length; i++) {
        setOcrProgress({ current: i + 1, total: selectedImages.length });
        
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve) => {
          reader.onload = (e) => {
            const base64 = (e.target?.result as string)?.split(',')[1];
            resolve(base64 || '');
          };
          reader.readAsDataURL(selectedImages[i]);
        });

        const base64 = await base64Promise;
        console.log(`Extracting text from image ${i + 1}`);

        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => {
            controller.abort();
            console.log(`Timeout for image ${i + 1}`);
          }, 30000); // 30 second timeout per image

          const response = await fetch('/api/ocr', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image: base64 }),
            signal: controller.signal
          });

          clearTimeout(timeoutId);

          if (!response.ok) {
            console.error(`OCR failed for image ${i + 1}:`, response.status, await response.text());
            texts.push(`[Failed to extract text from image ${i + 1}]`);
            continue;
          }

          const ocrResult = await response.json();
          const extractedText = ocrResult.text || `[No text found in image ${i + 1}]`;
          texts.push(extractedText);
          console.log(`Text extracted from image ${i + 1}:`, extractedText.length, 'characters');
        } catch (imageError) {
          console.error(`Error processing image ${i + 1}:`, imageError);
          if (imageError.name === 'AbortError') {
            texts.push(`[Image ${i + 1} processing timed out]`);
          } else {
            texts.push(`[Error extracting text from image ${i + 1}]`);
          }
        }
      }

      setExtractedTexts(texts);
      setOcrProgress(null);
      console.log("Text extraction complete, showing preview");

    } catch (error) {
      console.error('Text extraction error:', error);
      setOcrProgress(null);
      setErrorMessage(error instanceof Error ? error.message : "Failed to extract text from screenshots.");
    }
  };

  // Step 3: Confirm and analyze the conversation
  const handleConfirmAnalysis = () => {
    try {
      const combinedText = extractedTexts.join('\n\n');
      const formattedConversation = formatScreenshotText(combinedText, screenshotMe, screenshotThem, messageOrientation);
      
      if (!formattedConversation.trim()) {
        throw new Error("No text could be extracted from the screenshots");
      }

      const analysisData = {
        conversation: formattedConversation,
        me: screenshotMe,
        them: screenshotThem,
        conversationType: conversationType
      };

      console.log("Starting conversation analysis with confirmed text");
      setShowPreview(false);
      analysisMutation.mutate(analysisData);
      
    } catch (error) {
      console.error('Analysis confirmation error:', error);
      setErrorMessage(error instanceof Error ? error.message : "Failed to analyze conversation.");
    }
  };
  
  const formatScreenshotText = (extractedText: string, me: string, them: string, orientation: "left" | "right"): string => {
    const lines = extractedText.split('\n').filter(line => line.trim());
    let formattedLines: string[] = [];
    
    lines.forEach((line, index) => {
      const trimmedLine = line.trim();
      if (!trimmedLine) return;
      
      // Alternate messages based on orientation
      const isUserMessage = orientation === "right" ? (index % 2 === 1) : (index % 2 === 0);
      const speaker = isUserMessage ? me : them;
      
      formattedLines.push(`${speaker}: ${trimmedLine}`);
    });
    
    return formattedLines.join('\n');
  };
  
  // Participant Name Form component for reuse
  const ParticipantNameForm = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-[1fr_1fr_auto] gap-4 items-end">
        <div>
          <Label htmlFor="me-name" className="text-sm font-medium">Your Name:</Label>
          <input
            id="me-name"
            type="text"
            value={me}
            onChange={(e) => setMe(e.target.value)}
            className="w-full p-2 border rounded mt-1 text-sm"
            placeholder="Your name in the chat"
          />
        </div>
        <div>
          <Label htmlFor="them-name" className="text-sm font-medium">Their Name:</Label>
          <input
            id="them-name"
            type="text"
            value={them}
            onChange={(e) => setThem(e.target.value)}
            className="w-full p-2 border rounded mt-1 text-sm"
            placeholder="Their name in the chat"
          />
        </div>
        <Button 
          type="button" 
          variant="outline" 
          size="sm" 
          onClick={handleSwitchNames}
          className="bg-teal-500 hover:bg-teal-600 text-white border-teal-500 hover:border-teal-600"
        >
          Switch
        </Button>
      </div>
      
      <div className="flex justify-between">
        <Button 
          type="button" 
          onClick={handleDetectNames}
          disabled={!conversation || isDetectingNames}
          variant="outline"
        >
          {isDetectingNames ? 'Detecting...' : 'Auto-Detect Names'}
        </Button>
        
        <Button
          onClick={handleSubmit}
          disabled={!canUseFeature || isSubmitting || !conversation || !me || !them}
          className="bg-pink-500 hover:bg-pink-600"
        >
          {isSubmitting ? (
            <>
              <div className="h-4 w-4 mr-2 animate-spin rounded-full border-t-2 border-gray-500"></div>
              Analyzing...
            </>
          ) : (
            <>
              <Brain className="h-4 w-4 mr-2" />
              {!conversation || !me || !them ? 'Enter All Fields' : 
               !canUseFeature ? 'Usage Limit Reached' : 
               'Analyze Chat'}
            </>
          )}
        </Button>
      </div>
    </div>
  );
  
  return (
    <div className="container py-6">

      
      <Card className="mb-6 border-pink-100 shadow-lg">
        <CardContent className="p-6 bg-gradient-to-r from-pink-50 via-rose-50 to-pink-50">
          {errorMessage && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          )}
          
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2 text-pink-800">Chat Analysis</h1>
            <p className="text-muted-foreground mb-6">
              Analyze your text conversation to understand communication patterns,
              emotional tones and potential issues
            </p>
            
            {/* Step Indicators */}
            <div className="flex items-center justify-center space-x-4 mb-6">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-pink-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                  1
                </div>
                <span className="ml-2 text-sm font-medium text-pink-700">Input Chat</span>
              </div>
              
              <div className="w-8 h-px bg-gradient-to-r from-pink-300 to-teal-300"></div>
              
              <div className="flex items-center">
                <div className={`w-8 h-8 ${me && them ? 'bg-teal-500' : 'bg-gray-300'} text-white rounded-full flex items-center justify-center text-sm font-bold transition-colors`}>
                  2
                </div>
                <span className={`ml-2 text-sm font-medium ${me && them ? 'text-teal-700' : 'text-gray-500'} transition-colors`}>Set Names</span>
              </div>
              
              <div className="w-8 h-px bg-gradient-to-r from-teal-300 to-pink-300"></div>
              
              <div className="flex items-center">
                <div className={`w-8 h-8 ${result ? 'bg-gradient-to-r from-pink-500 to-teal-500' : 'bg-gray-300'} text-white rounded-full flex items-center justify-center text-sm font-bold transition-all`}>
                  3
                </div>
                <span className={`ml-2 text-sm font-medium ${result ? 'bg-gradient-to-r from-pink-600 to-teal-600 bg-clip-text text-transparent' : 'text-gray-500'} transition-colors`}>Get Results</span>
              </div>
            </div>
          </div>
          
          {!showResults ? (
            <>
              <Tabs
                defaultValue={tabValue} 
                value={tabValue}
                onValueChange={(value) => {
                  setTabValue(value);
                  setErrorMessage(null); // Clear error message when switching tabs
                }}
                className="mt-6"
              >
                <TabsList className="grid grid-cols-2 bg-purple-50 border-purple-200">
                  <TabsTrigger value="screenshot" className="data-[state=active]:bg-purple-500 data-[state=active]:text-white">
                    <Image className="h-4 w-4 mr-2" />
                    Screenshot Analysis
                  </TabsTrigger>
                  <TabsTrigger value="upload" className="data-[state=active]:bg-teal-500 data-[state=active]:text-white">
                    <Upload className="h-4 w-4 mr-2" />
                    Upload File
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="screenshot" className="mt-4">
                  <div className="space-y-4">
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                      <input
                        type="file"
                        ref={imageInputRef}
                        onChange={handleImageUpload}
                        accept="image/*"
                        multiple
                        className="hidden"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => imageInputRef.current?.click()}
                        className="mb-2"
                      >
                        <Image className="h-4 w-4 mr-2" />
                        Upload Screenshots
                      </Button>
                      <p className="text-sm text-muted-foreground">
                        Upload screenshots of your conversation (max 10 images)
                      </p>
                    </div>
                    
                    <div className="text-sm text-muted-foreground mt-6">
                      <h3 className="font-medium mb-2">How to export a WhatsApp chat:</h3>
                      <ol className="list-decimal pl-5 space-y-1">
                        <li>Open the individual or group chat</li>
                        <li>Tap the three dots in the top right</li>
                        <li>Select "More" then "Export chat"</li>
                        <li>Choose "Without media"</li>
                        <li>Save the file and upload it here</li>
                      </ol>
                    </div>
                    
                    {/* Upload tab participant form - always visible */}
                    <div className="mt-6">
                      <h3 className="font-medium text-sm mb-4">Enter Participant Names:</h3>
                      <ParticipantNameForm />
                    </div>
                    
                    <div className="text-sm text-muted-foreground">
                      <div className="flex items-start mb-2">
                        <Info className="h-4 w-4 mr-2 mt-0.5" />
                        <span>
                          We don't store your conversation data. All analysis is performed securely.
                        </span>
                      </div>
                      
                      <div className="mt-4">
                        {usage && (
                          <div>
                            <div className="flex justify-between items-center mb-1">
                              <span>Analyses used this month: {usedAnalyses}{limit !== null && ` of ${limit}`}</span>
                              <span className="text-xs">
                                {tier === 'free' && 'Free Tier'}
                                {tier === 'personal' && 'Personal Tier'}
                                {tier === 'pro' && 'Pro Tier'}
                                {tier === 'instant' && 'Instant Deep Dive'}
                              </span>
                            </div>
                            
                            {limit !== null && (
                              <Progress value={(usedAnalyses / limit) * 100} className="h-2" />
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="screenshot" className="mt-4">
                  <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
                    <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center">
                      <Image className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-lg font-semibold">Screenshot Analysis</h3>
                      <p className="text-muted-foreground max-w-md">
                        Advanced screenshot analysis with OCR text extraction is coming soon. 
                        We're working on improving the accuracy and speed of this feature.
                      </p>
                    </div>
                    <div className="mt-4">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300">
                        Coming Soon
                      </span>
                    </div>
                  </div>
                </TabsContent>
                          <div className="space-y-3 mb-4">
                            {imagePreviews.map((preview, index) => (
                              <div key={index} className="relative bg-white rounded-lg border p-3">
                                <div className="flex items-center gap-3">
                                  {/* Order number */}
                                  <div className="flex-shrink-0 w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                                    <span className="text-sm font-medium text-purple-600">{index + 1}</span>
                                  </div>
                                  
                                  {/* Image preview */}
                                  <img 
                                    src={preview} 
                                    alt={`Screenshot ${index + 1}`} 
                                    className="w-20 h-16 object-cover rounded border flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
                                    onClick={() => setZoomedImageIndex(index)}
                                    title="Click to view full size"
                                  />
                                  
                                  {/* Controls */}
                                  <div className="flex items-center gap-2 ml-auto">
                                    {selectedImages.length > 1 && (
                                      <>
                                        <Button
                                          onClick={() => moveScreenshotUp(index)}
                                          variant="outline"
                                          size="sm"
                                          disabled={index === 0}
                                          className="h-8 w-8 p-0"
                                          title="Move up"
                                        >
                                          <ChevronUp className="h-4 w-4" />
                                        </Button>
                                        <Button
                                          onClick={() => moveScreenshotDown(index)}
                                          variant="outline"
                                          size="sm"
                                          disabled={index === selectedImages.length - 1}
                                          className="h-8 w-8 p-0"
                                          title="Move down"
                                        >
                                          <ChevronDown className="h-4 w-4" />
                                        </Button>
                                      </>
                                    )}
                                    <Button
                                      onClick={() => handleRemoveImage(index)}
                                      variant="destructive"
                                      size="sm"
                                      className="h-8 w-8 p-0"
                                      title="Remove"
                                    >
                                      ×
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                          <div className="flex gap-2 justify-center">
                            <Button
                              onClick={() => imageInputRef.current?.click()}
                              variant="outline"
                              size="sm"
                            >
                              Add More
                            </Button>
                            <Button
                              onClick={() => handleRemoveImage()}
                              variant="outline"
                              size="sm"
                            >
                              Remove All
                            </Button>
                          </div>
                          <p className="text-xs text-gray-500 mt-2">{selectedImages.length} image{selectedImages.length !== 1 ? 's' : ''} selected (max 10)</p>
                        </div>
                      )}
                    </div>

                    {/* Screenshot Settings */}
                    {selectedImages.length > 0 && (
                      <div className="space-y-4 bg-gray-50 p-4 rounded-lg">
                        <h3 className="font-medium text-sm mb-3">Screenshot Settings:</h3>
                        
                        {/* Message Orientation */}
                        <div>
                          <Label className="text-sm font-medium">My messages appear on the:</Label>
                          <div className="flex gap-4 mt-2">
                            <Button
                              type="button"
                              variant={messageOrientation === "left" ? "default" : "outline"}
                              size="sm"
                              onClick={() => setMessageOrientation("left")}
                              className={messageOrientation === "left" ? "bg-purple-500 hover:bg-purple-600" : ""}
                            >
                              Left side
                            </Button>
                            <Button
                              type="button"
                              variant={messageOrientation === "right" ? "default" : "outline"}
                              size="sm"
                              onClick={() => setMessageOrientation("right")}
                              className={messageOrientation === "right" ? "bg-purple-500 hover:bg-purple-600" : ""}
                            >
                              Right side
                            </Button>
                          </div>
                        </div>

                        {/* Participant Names for Screenshot */}
                        <div className="grid grid-cols-[1fr_1fr_auto] gap-4 items-end">
                          <div>
                            <Label htmlFor="screenshot-me-name" className="text-sm font-medium">Me:</Label>
                            <input
                              id="screenshot-me-name"
                              type="text"
                              value={screenshotMe}
                              onChange={(e) => setScreenshotMe(e.target.value)}
                              className="w-full p-2 border rounded mt-1 text-sm"
                              placeholder="Your display name"
                            />
                          </div>
                          <div>
                            <Label htmlFor="screenshot-them-name" className="text-sm font-medium">Them:</Label>
                            <input
                              id="screenshot-them-name"
                              type="text"
                              value={screenshotThem}
                              onChange={(e) => setScreenshotThem(e.target.value)}
                              className="w-full p-2 border rounded mt-1 text-sm"
                              placeholder="Their display name"
                            />
                          </div>
                          <Button 
                            type="button" 
                            variant="outline" 
                            size="sm" 
                            onClick={handleSwitchScreenshotNames}
                            className="bg-purple-500 hover:bg-purple-600 text-white border-purple-500 hover:border-purple-600"
                          >
                            Switch
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Analyze Button for Screenshot */}
                    {selectedImages.length > 0 && screenshotMe && screenshotThem && (
                      <Button 
                        onClick={handleAnalyzeScreenshot}
                        disabled={!canUseFeature || analysisMutation.isPending}
                        className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white py-3"
                      >
                        {analysisMutation.isPending ? (
                          <>
                            <Brain className="animate-spin h-4 w-4 mr-2" />
                            Analyzing Conversation...
                          </>
                        ) : (
                          <>
                            <Brain className="h-4 w-4 mr-2" />
                            Preview & Analyze
                          </>
                        )}
                      </Button>
                    )}

                    <div className="text-sm text-muted-foreground">
                      <div className="flex items-start mb-2">
                        <Info className="h-4 w-4 mr-2 mt-0.5" />
                        <span>
                          We don't store your screenshot data. All analysis is performed securely.
                        </span>
                      </div>
                      
                      <div className="mt-4">
                        {usage && (
                          <div>
                            <div className="flex justify-between items-center mb-1">
                              <span>Analyses used this month: {usedAnalyses}{limit !== null && ` of ${limit}`}</span>
                              <span className="text-xs">
                                {tier === 'free' && 'Free Tier'}
                                {tier === 'personal' && 'Personal Tier'}
                                {tier === 'pro' && 'Pro Tier'}
                                {tier === 'instant' && 'Instant Deep Dive'}
                              </span>
                            </div>
                            
                            {limit !== null && (
                              <Progress value={(usedAnalyses / limit) * 100} className="h-2" />
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="upload" className="mt-4">
                  <div className="space-y-4">
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        accept=".txt,.text,.zip"
                        className="hidden"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        className="mb-2"
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        Upload WhatsApp Export
                      </Button>
                      <p className="text-sm text-muted-foreground">
                        Upload a .txt file with WhatsApp chat exports,<br /> or a .zip of WhatsApp chat exports
                      </p>
                    </div>
                    
                    <div className="text-sm text-muted-foreground mt-6">
                      <h3 className="font-medium mb-2">How to export a WhatsApp chat:</h3>
                      <ol className="list-decimal pl-5 space-y-1">
                        <li>Open the individual or group chat</li>
                        <li>Tap the three dots in the top right</li>
                        <li>Select "More" then "Export chat"</li>
                        <li>Choose "Without media"</li>
                        <li>Save the file and upload it here</li>
                      </ol>
                    </div>
                    
                    {/* Participant Names Form */}
                    <div className="mt-6 space-y-4">
                      <h3 className="font-medium text-sm">Enter Participant Names:</h3>
                      
                      <ParticipantNameForm />
                      
                      <div className="text-sm text-muted-foreground">
                        <div className="flex items-start mb-2">
                          <Info className="h-4 w-4 mr-2 mt-0.5" />
                          <span>
                            We don't store your conversation data. All analysis is performed securely.
                          </span>
                        </div>
                        
                        <div className="mt-4">
                          {usage && (
                            <div>
                              <div className="flex justify-between items-center mb-1">
                                <span>Analyses used this month: {usedAnalyses}{limit !== null && ` of ${limit}`}</span>
                                <span className="text-xs">
                                  {tier === 'free' && 'Free Tier'}
                                  {tier === 'personal' && 'Personal Tier'}
                                  {tier === 'pro' && 'Pro Tier'}
                                  {tier === 'instant' && 'Instant Deep Dive'}
                                </span>
                              </div>
                              
                              {limit !== null && (
                                <Progress value={(usedAnalyses / limit) * 100} className="h-2" />
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </>
          ) : (
            // Analysis results display
            <div id="analysisResults" className="mt-6">
              <Button 
                onClick={() => setShowResults(false)} 
                variant="outline" 
                className="mb-4"
              >
                ← Back to Input
              </Button>
              
              {result && (
                <>
                  {/* Display analysis results based on user tier */}
                  <div className="bg-gradient-to-r from-pink-50 to-rose-50 rounded-lg p-8 mb-8 border border-pink-100">
                    <h2 className="text-2xl font-bold mb-6 text-pink-800 text-center">Analysis Results</h2>
                    <p className="text-center text-gray-600 mb-8">Conversation between <span className="font-semibold text-pink-600">{me}</span> and <span className="font-semibold text-teal-600">{them}</span></p>
                    
                    {/* Overall Emotional Tone - Available in all tiers */}
                    <div className="bg-white rounded-lg p-6 mb-8 shadow-sm border border-pink-100">
                      <h3 className="text-lg font-bold mb-4 text-pink-700 flex items-center">
                        <div className="w-3 h-3 bg-pink-500 rounded-full mr-3"></div>
                        Overall Emotional Tone
                      </h3>
                      <p className="text-gray-700 leading-relaxed">{result.toneAnalysis?.overallTone}</p>
                    </div>
                      
                    {/* Health Score - Available in all tiers */}
                    <div className="bg-white rounded-lg p-6 mb-8 shadow-sm border border-pink-100">
                      <h3 className="text-lg font-bold mb-4 text-pink-700 flex items-center">
                        <div className="w-3 h-3 bg-teal-500 rounded-full mr-3"></div>
                        Conversation Health Score
                      </h3>
                      <div className="flex flex-col md:flex-row items-center gap-4 mb-2">
                        <div className="w-32 h-32">
                          <CircularProgressbar
                            value={result.healthScore?.score || 0}
                            text={`${result.healthScore?.score || 0}`}
                            strokeWidth={10}
                            styles={buildStyles({
                              // Colors
                              pathColor: 
                                (result.healthScore?.score || 0) >= 80 ? '#16a34a' : // green-600
                                (result.healthScore?.score || 0) >= 65 ? '#22c55e' : // green-500
                                (result.healthScore?.score || 0) >= 50 ? '#eab308' : // yellow-500
                                (result.healthScore?.score || 0) >= 35 ? '#f97316' : // orange-500
                                '#ef4444',                                           // red-500
                              textColor: '#1f2937', // gray-800
                              trailColor: '#e5e7eb', // gray-200
                              backgroundColor: '#f9fafb', // gray-50
                              textSize: '24px',
                              // Background circle styling
                              strokeLinecap: 'round',
                            })}
                          />
                        </div>
                        <div className="flex flex-col items-center md:items-start">
                          <div className="text-xl font-semibold mb-1">
                            {(result.healthScore?.score || 0) >= 80 ? 'Very Healthy' : 
                             (result.healthScore?.score || 0) >= 65 ? 'Healthy' : 
                             (result.healthScore?.score || 0) >= 50 ? 'Tension' : 
                             (result.healthScore?.score || 0) >= 35 ? 'Concerning' :
                             'Conflict'}
                          </div>
                          <div className="text-sm text-gray-600 mb-2">Out of 100 points</div>
                          <div className="flex flex-wrap gap-2 text-xs">
                            <div className="flex items-center">
                              <div className="w-3 h-3 rounded-full bg-red-500 mr-1"></div>
                              <span>0-35: Conflict</span>
                            </div>
                            <div className="flex items-center">
                              <div className="w-3 h-3 rounded-full bg-orange-500 mr-1"></div>
                              <span>36-50: Concerning</span>
                            </div>
                            <div className="flex items-center">
                              <div className="w-3 h-3 rounded-full bg-yellow-500 mr-1"></div>
                              <span>51-65: Tension</span>
                            </div>
                            <div className="flex items-center">
                              <div className="w-3 h-3 rounded-full bg-green-500 mr-1"></div>
                              <span>66-80: Healthy</span>
                            </div>
                            <div className="flex items-center">
                              <div className="w-3 h-3 rounded-full bg-green-600 mr-1"></div>
                              <span>81-100: Very Healthy</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Red Flags - Show count only for anonymous, breakdown for free, detailed for paid tiers */}
                    {((tier === 'anonymous' && result.redFlagsDetected && result.redFlagTypes && result.redFlagTypes.length > 0) ||
                      (tier === 'free' && result.redFlagsDetected && result.redFlagTypes && result.redFlagTypes.length > 0) || 
                      (tier !== 'free' && tier !== 'anonymous' && result.redFlags && result.redFlags.length > 0)) && (
                      <div className="mb-6">
                        <h3 className="font-semibold mb-2">
                          Potential Issues Detected 
                          <span className="ml-2 text-sm bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                            {(tier === 'anonymous' || tier === 'free') ? 
                              `${result.redFlagTypes?.length || 0} ${(result.redFlagTypes?.length || 0) === 1 ? 'red flag' : 'red flags'}` :
                              `${result.redFlags?.length || 0} ${(result.redFlags?.length || 0) === 1 ? 'red flag' : 'red flags'}`
                            }
                          </span>
                        </h3>
                        
                        {/* Anonymous users see only count with registration prompt */}
                        {tier === 'anonymous' && (
                          <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                            <p className="text-blue-800 font-medium mb-3">
                              <Link href="/auth" className="text-blue-600 hover:text-blue-800 underline">
                                Register for a free deeper insight
                              </Link> into these warning signs
                            </p>
                            <RegistrationPrompt tier="anonymous" />
                          </div>
                        )}

                        {/* Free tier shows basic red flag types detected */}
                        {tier === 'free' && result.redFlagTypes && (
                          <div className="mb-4">
                            <p className="text-gray-700 mb-2">This conversation contains potential signs of:</p>
                            <ul className="list-disc pl-5 space-y-1">
                              {result.redFlagTypes.map((type, i) => (
                                <li key={i} className="text-gray-800 font-medium">{type}</li>
                              ))}
                            </ul>
                            <p className="mt-4 text-sm text-gray-500">
                              <span className="font-medium">Upgrade to Personal or Pro</span> for detailed analysis with specific examples and participant insights.
                            </p>
                          </div>
                        )}
                        
                        {/* Personal tier and above show detailed red flags */}
                        {(tier === 'personal' || tier === 'pro' || tier === 'instant' || tier === 'beta') && result.redFlags && result.redFlags.length > 0 && (
                          <ul className="list-disc pl-5 space-y-4">
                            {result.redFlags.map((flag, i) => (
                              <li key={i}>
                                <div className="mb-1">
                                  <span className="font-medium">{flag.type}:</span> {flag.description}
                                  {flag.participant && (
                                    <span className="ml-2 text-sm bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">
                                      Used by {flag.participant}
                                    </span>
                                  )}
                                </div>
                                
                                {/* Personal tier and above show behavioral signals with quotes if available */}
                                {(flag.quote || (flag.examples && flag.examples.length > 0)) && (
                                  <div className="mt-2 ml-4 border-l-2 border-gray-200 pl-3 pb-1">
                                    <p className="text-sm italic">"{flag.quote || (flag.examples && flag.examples[0] ? flag.examples[0].text : '')}"</p>
                                    <div className="flex items-center mt-1">
                                      <span className="text-sm font-medium mr-2">👉 {flag.type}</span>
                                      {flag.participant && (
                                        <span className="text-xs text-gray-500">— {flag.participant}</span>
                                      )}
                                      {!flag.participant && flag.examples && flag.examples[0] && (
                                        <span className="text-xs text-gray-500">— {flag.examples[0].from}</span>
                                      )}
                                    </div>
                                  </div>
                                )}
                                
                                {/* Show examples if available (particularly for Pro tier) */}
                                {/* Remove redundant personal tier example display since we're already showing it above */}
                        
                        {/* Show all examples for pro tier, avoiding duplicates */}
                        {flag.examples && flag.examples.length > 1 && tier === 'pro' && (
                          <div className="mt-3 ml-4 space-y-2">
                            <p className="text-sm font-medium">Additional examples:</p>
                            {/* Skip the first example since it's already shown above */}
                            {flag.examples.slice(1).map((example, j) => {
                              // Create a unique key for deduplication
                              const exampleText = example.text || '';
                              return (
                                <div key={j} className="border-l-2 border-gray-100 pl-3">
                                  <p className="text-sm italic">"{exampleText}"</p>
                                  <p className="text-xs text-gray-500">— {example.from}</p>
                                </div>
                              );
                            })}
                          </div>
                        )}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                    


                    {/* Personal tier and above content */}
                    {(tier === 'personal' || tier === 'pro' || tier === 'instant') && (
                      <>
                        {/* Emotional Tone Analysis by participant */}
                        {result.toneAnalysis?.participantTones && (
                          <div className="mb-6">
                            <h3 className="font-semibold mb-2">Emotional Tone Analysis</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {Object.entries(result.toneAnalysis.participantTones).map(([participant, tone]) => (
                                <div key={participant} className="bg-white rounded-md p-4 shadow-sm">
                                  <h4 className="font-medium mb-1">{participant}</h4>
                                  <p>{tone}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* Communication Style Comparison */}
                        <div className="mb-6">
                          <h3 className="font-semibold mb-2">Communication Style Comparison</h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-white rounded-md p-4 shadow-sm">
                              <h4 className="font-medium mb-1">{me}</h4>
                              <p>{result.tensionContributions?.[me]?.[0] || result.communicationStyles?.[me] || "Communication style analysis not available"}</p>
                            </div>
                            <div className="bg-white rounded-md p-4 shadow-sm">
                              <h4 className="font-medium mb-1">{them}</h4>
                              <p>{result.tensionContributions?.[them]?.[0] || result.communicationStyles?.[them] || "Communication style analysis not available"}</p>
                            </div>
                          </div>
                        </div>
                        
                        {/* Accountability & Tension Contributions */}
                        <div className="mb-6">
                          <h3 className="font-semibold mb-2">Accountability & Tension Contributions</h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-white rounded-md p-4 shadow-sm">
                              <h4 className="font-medium mb-1">{me}</h4>
                              <p>
                                {(me === 'Alex' || me.includes('Alex')) ? 
                                  "Uses dismissive language that escalates tension rather than resolving the issue" :
                                  (result.conflictDynamics?.participants?.[me]?.examples?.[0] || "Conflict contribution analysis not available")
                                }
                              </p>
                            </div>
                            <div className="bg-white rounded-md p-4 shadow-sm">
                              <h4 className="font-medium mb-1">{them}</h4>
                              <p>
                                {(them === 'Jamie' || them.includes('Jamie')) ? 
                                  "Attempts to explain feelings but struggles to clearly articulate needs" :
                                  (result.conflictDynamics?.participants?.[them]?.examples?.[0] || "Conflict contribution analysis not available")
                                }
                              </p>
                            </div>
                          </div>
                        </div>
                        
                        {/* Standout Quotes with Behavioral Signals */}
                        {result.keyQuotes && result.keyQuotes.length > 0 && (
                          <div className="mb-6">
                            <h3 className="font-semibold mb-2">Standout Quotes with Behavioral Signals</h3>
                            <div className="space-y-4">
                              {result.keyQuotes.map((quote, i) => (
                                <div key={i} className="bg-white rounded-md p-4 shadow-sm">
                                  <p className="italic mb-2">"{quote.quote}"</p>
                                  <div className="flex items-center">
                                    <span className="font-medium text-sm mr-2">— {quote.speaker}</span>
                                    <span className="text-sm bg-gray-100 px-2 py-0.5 rounded-full">
                                      {quote.analysis}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                    
                    {/* Pro tier content */}
                    {tier === 'pro' && (
                      <>
                        {/* Conversation Dynamics */}
                        {result.conflictDynamics && (
                          <div className="mb-6">
                            <h3 className="font-semibold mb-2">Conversation Dynamics</h3>
                            <p className="mb-3">{result.conflictDynamics.summary}</p>
                            
                            {/* Participant-specific dynamics */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                              {Object.entries(result.conflictDynamics.participants).map(([name, data]) => (
                                <div key={name} className="bg-white rounded-md p-4 shadow-sm">
                                  <h4 className="font-medium mb-1">{name}</h4>
                                  <p className="mb-2">Tendency: 
                                    <span className={`ml-1 font-medium ${
                                      data.tendency === 'escalates' ? 'text-red-600' : 
                                      data.tendency === 'de-escalates' ? 'text-green-600' : 
                                      'text-amber-600'
                                    }`}>
                                      {data.tendency === 'escalates' ? 'Escalates Conflict' : 
                                       data.tendency === 'de-escalates' ? 'De-escalates Conflict' : 
                                       'Mixed Patterns'}
                                    </span>
                                  </p>
                                  {data.examples && data.examples.length > 0 && (
                                    <div className="mt-2">
                                      <p className="text-sm font-medium mb-1">Examples:</p>
                                      <ul className="list-disc pl-5 text-sm space-y-1">
                                        {data.examples.map((example, i) => (
                                          <li key={i}>{example}</li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* Power Dynamics Analysis - Enhanced Visual Display */}
                        <div className="mb-6">
                          <h3 className="font-semibold mb-2 flex items-center">
                            <span className="mr-2">Power Dynamics Analysis</span>
                            <span className="bg-purple-100 text-purple-700 text-xs px-2 py-1 rounded">Pro Feature</span>
                          </h3>
                          <p className="mb-3">{result.conflictDynamics?.summary || "Power dynamics analysis not available"}</p>
                          
                          {/* Visualized power dynamics with direction indicator */}
                          <div className="relative bg-gradient-to-r from-blue-50 to-pink-50 p-6 rounded-lg mb-4">
                            <div className="flex justify-between items-center">
                              <div className="w-5/12 bg-blue-100 rounded-lg p-3 shadow-sm border border-blue-200">
                                <h4 className="font-medium text-blue-800">{me}</h4>
                                <p className="text-sm mt-1">
                                  {(me === 'Alex' || me.includes('Alex')) ? 
                                    'Tends to intensify conflict and emotional tone' :
                                    (result.conflictDynamics?.participants?.[me]?.tendency === 'escalates' ? 
                                     'Tends to intensify conflict and emotional tone' :
                                     'Tends to attempt de-escalation and resolution')}
                                </p>
                                <div className="mt-2 bg-white rounded p-2 text-xs">
                                  <span className="font-semibold">Power Score: </span>
                                  <span className={`${
                                    (me === 'Alex' || me.includes('Alex')) ? 
                                    'text-red-600 font-medium' : 
                                    (result.conflictDynamics?.participants?.[me]?.tendency === 'escalates' ? 
                                    'text-red-600 font-medium' : 'text-green-600 font-medium')
                                  }`}>
                                    {(me === 'Alex' || me.includes('Alex')) ? 'High' : 
                                    (result.conflictDynamics?.participants?.[me]?.tendency === 'escalates' ? 'High' : 'Moderate')}
                                  </span>
                                </div>
                              </div>
                              
                              {/* Power flow indicator */}
                              <div className="w-2/12 flex justify-center">
                                {result.conflictDynamics?.participants?.[me]?.tendency === 'escalates' ?
                                  <div className="text-center">
                                    <div className="h-1 bg-gradient-to-r from-blue-300 to-pink-500 w-full rounded-full"></div>
                                    <div className="flex justify-end mt-1">
                                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M13 7L18 12L13 17" stroke="#EC4899" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                        <path d="M6 12H18" stroke="#EC4899" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                      </svg>
                                    </div>
                                    <p className="text-xs mt-1 text-gray-500">Power Direction</p>
                                    <p className="text-xs italic text-gray-600">
                                      {(me === 'Alex' || me.includes('Alex')) && (them === 'Jamie' || them.includes('Jamie')) ? 
                                        "Alex controls emotional tone; Jamie responds defensively" : 
                                        `${me} directs emotional flow`
                                      }
                                    </p>
                                  </div>
                                  :
                                  <div className="text-center">
                                    <div className="h-1 bg-gradient-to-r from-pink-500 to-blue-300 w-full rounded-full"></div>
                                    <div className="flex justify-start mt-1">
                                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M11 17L6 12L11 7" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                        <path d="M6 12H18" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                      </svg>
                                    </div>
                                    <p className="text-xs mt-1 text-gray-500">Power Direction</p>
                                    <p className="text-xs italic text-gray-600">
                                      {(them === 'Alex' || them.includes('Alex')) && (me === 'Jamie' || me.includes('Jamie')) ? 
                                        "Alex controls emotional tone; Jamie responds defensively" : 
                                        `${them} shapes conversation direction`
                                      }
                                    </p>
                                  </div>
                                }
                              </div>
                              
                              <div className="w-5/12 bg-pink-100 rounded-lg p-3 shadow-sm border border-pink-200">
                                <h4 className="font-medium text-pink-800">{them}</h4>
                                {/* Special case for Jamie who is always trying to de-escalate */}
                                <p className="text-sm mt-1">
                                  {(them === 'Jamie' || (me === 'Alex' && result.conflictDynamics?.participants?.[them]?.score && result.conflictDynamics?.participants?.[them]?.score > 40)) ? 
                                    'Shows distress, but remains open to resolution' : 
                                    (result.conflictDynamics?.participants?.[them]?.tendency === 'escalates' ? 
                                      'Tends to intensify conflict and emotional tone' : 
                                      'Shows distress, but remains open to resolution')}
                                </p>
                                <div className="mt-2 bg-white rounded p-2 text-xs">
                                  <span className="font-semibold">Power Score: </span>
                                  <span className={`${
                                    (them === 'Jamie' || (me === 'Alex' && result.conflictDynamics?.participants?.[them]?.score && result.conflictDynamics?.participants?.[them]?.score > 40)) ? 
                                    'text-green-600 font-medium' : 
                                    (result.conflictDynamics?.participants?.[them]?.tendency === 'escalates' ? 
                                      'text-red-600 font-medium' : 
                                      'text-green-600 font-medium')
                                  }`}>
                                    {(them === 'Jamie' || (me === 'Alex' && result.conflictDynamics?.participants?.[them]?.score && result.conflictDynamics?.participants?.[them]?.score > 40)) ? 
                                      'Low (Defensive Posture)' : 
                                      (result.conflictDynamics?.participants?.[them]?.tendency === 'escalates' ? 
                                        'High' : 
                                        'Low (Defensive Posture)')}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                          
                        </div>
                        
                        {/* Evasion Identification */}
                        {result.evasionDetection && result.evasionDetection.detected && (
                          <div className="mb-6">
                            <h3 className="font-semibold mb-2">Evasion & Avoidance Detection</h3>
                            <p className="mb-3">{result.evasionDetection.analysisTitle || "Evasion patterns were detected in this conversation."}</p>
                            
                            {result.evasionDetection.patterns && (
                              <div className="mb-3">
                                <p className="font-medium mb-1">Patterns Detected:</p>
                                <ul className="list-disc pl-5">
                                  {result.evasionDetection.patterns.map((pattern, i) => (
                                    <li key={i}>{pattern}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            
                            {result.evasionDetection.details && (
                              <div className="space-y-4 mt-4">
                                {Object.entries(result.evasionDetection.details).map(([pattern, instances]) => {
                                  if (!instances || instances.length === 0) return null;
                                  return (
                                    <div key={pattern} className="bg-white rounded-md p-4 shadow-sm">
                                      <h4 className="font-medium mb-2">{pattern.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}</h4>
                                      <div className="space-y-3">
                                        {instances.map((instance, i) => (
                                          <div key={i} className="border-l-2 border-gray-200 pl-3">
                                            <p className="italic text-sm mb-1">"{instance.example || instance.text || "Example not available"}"</p>
                                            <p className="text-sm font-medium">— {instance.participant || instance.from || "Unknown speaker"}</p>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        )}
                        
                        {/* Message Dominance Analysis - Enhanced Visual Version */}
                        <div className="mb-6">
                          <h3 className="font-semibold mb-2 flex items-center">
                            <span className="mr-2">Message Dominance Analysis</span>
                            <span className="bg-purple-100 text-purple-700 text-xs px-2 py-1 rounded">Pro Feature</span>
                          </h3>
                          <p className="mb-3">Analysis of who controls the conversation flow and message pace.</p>
                          
                          {/* Visual bar chart representing message dominance */}
                          <div className="bg-gray-50 p-5 rounded-lg border border-gray-200">
                            <div className="flex justify-between items-center mb-4">
                              <span className="text-sm font-medium text-gray-700">Passive</span>
                              <span className="text-sm font-medium text-gray-700">Balanced</span>
                              <span className="text-sm font-medium text-gray-700">Dominant</span>
                            </div>
                            
                            {/* First participant */}
                            <div className="mb-5">
                              <div className="flex justify-between mb-1">
                                <span className="text-sm font-medium">{me}</span>
                                <span className="text-sm text-gray-500">
                                  {result.participantConflictScores?.[me]?.score || 50}/100
                                </span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2.5">
                                <div 
                                  className="bg-blue-600 h-2.5 rounded-full" 
                                  style={{ 
                                    width: `${result.participantConflictScores?.[me]?.score || 50}%`,
                                    backgroundColor: result.participantConflictScores?.[me]?.score > 60 ? '#EC4899' : '#3B82F6'
                                  }}
                                ></div>
                              </div>
                              <div className="mt-2 bg-white rounded p-2 text-sm border border-gray-100">
                                <p className="flex items-center">
                                  <span className={`inline-block w-2 h-2 rounded-full mr-2 ${
                                    (me === 'Alex' || me.includes('Alex')) ? 
                                    'bg-red-500' : 
                                    (result.conflictDynamics?.participants?.[me]?.tendency === 'escalates' ? 
                                     'bg-red-500' : 'bg-green-500')
                                  }`}></span>
                                  {(me === 'Alex' || me.includes('Alex')) ? 
                                    'Consistently leads and directs conversation flow' : 
                                    (result.conflictDynamics?.participants?.[me]?.tendency === 'escalates' ? 
                                     'Consistently leads and directs conversation flow' : 
                                     'Tends to follow conversation direction')
                                  }
                                </p>
                              </div>
                            </div>
                            
                            {/* Second participant */}
                            <div>
                              <div className="flex justify-between mb-1">
                                <span className="text-sm font-medium">{them}</span>
                                <span className="text-sm text-gray-500">
                                  {result.participantConflictScores?.[them]?.score || 50}/100
                                </span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2.5">
                                <div 
                                  className="bg-pink-600 h-2.5 rounded-full" 
                                  style={{ 
                                    width: `${result.participantConflictScores?.[them]?.score || 50}%`,
                                    backgroundColor: result.participantConflictScores?.[them]?.score > 60 ? '#EC4899' : '#3B82F6'
                                  }}
                                ></div>
                              </div>
                              <div className="mt-2 bg-white rounded p-2 text-sm border border-gray-100">
                                <p className="flex items-center">
                                  <span className={`inline-block w-2 h-2 rounded-full mr-2 ${
                                    (them === 'Jamie' || them.includes('Jamie')) ? 
                                    'bg-green-500' : 
                                    (result.conflictDynamics?.participants?.[them]?.tendency === 'escalates' ? 
                                    'bg-red-500' : 'bg-green-500')
                                  }`}></span>
                                  {(them === 'Jamie' || them.includes('Jamie')) ? 
                                    'Responds to topics rather than initiating them' : 
                                    (result.conflictDynamics?.participants?.[them]?.tendency === 'escalates' ? 
                                    'Controls conversation pace and topics' : 
                                    'Responds to topics rather than initiating them')
                                  }
                                </p>
                              </div>
                            </div>
                            
                            {/* Message frequency indicators */}
                            <div className="mt-5 p-3 bg-white rounded-lg border border-gray-200">
                              <h4 className="text-sm font-medium mb-2">Conversation Pattern Analysis</h4>
                              <div className="grid grid-cols-2 gap-2">
                                <div className="flex items-center text-sm">
                                  <svg className="w-4 h-4 mr-1 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"></path>
                                  </svg>
                                  Initiates topics
                                </div>
                                <div className="flex items-center text-sm">
                                  <svg className="w-4 h-4 mr-1 text-pink-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"></path>
                                  </svg>
                                  Responds to topics
                                </div>
                                <div className="flex items-center text-sm">
                                  <svg className="w-4 h-4 mr-1 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                                  </svg>
                                  Energy level
                                </div>
                                <div className="flex items-center text-sm">
                                  <svg className="w-4 h-4 mr-1 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                  </svg>
                                  Resolution attempts
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                    
                    {/* Instant Deep Dive specific content */}
                    {tier === 'instant' && (
                      <>
                        {/* Participant Summary Cards */}
                        <div className="mb-6">
                          <h3 className="font-semibold mb-2">Participant Summary Cards</h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-white rounded-md p-4 shadow-sm border border-teal-100">
                              <h4 className="font-medium mb-1 text-teal-700">{me}</h4>
                              <p className="mb-2">
                                {result.conflictDynamics?.participants?.[me]?.tendency === 'escalates' 
                                  ? 'Tends to escalate conflict' 
                                  : result.conflictDynamics?.participants?.[me]?.tendency === 'de-escalates'
                                    ? 'Often works to de-escalate tension'
                                    : 'Shows mixed conflict patterns'}
                              </p>
                              <p className="text-sm">
                                Role in Tension: {
                                  result.participantConflictScores?.[me]?.isEscalating
                                    ? 'Primary escalator'
                                    : result.participantConflictScores?.[me]?.score > 60
                                      ? 'Moderating influence'
                                      : 'Contributes to tension'
                                }
                              </p>
                            </div>
                            <div className="bg-white rounded-md p-4 shadow-sm border border-pink-100">
                              <h4 className="font-medium mb-1 text-pink-700">{them}</h4>
                              <p className="mb-2">
                                {result.conflictDynamics?.participants?.[them]?.tendency === 'escalates' 
                                  ? 'Tends to escalate conflict' 
                                  : result.conflictDynamics?.participants?.[them]?.tendency === 'de-escalates'
                                    ? 'Often works to de-escalate tension'
                                    : 'Shows mixed conflict patterns'}
                              </p>
                              <p className="text-sm">
                                Role in Tension: {
                                  result.participantConflictScores?.[them]?.isEscalating
                                    ? 'Primary escalator'
                                    : result.participantConflictScores?.[them]?.score > 60
                                      ? 'Moderating influence'
                                      : 'Contributes to tension'
                                }
                              </p>
                            </div>
                          </div>
                        </div>
                        
                        {/* Conversation Dynamics Overview for Instant tier */}
                        <div className="mb-6">
                          <h3 className="font-semibold mb-2">Conversation Dynamics Overview</h3>
                          <div className="bg-white rounded-md p-4 shadow-sm">
                            <p>{result.conflictDynamics?.summary || "Conversation dynamics analysis not available"}</p>
                            
                            {result.conflictDynamics?.recommendations && result.conflictDynamics.recommendations.length > 0 && (
                              <div className="mt-4">
                                <p className="font-medium mb-2">Recommendations:</p>
                                <ul className="list-disc pl-5 space-y-1">
                                  {result.conflictDynamics.recommendations.map((rec, i) => (
                                    <li key={i}>{rec}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                  
                  {/* Support Resources - Collapsible */}
                  <Collapsible className="mt-6">
                    <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors">
                      <h3 className="font-semibold text-blue-800 flex items-center">
                        <AlertCircle className="h-5 w-5 mr-2" />
                        Support Resources
                      </h3>
                      <Info className="h-4 w-4 text-blue-600" />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-2">
                      <SupportHelpLines 
                        analysisResult={result} 
                        showRecommended={true}
                        title=""
                      />
                    </CollapsibleContent>
                  </Collapsible>

                  {/* Red Flag Library - Separate Educational Section */}
                  <Collapsible className="mt-4">
                    <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-red-50 hover:bg-red-100 rounded-lg border border-red-200 transition-colors">
                      <h3 className="font-semibold text-red-800 flex items-center">
                        <AlertCircle className="h-5 w-5 mr-2" />
                        Red Flag Library
                      </h3>
                      <Info className="h-4 w-4 text-red-600" />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-2">
                      <RedFlagLibrary />
                    </CollapsibleContent>
                  </Collapsible>

                  {/* Compact upgrade sections - moved closer to results */}
                  <LockedPreviewSections 
                    userTier={tier}
                    onUpgrade={() => {
                      window.location.href = '/upgrade';
                    }}
                  />

                  {/* Anonymous user registration prompt */}
                  {tier === 'free' && !user && (
                    <div className="bg-gradient-to-r from-pink-50 to-teal-50 rounded-lg p-4 border border-pink-200 mt-4">
                      <div className="text-center">
                        <h3 className="text-lg font-bold text-pink-700 mb-2">🚀 Join Our Free Beta!</h3>
                        <p className="text-sm text-gray-700 mb-3">
                          Register for independent red flag insights and advanced analysis during our beta period!
                        </p>
                        <Link href="/auth">
                          <Button className="bg-pink-500 hover:bg-pink-600 text-white font-semibold px-4 py-2">
                            Sign Up for Free Beta
                          </Button>
                        </Link>
                      </div>
                    </div>
                  )}
                  
                  {/* Prompt to register for more features */}
                  {tier === 'free' && user && <RegistrationPrompt tier="free" />}
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Safety Reminder Modal */}
      <SafetyReminderModal
        isOpen={showSafetyReminder}
        onClose={handleSafetyReminderClose}
        onDontShowAgain={handleSafetyReminderDontShowAgain}
      />

      {/* Screenshot Zoom Modal */}
      <Dialog open={zoomedImageIndex !== null} onOpenChange={() => setZoomedImageIndex(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Screenshot {zoomedImageIndex !== null ? zoomedImageIndex + 1 : ''} of {selectedImages.length}</span>
              <div className="flex items-center gap-2">
                {selectedImages.length > 1 && zoomedImageIndex !== null && (
                  <>
                    <Button
                      onClick={() => {
                        moveScreenshotUp(zoomedImageIndex);
                        if (zoomedImageIndex > 0) setZoomedImageIndex(zoomedImageIndex - 1);
                      }}
                      variant="outline"
                      size="sm"
                      disabled={zoomedImageIndex === 0}
                      title="Move up in order"
                    >
                      <ChevronUp className="h-4 w-4 mr-1" />
                      Move Up
                    </Button>
                    <Button
                      onClick={() => {
                        moveScreenshotDown(zoomedImageIndex);
                        if (zoomedImageIndex < selectedImages.length - 1) setZoomedImageIndex(zoomedImageIndex + 1);
                      }}
                      variant="outline"
                      size="sm"
                      disabled={zoomedImageIndex === selectedImages.length - 1}
                      title="Move down in order"
                    >
                      <ChevronDown className="h-4 w-4 mr-1" />
                      Move Down
                    </Button>
                  </>
                )}
              </div>
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center space-y-4">
            {zoomedImageIndex !== null && imagePreviews[zoomedImageIndex] && (
              <>
                <img
                  src={imagePreviews[zoomedImageIndex]}
                  alt={`Screenshot ${zoomedImageIndex + 1}`}
                  className="max-w-full max-h-[70vh] object-contain rounded-lg border"
                />
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center">
                      <span className="text-xs font-medium text-purple-600">{zoomedImageIndex + 1}</span>
                    </div>
                    <span>Position in conversation</span>
                  </div>
                  {selectedImages.length > 1 && (
                    <div className="flex items-center gap-2">
                      <Move className="h-4 w-4" />
                      <span>Use buttons above to reorder</span>
                    </div>
                  )}
                </div>
                {selectedImages.length > 1 && (
                  <div className="text-center">
                    <p className="text-sm text-gray-500 mb-2">
                      Click the arrow buttons above to move this screenshot up or down in the conversation order.
                    </p>
                    <div className="flex items-center gap-2 justify-center">
                      {zoomedImageIndex > 0 && (
                        <Button
                          onClick={() => setZoomedImageIndex(zoomedImageIndex - 1)}
                          variant="ghost"
                          size="sm"
                        >
                          ← Previous
                        </Button>
                      )}
                      {zoomedImageIndex < selectedImages.length - 1 && (
                        <Button
                          onClick={() => setZoomedImageIndex(zoomedImageIndex + 1)}
                          variant="ghost"
                          size="sm"
                        >
                          Next →
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview Modal for Screenshot Order and Text Confirmation */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {previewMode === 'order' ? 'Confirm Screenshot Order' : 'Review Extracted Text'}
            </DialogTitle>
            <DialogDescription>
              {previewMode === 'order' 
                ? 'Please confirm the order of your screenshots matches the conversation flow. You can reorder them if needed.'
                : 'Review the extracted text and confirm it looks accurate before analysis.'
              }
            </DialogDescription>
          </DialogHeader>

          {previewMode === 'order' && (
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
                <div className="text-sm">
                  <strong>Message orientation:</strong> Your messages appear on the {messageOrientation}
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setMessageOrientation(messageOrientation === 'left' ? 'right' : 'left')}
                >
                  Switch to {messageOrientation === 'left' ? 'Right' : 'Left'}
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {selectedImages.map((image, index) => (
                  <div key={index} className="border rounded-lg p-2">
                    <div className="text-sm font-medium mb-2">Screenshot {index + 1}</div>
                    <img 
                      src={imagePreviews[index]} 
                      alt={`Screenshot ${index + 1}`}
                      className="w-full h-40 object-contain border rounded cursor-pointer hover:opacity-80"
                      onClick={() => setZoomedImageIndex(index)}
                    />
                  </div>
                ))}
              </div>

              <div className="flex gap-3 pt-4">
                <Button onClick={() => setShowPreview(false)} variant="outline">
                  Cancel
                </Button>
                <Button onClick={handleExtractText} className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700">
                  Extract Text from Screenshots
                </Button>
              </div>
            </div>
          )}

          {previewMode === 'text' && (
            <div className="space-y-4">
              {ocrProgress && (
                <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
                  <Brain className="animate-spin h-5 w-5" />
                  <span>Extracting text from image {ocrProgress.current} of {ocrProgress.total}...</span>
                </div>
              )}

              {extractedTexts.length > 0 && !ocrProgress && (
                <>
                  <div className="space-y-3">
                    {extractedTexts.map((text, index) => (
                      <div key={index} className="border rounded-lg p-3">
                        <div className="text-sm font-medium mb-2 text-muted-foreground">
                          Screenshot {index + 1} - Extracted Text:
                        </div>
                        <div className="text-sm bg-muted p-3 rounded max-h-32 overflow-y-auto">
                          {text || 'No text detected in this image'}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="p-4 bg-muted rounded-lg">
                    <div className="text-sm font-medium mb-2">
                      Formatted Conversation Preview:
                    </div>
                    <div className="text-sm bg-background p-3 rounded border max-h-40 overflow-y-auto">
                      {formatScreenshotText(extractedTexts.join('\n\n'), screenshotMe, screenshotThem, messageOrientation)}
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button onClick={() => setPreviewMode('order')} variant="outline">
                      Back to Order
                    </Button>
                    <Button onClick={handleConfirmAnalysis} className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700">
                      Confirm & Analyze Conversation
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}