import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2, AlertCircle, FileText, Calendar, Image, XCircle, PlusCircle, MinusCircle, SwitchCamera } from "lucide-react";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { DateRange } from "react-day-picker";
import { formatISO } from "date-fns";
import { ChatAnalysisRequest, ChatAnalysisResponse, analyzeChatConversation, detectParticipants, processImageOcr, getUserUsage } from "@/lib/openai";
import { DialogClose } from "@radix-ui/react-dialog";
import JSZip from "jszip";
import exportToPdf from '@/components/export-document-generator';
import RedFlags from "@/components/red-flags";
import RegistrationPrompt from "@/components/registration-prompt";
import EvasionDetection from "@/components/evasion-detection";
import ConflictDynamics from "@/components/conflict-dynamics";
import BackHomeButton from "@/components/back-home-button";
import WhatsAppGroupParser from "@/components/whatsapp-group-parser";

// Helper function to convert file to base64
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
}

export default function ChatAnalysisWithGroups() {
  const [tabValue, setTabValue] = useState("paste");
  const [conversationType, setConversationType] = useState<"two_person" | "group_chat">("two_person");
  const [conversation, setConversation] = useState("");
  const [me, setMe] = useState("");
  const [them, setThem] = useState("");
  const [participants, setParticipants] = useState<string[]>([]);
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
  
  // Refs for file inputs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  
  // Toast notifications
  const { toast } = useToast();
  
  // Get user's analysis usage
  const { data: usage } = useQuery({
    queryKey: ['/api/user/usage'],
    queryFn: getUserUsage
  });
  
  // Analysis mutation
  const analysisMutation = useMutation({
    mutationFn: (requestData: ChatAnalysisRequest) => analyzeChatConversation(requestData),
    onSuccess: (data) => {
      setResult(data);
      setShowResults(true);
      window.scrollTo(0, 0); // Scroll to top to see results
    },
    onError: (error: any) => {
      setErrorMessage(error.message || "Analysis failed. Please try again.");
      toast({
        title: "Analysis Failed",
        description: error.message || "Analysis failed. Please try again.",
        variant: "destructive",
      });
    },
  });
  
  // Name detection mutation
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
  
  // OCR processing mutation
  const ocrMutation = useMutation({
    mutationFn: (data: { image: string }) => processImageOcr(data),
    onSuccess: (data) => {
      setConversation(data.text);
      toast({
        title: "Image Processed",
        description: "Text has been extracted from the image.",
      });
      
      // Clear the image preview after successful text extraction
      setTimeout(() => {
        setImagePreview(null);
      }, 2000);
    },
    onError: () => {
      toast({
        title: "OCR Failed",
        description: "Could not extract text from the image. Please try another image or paste text manually.",
        variant: "destructive",
      });
    },
  });
  
  // Date range handler
  const handleDateRangeChange = (range: DateRange | undefined) => {
    if (range?.from) {
      setFromDate(formatISO(range.from));
    } else {
      setFromDate("");
    }
    
    if (range?.to) {
      setToDate(formatISO(range.to));
    } else {
      setToDate("");
    }
  };
  
  // File upload handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setFileName(file.name);
    setFileIsZip(file.type === 'application/zip' || file.name.endsWith('.zip'));
    
    try {
      if (file.type === 'application/zip' || file.name.endsWith('.zip')) {
        // Handle zip file (likely WhatsApp export)
        const arrayBuffer = await file.arrayBuffer();
        const zip = await JSZip.loadAsync(arrayBuffer);
        
        // Look for the chat text file in the zip
        const chatFile = Object.values(zip.files).find(f => 
          f.name.endsWith('.txt') && !f.dir
        );
        
        if (chatFile) {
          const content = await chatFile.async('text');
          setConversation(content);
          toast({
            title: "Chat Imported",
            description: `${file.name} has been processed successfully.`,
          });
        } else {
          toast({
            title: "No Chat Found",
            description: "Could not find a text file in the zip archive.",
            variant: "destructive",
          });
        }
      } else if (file.type === 'text/plain') {
        // Handle text file
        const text = await file.text();
        setConversation(text);
        toast({
          title: "File Imported",
          description: `${file.name} has been processed successfully.`,
        });
      } else {
        toast({
          title: "Unsupported File",
          description: "Please upload a text file (.txt) or WhatsApp chat export (.zip)",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "File Processing Failed",
        description: "Could not process the file. Please try another file.",
        variant: "destructive",
      });
    }
  };
  
  // Image upload handler
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
  
  // Name detection handler
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
  
  // Switch names function for correcting detection
  const handleSwitchNames = () => {
    const tempName = me;
    setMe(them);
    setThem(tempName);
    
    toast({
      title: "Names Switched",
      description: "The participant names have been switched.",
    });
  };
  
  // Submit handler for analysis
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
    
    // Different validation based on conversation type
    if (conversationType === "two_person") {
      if (!me.trim() || !them.trim()) {
        toast({
          title: "Missing Names",
          description: "Please enter names for both participants.",
          variant: "destructive",
        });
        return;
      }
    } else if (conversationType === "group_chat") {
      if (participants.length === 0) {
        toast({
          title: "Missing Participants",
          description: "Please detect or enter group chat participants.",
          variant: "destructive",
        });
        return;
      }
    }
    
    // Prepare date filter if applicable
    const dateFilter = focusRecent && fromDate ? { startDate: fromDate, endDate: toDate } : undefined;
    
    // Prepare the analysis request based on conversation type
    let requestData: ChatAnalysisRequest;
    
    if (conversationType === "two_person") {
      requestData = {
        conversation,
        me,
        them,
        tier: selectedTier,
        dateFilter,
        conversationType: "two_person"
      };
    } else {
      requestData = {
        conversation,
        me: "", // Not needed for group chat
        them: "", // Not needed for group chat
        tier: selectedTier,
        dateFilter,
        conversationType: "group_chat",
        participants
      };
    }
    
    // Send the analysis request
    analysisMutation.mutate(requestData);
  };
  
  // Export to PDF function
  const handleExportToPdf = () => {
    if (!result) return;
    
    exportToPdf({
      conversation,
      result,
      me,
      them,
      tier: selectedTier,
      participants: conversationType === "group_chat" ? participants : undefined,
      conversationType
    });
  };
  
  // Reset form
  const handleReset = () => {
    setConversation("");
    setMe("");
    setThem("");
    setParticipants([]);
    setFileName("");
    setFileIsZip(false);
    setImagePreview(null);
    setResult(null);
    setShowResults(false);
    setErrorMessage(null);
    setFocusRecent(false);
    setFromDate("");
    setToDate("");
    
    // Reset file inputs
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (imageInputRef.current) imageInputRef.current.value = "";
    
    setTabValue("paste");
    
    toast({
      title: "Form Reset",
      description: "All inputs have been cleared.",
    });
  };
  
  // Check if analysis is in progress
  const isAnalyzing = analysisMutation.isPending;
  
  return (
    <section className="container mx-auto py-6">
      <BackHomeButton />
      
      <div className="flex flex-col mb-8">
        <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl mb-2">
          Chat Analysis
        </h1>
        <p className="text-muted-foreground">
          Upload or paste a conversation to get insights on communication patterns,
          emotional dynamics, and potential issues.
        </p>
      </div>
      
      {/* Show results if available */}
      {showResults && result && (
        <div className="mb-10">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">Analysis Results</h2>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleReset}>
                New Analysis
              </Button>
              {usage?.tier !== 'anonymous' && (
                <Button onClick={handleExportToPdf}>
                  Export to PDF
                </Button>
              )}
            </div>
          </div>
          
          {conversationType === "two_person" ? (
            <div className="text-sm text-muted-foreground mb-6">
              <span className="font-semibold">{me}</span> and <span className="font-semibold">{them}</span>'s conversation analysis
            </div>
          ) : (
            <div className="text-sm text-muted-foreground mb-6">
              Group chat with {participants.length} participants: {participants.join(", ")}
            </div>
          )}
          
          {/* Display analysis based on tier */}
          {selectedTier === 'free' || selectedTier === 'basic' || usage?.tier === 'anonymous' ? (
            <div>
              <div className="mb-8">
                <RedFlags result={result} me={me} them={them} tier="free" />
              </div>
              
              <RegistrationPrompt 
                tier={usage?.tier || 'anonymous'} 
                used={usage?.used || 0} 
                limit={usage?.limit || 1} 
              />
            </div>
          ) : (
            <div className="space-y-8">
              <RedFlags result={result} me={me} them={them} tier={selectedTier} />
              
              {/* Show evasion detection for personal and pro tiers */}
              {(selectedTier === 'personal' || selectedTier === 'pro' || selectedTier === 'instant') && result.evasionDetection && (
                <EvasionDetection data={result.evasionDetection} tier={selectedTier} />
              )}
              
              {/* Show conflict dynamics for pro tier */}
              {(selectedTier === 'pro' || selectedTier === 'instant') && result.conflictDynamics && (
                <ConflictDynamics data={result.conflictDynamics} />
              )}
            </div>
          )}
        </div>
      )}
      
      {/* If not showing results, show the input form */}
      {!showResults && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Input Your Conversation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Conversation Type Selector */}
              <div className="space-y-2">
                <Label htmlFor="conversation-type">Conversation Type</Label>
                <Select
                  value={conversationType}
                  onValueChange={(value) => setConversationType(value as "two_person" | "group_chat")}
                >
                  <SelectTrigger id="conversation-type">
                    <SelectValue placeholder="Select conversation type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="two_person">Two-Person Conversation</SelectItem>
                    <SelectItem value="group_chat">WhatsApp Group Chat</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Input tabs */}
              <Tabs value={tabValue} onValueChange={setTabValue}>
                <TabsList className="grid grid-cols-3 mb-2">
                  <TabsTrigger value="paste">Paste Text</TabsTrigger>
                  <TabsTrigger value="upload">Upload File</TabsTrigger>
                  <TabsTrigger value="image">Upload Image</TabsTrigger>
                </TabsList>
                
                <TabsContent value="paste" className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="conversation">Paste your conversation here</Label>
                    <Textarea
                      id="conversation"
                      placeholder={
                        conversationType === "two_person"
                          ? "Paste your conversation here (e.g., John: Hello\nSarah: Hi there)"
                          : "Paste your WhatsApp group chat here (e.g., [5/15/24, 2:30:45 PM] John: Hello\n[5/15/24, 2:31:12 PM] Sarah: Hi there)"
                      }
                      value={conversation}
                      onChange={(e) => setConversation(e.target.value)}
                      className="min-h-[200px]"
                    />
                  </div>
                </TabsContent>
                
                <TabsContent value="upload" className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="file-upload">Upload a text file or WhatsApp chat export (.zip)</Label>
                    <Input
                      id="file-upload"
                      type="file"
                      accept=".txt,.zip"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                    />
                    {fileName && (
                      <div className="flex items-center mt-2 text-sm text-muted-foreground">
                        <FileText className="h-4 w-4 mr-2" />
                        {fileName} {fileIsZip && "(WhatsApp Export)"}
                      </div>
                    )}
                  </div>
                  
                  {conversation && (
                    <div className="space-y-2">
                      <Label htmlFor="uploaded-conversation">Extracted Conversation</Label>
                      <Textarea
                        id="uploaded-conversation"
                        value={conversation}
                        onChange={(e) => setConversation(e.target.value)}
                        className="min-h-[200px]"
                      />
                    </div>
                  )}
                </TabsContent>
                
                <TabsContent value="image" className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="image-upload">Upload an image of your conversation</Label>
                    <Input
                      id="image-upload"
                      type="file"
                      accept="image/*"
                      ref={imageInputRef}
                      onChange={handleImageUpload}
                    />
                  </div>
                  
                  {imagePreview && (
                    <div className="mt-4 relative">
                      <img 
                        src={imagePreview} 
                        alt="Uploaded conversation" 
                        className="max-w-full h-auto rounded-md border border-border"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        className="absolute top-2 right-2 bg-background"
                        onClick={() => {
                          setImagePreview(null);
                          if (imageInputRef.current) imageInputRef.current.value = "";
                        }}
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                  
                  {ocrMutation.isPending && (
                    <div className="flex items-center justify-center p-4">
                      <Loader2 className="h-8 w-8 animate-spin mr-2" />
                      <span>Processing image...</span>
                    </div>
                  )}
                  
                  {conversation && (
                    <div className="space-y-2">
                      <Label htmlFor="extracted-text">Extracted Text</Label>
                      <Textarea
                        id="extracted-text"
                        value={conversation}
                        onChange={(e) => setConversation(e.target.value)}
                        className="min-h-[200px]"
                      />
                    </div>
                  )}
                </TabsContent>
              </Tabs>
              
              {/* Participant information section */}
              {conversation.trim() && (
                <>
                  <Separator />
                  
                  {conversationType === "two_person" ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-medium">Participant Names</h3>
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            onClick={handleDetectNames}
                            disabled={detectNamesMutation.isPending || !conversation.trim()}
                          >
                            {detectNamesMutation.isPending ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Detecting...
                              </>
                            ) : "Auto-Detect Names"}
                          </Button>
                          
                          <Button 
                            variant="outline" 
                            onClick={handleSwitchNames}
                            disabled={!me.trim() || !them.trim()}
                          >
                            <SwitchCamera className="mr-2 h-4 w-4" />
                            Switch Names
                          </Button>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="me">Your Name (or First Person)</Label>
                          <Input
                            id="me"
                            placeholder="Your name"
                            value={me}
                            onChange={(e) => setMe(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="them">Their Name (or Second Person)</Label>
                          <Input
                            id="them"
                            placeholder="Their name"
                            value={them}
                            onChange={(e) => setThem(e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <WhatsAppGroupParser 
                      conversation={conversation}
                      onParticipantsDetected={setParticipants}
                    />
                  )}
                </>
              )}
              
              {/* Analysis options */}
              {conversation.trim() && (
                <>
                  <Separator />
                  
                  <div className="space-y-4">
                    <div className="flex flex-col">
                      <h3 className="text-lg font-medium mb-2">Analysis Options</h3>
                      
                      {!isDevMode && usage?.tier !== 'anonymous' && (
                        <div className="mb-4">
                          <p className="text-sm text-muted-foreground mb-4">
                            Your account tier: <span className="font-semibold">{usage?.tier || 'Free'}</span>
                            {" "} ({usage?.used || 0}/{usage?.limit || 0} analyses used)
                          </p>
                        </div>
                      )}
                      
                      {/* Date Range Filter */}
                      <div className="flex items-center space-x-2 mt-2">
                        <Switch
                          id="focus-recent"
                          checked={focusRecent}
                          onCheckedChange={setFocusRecent}
                        />
                        <Label htmlFor="focus-recent" className="cursor-pointer">Focus on specific date range</Label>
                      </div>
                      
                      {focusRecent && (
                        <div className="mt-2">
                          <DatePickerWithRange onDateRangeChange={handleDateRangeChange} />
                        </div>
                      )}
                      
                      {/* Analysis Tier Selector - only show in dev mode or for users with higher tiers */}
                      {(isDevMode || (usage?.tier && usage.tier !== 'free' && usage.tier !== 'anonymous')) && (
                        <div className="space-y-2 mt-4">
                          <Label htmlFor="tier">Analysis Tier</Label>
                          <Select 
                            value={selectedTier} 
                            onValueChange={setSelectedTier}
                          >
                            <SelectTrigger id="tier">
                              <SelectValue placeholder="Select analysis tier" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="free">Free</SelectItem>
                              <SelectItem value="personal">Personal</SelectItem>
                              <SelectItem value="pro">Pro</SelectItem>
                              <SelectItem value="instant">Instant Deep Dive</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
              
              {/* Error message display */}
              {errorMessage && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{errorMessage}</AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={handleReset}>
              Reset
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={isAnalyzing || !conversation.trim() || (conversationType === "two_person" && (!me.trim() || !them.trim())) || (conversationType === "group_chat" && participants.length === 0)}
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing...
                </>
              ) : "Analyze Conversation"}
            </Button>
          </CardFooter>
        </Card>
      )}
    </section>
  );
}