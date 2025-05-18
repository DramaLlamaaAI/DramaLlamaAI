import { useState, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info, Search, ArrowLeftRight, Brain, Upload, Image, AlertCircle, TrendingUp, Flame, Activity, Users, Edit, Settings, ChevronUpCircle, Zap, Archive, FileText } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useMutation, useQuery } from "@tanstack/react-query";
import { analyzeChatConversation, detectParticipants, processImageOcr, ChatAnalysisResponse, OcrRequest } from "@/lib/openai";
import { useToast } from "@/hooks/use-toast";
import { fileToBase64, validateConversation, getParticipantColor } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { getUserUsage } from "@/lib/openai";
import SupportHelpLinesLink from "@/components/support-helplines-link";
import { useLocation } from "wouter";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import JSZip from "jszip";
import exportToPdf from '@/components/export-document-generator';
import RedFlags from "@/components/red-flags";
import RegistrationPrompt from "@/components/registration-prompt";
import EvasionDetection from "@/components/evasion-detection";
import ConflictDynamics from "@/components/conflict-dynamics";

export default function ChatAnalysis() {
  const [tabValue, setTabValue] = useState("paste");
  const [conversation, setConversation] = useState("");
  const [me, setMe] = useState("");
  const [them, setThem] = useState("");
  const [fileName, setFileName] = useState("");
  const [fileIsZip, setFileIsZip] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [result, setResult] = useState<ChatAnalysisResponse | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedTier, setSelectedTier] = useState("free");
  const [focusRecent, setFocusRecent] = useState(false);
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");
  
  // Get the location for dev mode
  const [location] = useLocation();
  const searchParams = new URLSearchParams(location.split('?')[1] || '');
  const isDevMode = searchParams.get('dev') === 'true';
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  
  const { toast } = useToast();

  const { data: usage } = useQuery({
    queryKey: ['/api/user/usage'],
    queryFn: getUserUsage,
  });
  
  const tier = usage?.tier || 'free';
  const usedAnalyses = usage?.used || 0;
  const limit = usage?.limit || 1;
  const canUseFeature = usedAnalyses < limit;

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
      window.scrollTo({ top: document.getElementById('analysisResults')?.offsetTop || 0, behavior: 'smooth' });
    },
    onError: (error: any) => {
      let errorMsg = error.message || "Could not analyze conversation. Please try again.";
      
      // Special handling for potential OpenAI API issues
      if (errorMsg.includes('API') || errorMsg.includes('key') || errorMsg.includes('OpenAI')) {
        errorMsg = "OpenAI API error. Please check that your API key is valid and has sufficient credits.";
      }
      
      setErrorMessage(errorMsg);
      console.error("Analysis error details:", error);
      
      // Only show toast for non-API errors since we display API errors more prominently
      if (!errorMsg.includes('API')) {
        toast({
          title: "Analysis Failed",
          description: errorMsg,
          variant: "destructive",
        });
      }
    },
  });

  const detectNamesMutation = useMutation({
    mutationFn: (text: string) => detectParticipants(text),
    onSuccess: (data) => {
      setMe(data.me);
      setThem(data.them);
      toast({
        title: "Names Detected",
        description: `Found participants: ${data.me} and ${data.them}`,
      });
    },
    onError: () => {
      toast({
        title: "Detection Failed",
        description: "Could not detect names automatically. Please enter them manually.",
        variant: "destructive",
      });
    },
  });

  const ocrMutation = useMutation({
    mutationFn: (params: { image: string }) => processImageOcr(params),
    onSuccess: (data) => {
      setConversation(data.text);
      setTabValue("paste");
      toast({
        title: "Image Processed",
        description: "Text has been extracted from your image.",
      });
    },
    onError: () => {
      toast({
        title: "OCR Failed",
        description: "Could not extract text from image. Try uploading a clearer image or paste text manually.",
        variant: "destructive",
      });
    },
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    try {
      // Check if it's a ZIP file by extension or MIME type
      const isZip = file.name.toLowerCase().endsWith('.zip') || 
                   file.type === 'application/zip' || 
                   file.type === 'application/x-zip-compressed';
      
      setFileIsZip(isZip);
      
      let text = "";
      
      if (isZip) {
        // Handle ZIP file using JSZip
        const fileData = await file.arrayBuffer();
        const zip = new JSZip();
        const zipContents = await zip.loadAsync(fileData);
        
        // Find the first text file in the ZIP
        for (const [filename, zipEntry] of Object.entries(zipContents.files)) {
          if (!zipEntry.dir && filename.endsWith('.txt')) {
            // Get the text content
            text = await zipEntry.async('string');
            break;
          }
        }
        
        if (!text) {
          setErrorMessage("No text file found in the ZIP archive.");
          return;
        }
      } else {
        // Handle regular text file
        text = await file.text();
      }
      
      // Make sure we have actual text content
      if (!text.trim()) {
        setErrorMessage("The file appears to be empty. Please check the file and try again.");
        return;
      }
      
      setConversation(text);
      setFileName(file.name);
      
      // Clear any previous error messages
      setErrorMessage(null);
      
      toast({
        title: isZip ? "ZIP File Processed" : "WhatsApp Export Loaded",
        description: `${file.name} has been loaded successfully.`,
      });
      
      // Set the conversation text first
      setConversation(text);
      
      // If we have text content, try to auto-detect names
      if (text && text.trim().length > 0 && !me && !them) {
        // Call the name detection after a short delay to ensure state is updated
        setTimeout(() => {
          detectNamesMutation.mutate(text);
        }, 10);
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

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    try {
      const base64 = await fileToBase64(file);
      
      if (typeof base64 === 'string') {
        setImagePreview(base64);
        
        // Send to OCR API if it's an image
        if (file.type.startsWith('image/')) {
          // Pass the base64 string directly
          ocrMutation.mutate({ image: base64.split(',')[1] });
        }
      }
    } catch (error) {
      toast({
        title: "Image Processing Failed",
        description: "Could not process the image. Please try another image.",
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
    
    // Pass the conversation as a string directly
    detectNamesMutation.mutate(conversation);
  };

  const handleSubmit = () => {
    // Clear any previous error message
    setErrorMessage(null);
    
    // Basic validation
    if (!conversation.trim()) {
      toast({
        title: "Empty Conversation",
        description: "Please paste or upload a conversation.",
        variant: "destructive",
      });
      return;
    }
    
    if (!me.trim() || !them.trim()) {
      toast({
        title: "Missing Names",
        description: "Please enter names for both participants.",
        variant: "destructive",
      });
      return;
    }
    
    // Reset any previous error
    setErrorMessage(null);
    
    // Use the selected tier in dev mode
    const requestData: any = { 
      conversation, 
      me, 
      them,
    };
    
    // Add date filtering if enabled
    if (focusRecent && fromDate) {
      requestData.dateFilter = {
        fromDate: fromDate
      };
      
      if (toDate) {
        requestData.dateFilter.toDate = toDate;
      }
    }
    
    // Add tier header if in dev mode
    if (isDevMode && selectedTier) {
      requestData.tier = selectedTier;
    }
    
    analysisMutation.mutate(requestData);
  };

  const handleSwitchNames = () => {
    setMe(them);
    setThem(me);
  };

  const isValidating = validateConversation(conversation);
  const isSubmitting = analysisMutation.isPending;
  const isDetectingNames = detectNamesMutation.isPending;

  return (
    <section className="container max-w-5xl py-8">
      <Card className="mb-6">
        <CardContent className="p-6">
          {errorMessage && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          )}
          
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold mb-2">Chat Analysis</h1>
            <p className="text-muted-foreground">
              Analyze your text conversation to understand communication patterns,
              emotional tones and potential issues
            </p>
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
                <TabsList className={`grid ${isDevMode ? 'grid-cols-3' : 'grid-cols-2'}`}>
                  <TabsTrigger value="paste">
                    <Edit className="h-4 w-4 mr-2" />
                    Paste Text
                  </TabsTrigger>
                  <TabsTrigger value="upload">
                    <Upload className="h-4 w-4 mr-2" />
                    Upload File
                  </TabsTrigger>
                  {isDevMode && (
                    <TabsTrigger value="debug">
                      <Settings className="h-4 w-4 mr-2" />
                      Developer
                    </TabsTrigger>
                  )}
                </TabsList>
                
                <TabsContent value="paste" className="mt-4">
                  <div className="space-y-4">
                    <Textarea
                      placeholder="Paste your conversation here..."
                      value={conversation}
                      onChange={(e) => setConversation(e.target.value)}
                      className="min-h-[200px]"
                    />
                    
                    <div className="flex flex-col sm:flex-row gap-3">
                      <div className="flex-1">
                        <Input
                          placeholder="Your name (the gray messages)"
                          value={me}
                          onChange={(e) => setMe(e.target.value)}
                        />
                      </div>
                      <Button 
                        variant="outline" 
                        type="button" 
                        onClick={handleSwitchNames}
                        className="sm:flex-shrink-0"
                      >
                        <ArrowLeftRight className="h-4 w-4 mr-2" />
                        Switch Names
                      </Button>
                      <div className="flex-1">
                        <Input
                          placeholder="Their name (the blue messages)"
                          value={them}
                          onChange={(e) => setThem(e.target.value)}
                        />
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={handleDetectNames}
                        disabled={isDetectingNames || !conversation.trim()}
                        className="flex-shrink-0"
                        size="sm"
                      >
                        {isDetectingNames ? (
                          <>
                            <div className="h-4 w-4 mr-1 animate-spin rounded-full border-t-2 border-gray-500"></div>
                            <span className="hidden sm:inline">Detecting...</span>
                            <span className="sm:hidden">Detect</span>
                          </>
                        ) : (
                          <>
                            <Search className="h-4 w-4 mr-1" />
                            <span className="hidden sm:inline">Auto-Detect Names</span>
                            <span className="sm:hidden">Detect</span>
                          </>
                        )}
                      </Button>
                      
                      <Button
                        onClick={handleSubmit}
                        disabled={!canUseFeature || isSubmitting || !conversation.trim() || !me.trim() || !them.trim()}
                        className="flex-grow"
                      >
                        {isSubmitting ? (
                          <>
                            <div className="h-4 w-4 mr-2 animate-spin rounded-full border-t-2 border-gray-500"></div>
                            <span>Analyzing...</span>
                          </>
                        ) : (
                          <>
                            <Brain className="h-4 w-4 mr-2" />
                            <span>{canUseFeature ? 'Analyze Conversation' : 'Usage Limit Reached'}</span>
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="upload" className="mt-4">
                  <div className="space-y-6">
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                      <div className="bg-blue-100 inline-block p-4 mb-3 rounded-full">
                        <Archive className="h-8 w-8 text-blue-600" />
                      </div>
                      <h3 className="text-xl font-medium text-blue-700 mb-2">WhatsApp Chat Exports</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Upload a WhatsApp chat export (.txt file or .zip archive). On WhatsApp, tap ⋮ on a
                        chat, "More" → "Export chat" → "Without media"
                      </p>
                      
                      <div className="flex items-center justify-center mb-4">
                        <Button
                          className="bg-blue-500 hover:bg-blue-600 text-white"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          Choose File
                        </Button>
                      </div>
                      
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        className="hidden"
                        accept=".txt,.zip"
                      />
                      
                      <input
                        type="file"
                        ref={imageInputRef}
                        onChange={handleImageUpload}
                        className="hidden"
                        accept="image/*"
                      />
                      
                      {fileName && (
                        <div className="mt-4 text-left max-w-md mx-auto">
                          <p className="text-sm font-medium text-center mb-4">
                            File loaded: <span className="text-blue-700">{fileName}</span>
                          </p>
                          
                          <div className="space-y-4">
                            <div>
                              <Label htmlFor="your-name" className="block mb-1">Your Name</Label>
                              <Input
                                id="your-name"
                                placeholder="Your name in the chat"
                                value={me}
                                onChange={(e) => setMe(e.target.value)}
                              />
                            </div>
                            
                            <div>
                              <Label htmlFor="other-name" className="block mb-1">Other Person's Name</Label>
                              <Input
                                id="other-name"
                                placeholder="Other person's name"
                                value={them}
                                onChange={(e) => setThem(e.target.value)}
                              />
                            </div>
                          
                            <div className="space-y-3">
                              <Button
                                variant="outline"
                                onClick={handleDetectNames}
                                disabled={isDetectingNames || !conversation}
                                className="w-full"
                                size="default"
                              >
                                {isDetectingNames ? (
                                  <>
                                    <div className="h-4 w-4 mr-2 animate-spin rounded-full border-t-2 border-gray-500"></div>
                                    Detecting...
                                  </>
                                ) : (
                                  <>
                                    <Search className="h-4 w-4 mr-2" />
                                    Auto-Detect Names
                                  </>
                                )}
                              </Button>
                              
                              <Button
                                variant="outline"
                                onClick={handleSwitchNames}
                                className="w-full"
                              >
                                <ArrowLeftRight className="h-4 w-4 mr-2" />
                                Switch Names
                              </Button>
                            </div>
                            
                            <div className="relative">
                              <div className="flex items-center space-x-2 mb-2">
                                <Switch 
                                  id="focus-recent" 
                                  checked={focusRecent}
                                  onCheckedChange={setFocusRecent}
                                />
                                <Label htmlFor="focus-recent">Focus on Recent Messages</Label>
                                <span className="text-xs px-2 py-1 bg-amber-100 text-amber-800 rounded-full">New</span>
                              </div>
                              
                              {focusRecent && (
                                <div className="ml-7 mb-4 space-y-2 py-2 px-3 bg-gray-50 rounded-md">
                                  <div className="text-sm text-gray-600 mb-1">Filter messages by date range:</div>
                                  <div className="grid grid-cols-2 gap-2">
                                    <div>
                                      <Label htmlFor="from-date" className="text-xs">From Date</Label>
                                      <input
                                        id="from-date"
                                        type="date"
                                        value={fromDate}
                                        onChange={(e) => setFromDate(e.target.value)}
                                        className="w-full h-8 px-2 text-sm rounded border border-gray-300"
                                      />
                                    </div>
                                    <div>
                                      <Label htmlFor="to-date" className="text-xs">To Date (optional)</Label>
                                      <input
                                        id="to-date"
                                        type="date"
                                        value={toDate}
                                        onChange={(e) => setToDate(e.target.value)}
                                        className="w-full h-8 px-2 text-sm rounded border border-gray-300"
                                      />
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                            
                            <Button
                              onClick={handleSubmit}
                              disabled={!canUseFeature || isSubmitting || !conversation || !me || !them}
                              className="w-full bg-teal-500 hover:bg-teal-600"
                            >
                              {isSubmitting ? (
                                <>
                                  <div className="h-4 w-4 mr-2 animate-spin rounded-full border-t-2 border-gray-500"></div>
                                  Analyzing...
                                </>
                              ) : (
                                <>
                                  <Brain className="h-4 w-4 mr-2" />
                                  {canUseFeature ? 'Analyze Chat' : 'Usage Limit Reached'}
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      )}
                      
                      {imagePreview && (
                        <div className="mt-4">
                          <h4 className="font-medium mb-2">Image Preview</h4>
                          <img 
                            src={imagePreview} 
                            alt="Uploaded screenshot" 
                            className="max-h-48 mx-auto border rounded-lg"
                          />
                          
                          {ocrMutation.isPending && (
                            <div className="mt-2 text-sm text-center">
                              <div className="h-4 w-4 mx-auto mb-1 animate-spin rounded-full border-t-2 border-gray-500"></div>
                              Extracting text from image...
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    
                    <div className="text-sm text-muted-foreground">
                      <div className="flex items-start mb-2">
                        <Info className="h-4 w-4 mr-2 mt-0.5" />
                        <div>
                          <strong>WhatsApp Export Instructions:</strong>
                          <ol className="list-decimal ml-5 mt-1 space-y-1">
                            <li>Open the WhatsApp chat</li>
                            <li>Tap the three dots ⋮ in the top right</li>
                            <li>Select "More" → "Export chat"</li>
                            <li>Choose "Without media"</li>
                            <li>Share the .zip file here</li>
                          </ol>
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>
                
                {isDevMode && (
                  <TabsContent value="debug" className="mt-4">
                    <div className="space-y-4">
                      <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
                        <h3 className="text-md font-medium mb-2">Developer Options</h3>
                        <div className="space-y-2">
                          <div>
                            <Label htmlFor="tier-select">Test with tier:</Label>
                            <Select value={selectedTier} onValueChange={setSelectedTier}>
                              <SelectTrigger id="tier-select" className="mt-1">
                                <SelectValue placeholder="Select tier" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="free">Free</SelectItem>
                                <SelectItem value="personal">Personal</SelectItem>
                                <SelectItem value="pro">Pro</SelectItem>
                                <SelectItem value="instant">Instant Deep Dive</SelectItem>
                              </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground mt-1">
                              This will override the user's actual tier for testing purposes only.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                )}
              </Tabs>

              {!canUseFeature && (
                <Alert className="mt-6">
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    You've reached your analysis limit. Please upgrade your plan to continue.
                  </AlertDescription>
                </Alert>
              )}
            </>
          ) : (
            <div id="analysisResults">
              {/* Registration prompt for anonymous/free tier users */}
              <RegistrationPrompt tier={tier} />
              
              {result && (
                <div className="space-y-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between mb-4">
                    <h3 className="text-2xl font-bold mb-2 md:mb-0">Analysis Results</h3>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        onClick={() => {
                          if (result) {
                            exportToPdf(result as any, me, them, toast, tier);
                          }
                        }}
                        className="self-start"
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        Export to PDF
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={() => setShowResults(false)}
                        className="self-start"
                      >
                        Back to Input
                      </Button>
                    </div>
                  </div>
                  
                  {/* Participants section removed as requested */}
                  
                  {/* Overall Tone Analysis */}
                  <div className="bg-white p-4 rounded-lg shadow-sm">
                    <div className="flex items-center mb-3">
                      <Activity className="h-5 w-5 text-blue-600 mr-2" />
                      <h3 className="text-lg font-semibold">Overall Tone Analysis</h3>
                    </div>
                    
                    <p className="text-lg mb-4">
                      {result.toneAnalysis && result.toneAnalysis.overallTone 
                        ? result.toneAnalysis.overallTone 
                        : "Analysis not available"}
                    </p>
                    
                    {result.emotionalState && result.emotionalState.length > 0 && (
                      <div className="mt-4">
                        <h4 className="text-sm font-medium text-muted-foreground mb-2">Emotional Temperature</h4>
                        <div className="space-y-3">
                          {result.emotionalState.slice(0, 5).map((emotion: { emotion: string; intensity: number }, idx: number) => (
                            <div key={idx} className="space-y-1">
                              <div className="flex justify-between text-sm">
                                <span>{emotion.emotion}</span>
                                <span>{Math.round(emotion.intensity * 100)}%</span>
                              </div>
                              <Progress value={emotion.intensity * 100} />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Health Score */}
                  <div className="bg-white p-4 rounded-lg shadow-sm">
                    <div className="flex items-center mb-3">
                      <Activity className="h-5 w-5 text-blue-600 mr-2" />
                      <h3 className="text-lg font-semibold">Relationship Health Score</h3>
                    </div>
                    
                    {result.healthScore ? (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-red-500">Conflict</span>
                          <span className="font-medium text-yellow-500">Neutral</span>
                          <span className="font-medium text-green-500">Healthy</span>
                          <span className="font-medium text-green-700">Very Healthy</span>
                        </div>
                        
                        <div className="h-3 bg-gray-100 rounded-full relative">
                          <div 
                            className="h-3 rounded-full" 
                            style={{
                              width: `${result.healthScore.score}%`,
                              backgroundColor: 
                                result.healthScore.score < 30 ? '#ef4444' : 
                                result.healthScore.score < 50 ? '#f59e0b' : 
                                result.healthScore.score < 75 ? '#84cc16' : 
                                '#16a34a',
                            }}
                          ></div>
                          
                          <div 
                            className="absolute top-3 text-sm font-medium"
                            style={{
                              left: `calc(${result.healthScore.score}% - 15px)`,
                            }}
                          >
                            {result.healthScore.score}
                          </div>
                        </div>
                        
                        <div className="mt-4 p-3 rounded-md" style={{
                          backgroundColor: 
                            result.healthScore.score < 30 ? '#fef2f2' : 
                            result.healthScore.score < 50 ? '#fffbeb' : 
                            result.healthScore.score < 75 ? '#f7fee7' : 
                            '#ecfdf5',
                          color: 
                            result.healthScore.score < 30 ? '#b91c1c' : 
                            result.healthScore.score < 50 ? '#b45309' : 
                            result.healthScore.score < 75 ? '#3f6212' : 
                            '#166534',
                        }}>
                          <p className="font-medium">
                            {result.healthScore.label}: {result.healthScore.score}/100
                          </p>
                        </div>
                      </div>
                    ) : (
                      <p>Health score not available for this conversation.</p>
                    )}
                  </div>
                  
                  {/* Red Flags */}
                  <div className="bg-white p-4 rounded-lg shadow-sm">
                    <div className="flex items-center mb-3">
                      <Flame className="h-5 w-5 text-red-600 mr-2" />
                      <h3 className="text-lg font-semibold">Potential Red Flags</h3>
                    </div>
                    
                    {/* Using the dedicated RedFlags component with all necessary props */}
                    {result ? (
                      <RedFlags 
                        redFlags={result.redFlags} 
                        tier={tier}
                        conversation={conversation}
                        overallTone={result.toneAnalysis?.overallTone}
                        redFlagsCount={result.redFlagsCount}
                        redFlagTypes={result.redFlagTypes}
                        redFlagsDetected={result.redFlagsDetected}
                        sampleQuotes={result.sampleQuotes}
                        me={me}
                        them={them}
                      />
                    ) : (
                      <p className="text-gray-600">Analysis not available yet.</p>
                    )}
                  </div>
                  
                  {/* Conflict Dynamics - All tiers, but with varying detail */}
                  {result && (
                    <ConflictDynamics 
                      tier={tier}
                      conflictDynamics={result.conflictDynamics}
                    />
                  )}
                  
                  {/* Evasion Detection - Only for Personal and Pro tiers */}
                  {tier !== 'free' && result && (
                    <EvasionDetection 
                      tier={tier}
                      evasionDetection={result.evasionDetection}
                    />
                  )}
                  
                  {/* Communication Patterns - Only for paid tiers */}
                  {tier !== 'free' && (
                    <div className="bg-muted p-4 rounded-lg">
                      <h4 className="font-medium mb-2">Communication Insights</h4>
                      {(result.communication?.patterns && result.communication?.patterns.length > 0) ? (
                        <div className="mb-4">
                          <h5 className="text-sm font-medium text-muted-foreground mb-1">Communication Patterns</h5>
                          <div className="space-y-3">
                            {result.communication?.patterns.map((pattern: string, idx: number) => {
                              // Check if the pattern contains a quote (text inside quotes)
                              const quoteMatch = pattern.match(/"([^"]+)"/);
                              const hasQuote = quoteMatch && quoteMatch[1];
                              
                              // Split pattern into parts before and after the quote
                              let beforeQuote = pattern;
                              let quote = '';
                              let afterQuote = '';
                              
                              if (hasQuote) {
                                const parts = pattern.split(quoteMatch[0]);
                                beforeQuote = parts[0];
                                quote = quoteMatch[1];
                                afterQuote = parts[1] || '';
                              }
                              
                              // Detect which participant is mentioned
                              const meColor = pattern.includes(me) ? "text-cyan-700 bg-cyan-50" : "";
                              const themColor = pattern.includes(them) ? "text-pink-700 bg-pink-50" : "";
                              
                              return (
                                <div key={idx} className="p-3 rounded bg-white border border-gray-200 shadow-sm">
                                  <p>
                                    <span className="text-gray-700">{beforeQuote}</span>
                                    {hasQuote && (
                                      <>
                                        <span className={`italic px-2 py-1 rounded my-1 inline-block ${meColor || themColor || "bg-blue-50 text-blue-600"}`}>
                                          "{quote}"
                                        </span>
                                        <span className="text-gray-700">{afterQuote}</span>
                                      </>
                                    )}
                                  </p>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ) : (
                        <p className="text-muted-foreground text-sm">No significant communication patterns detected.</p>
                      )}
                      
                      {result.communication?.suggestions && result.communication?.suggestions.length > 0 && (
                        <div className="mt-4">
                          <h5 className="text-sm font-medium text-muted-foreground mb-1">Improvement Suggestions</h5>
                          <div className="space-y-2">
                            {result.communication?.suggestions.map((suggestion: string, idx: number) => (
                              <div key={idx} className="p-3 bg-blue-50 text-blue-700 rounded">
                                {suggestion}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  
                  <SupportHelpLinesLink variant="secondary" size="default" />
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}