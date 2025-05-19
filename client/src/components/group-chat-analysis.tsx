import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, AlertCircle, FileText, XCircle } from "lucide-react";
import { ChatAnalysisRequest, ChatAnalysisResponse, analyzeChatConversation, processImageOcr, getUserUsage } from "@/lib/openai";
import JSZip from "jszip";
import exportToPdf from '@/components/export-document-generator';
import RedFlags from "@/components/red-flags";
import RegistrationPrompt from "@/components/registration-prompt";
import EvasionDetection from "@/components/evasion-detection";
import ConflictDynamics from "@/components/conflict-dynamics";
import BackHomeButton from "@/components/back-home-button";

// Helper function to convert file to base64
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
}

// Helper for detecting participants in WhatsApp group chat
function detectGroupParticipants(conversation: string): string[] {
  // Process WhatsApp group chat format to detect participants
  const lines = conversation.split('\n');
  // WhatsApp format often looks like: [5/19/24, 7:45:12 PM] John: Hey everyone
  const participantRegex = /\[.*?\] (.*?):/;
  const foundParticipants = new Set<string>();
  
  for (const line of lines) {
    const match = line.match(participantRegex);
    if (match && match[1]) {
      foundParticipants.add(match[1].trim());
    }
  }
  
  return Array.from(foundParticipants);
}

export default function GroupChatAnalysis() {
  const [tabValue, setTabValue] = useState("paste");
  const [conversation, setConversation] = useState("");
  const [participants, setParticipants] = useState<string[]>([]);
  const [fileName, setFileName] = useState("");
  const [fileIsZip, setFileIsZip] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [result, setResult] = useState<ChatAnalysisResponse | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedTier, setSelectedTier] = useState("free");
  
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
          
          // Automatically detect participants for WhatsApp group chat
          const detectedParticipants = detectGroupParticipants(content);
          if (detectedParticipants.length > 0) {
            setParticipants(detectedParticipants);
            toast({
              title: "Participants Detected",
              description: `Found ${detectedParticipants.length} participants in the group chat.`,
            });
          }
          
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
        
        // Automatically detect participants
        const detectedParticipants = detectGroupParticipants(text);
        if (detectedParticipants.length > 0) {
          setParticipants(detectedParticipants);
          toast({
            title: "Participants Detected",
            description: `Found ${detectedParticipants.length} participants in the group chat.`,
          });
        }
        
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
  
  // Manual participant detection
  const handleDetectParticipants = () => {
    if (!conversation.trim()) {
      toast({
        title: "Empty Conversation",
        description: "Please paste or upload a conversation first.",
        variant: "destructive",
      });
      return;
    }
    
    // Use the regex-based detection
    const detectedParticipants = detectGroupParticipants(conversation);
    
    if (detectedParticipants.length > 0) {
      setParticipants(detectedParticipants);
      toast({
        title: "Participants Detected",
        description: `Found ${detectedParticipants.length} participants in the group chat.`,
      });
    } else {
      toast({
        title: "Detection Failed",
        description: "Could not detect participants automatically. Make sure this is a WhatsApp group chat and enter participants manually.",
        variant: "destructive",
      });
    }
  };
  
  // Add a participant manually
  const handleAddParticipant = () => {
    const participantName = prompt("Enter participant name:");
    if (participantName && participantName.trim()) {
      // Check if participant already exists
      if (!participants.includes(participantName.trim())) {
        setParticipants([...participants, participantName.trim()]);
      } else {
        toast({
          title: "Duplicate Participant",
          description: "This participant is already in the list.",
          variant: "destructive",
        });
      }
    }
  };
  
  // Remove participant
  const handleRemoveParticipant = (participantToRemove: string) => {
    setParticipants(participants.filter(p => p !== participantToRemove));
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
    
    if (participants.length === 0) {
      toast({
        title: "Missing Participants",
        description: "Please detect or enter group chat participants.",
        variant: "destructive",
      });
      return;
    }
    
    // Prepare the analysis request
    const requestData: ChatAnalysisRequest = {
      conversation,
      me: "", // Not used for group chat
      them: "", // Not used for group chat
      tier: selectedTier,
      conversationType: "group_chat",
      participants
    };
    
    // Send the analysis request
    analysisMutation.mutate(requestData);
  };
  
  // Export to PDF function
  const handleExportToPdf = () => {
    if (!result) return;
    
    try {
      exportToPdf({
        conversation,
        result,
        me: participants[0] || "", // Use first participant as "me" for PDF export
        them: participants[1] || "", // Use second participant as "them" for PDF export
        tier: selectedTier,
        participants,
        conversationType: "group_chat"
      });
      
      toast({
        title: "PDF Generated",
        description: "Your analysis has been exported to PDF successfully.",
      });
    } catch (error) {
      toast({
        title: "PDF Generation Failed",
        description: "Could not generate PDF. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  // Reset form
  const handleReset = () => {
    setConversation("");
    setParticipants([]);
    setFileName("");
    setFileIsZip(false);
    setImagePreview(null);
    setResult(null);
    setShowResults(false);
    setErrorMessage(null);
    
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
          WhatsApp Group Chat Analysis
        </h1>
        <p className="text-muted-foreground">
          Upload or paste a WhatsApp group chat to analyze interactions, communication patterns,
          and dynamics between participants.
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
          
          <div className="text-sm text-muted-foreground mb-6">
            Group chat analysis with {participants.length} participants: {participants.join(", ")}
          </div>
          
          {/* Display analysis based on tier */}
          {selectedTier === 'free' || selectedTier === 'basic' || usage?.tier === 'anonymous' ? (
            <div>
              <div className="mb-8">
                {result.redFlags && (
                  <RedFlags 
                    redFlags={result.redFlags} 
                    tier="free"
                    redFlagsCount={result.redFlagsCount}
                    redFlagTypes={result.redFlagTypes}
                    redFlagsDetected={result.redFlagsDetected}
                  />
                )}
              </div>
              
              <RegistrationPrompt tier={usage?.tier || 'anonymous'} />
            </div>
          ) : (
            <div className="space-y-8">
              {result.redFlags && (
                <RedFlags 
                  redFlags={result.redFlags} 
                  tier={selectedTier}
                  redFlagsCount={result.redFlagsCount}
                  redFlagTypes={result.redFlagTypes}
                  redFlagsDetected={result.redFlagsDetected}
                  sampleQuotes={result.sampleQuotes}
                  conversation={conversation}
                  overallTone={result.toneAnalysis?.overallTone}
                />
              )}
              
              {/* Show evasion detection for personal and pro tiers */}
              {(selectedTier === 'personal' || selectedTier === 'pro' || selectedTier === 'instant') && 
                result.evasionDetection && result.evasionDetection.detected && (
                <EvasionDetection 
                  evasionDetection={result.evasionDetection}
                  tier={selectedTier} 
                />
              )}
              
              {/* Show conflict dynamics for pro tier */}
              {(selectedTier === 'pro' || selectedTier === 'instant') && result.conflictDynamics && (
                <ConflictDynamics 
                  conflictDynamics={result.conflictDynamics}
                  tier={selectedTier}
                />
              )}
            </div>
          )}
        </div>
      )}
      
      {/* If not showing results, show the input form */}
      {!showResults && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Input Your WhatsApp Group Chat</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Input tabs */}
              <Tabs value={tabValue} onValueChange={setTabValue}>
                <TabsList className="grid grid-cols-3 mb-2">
                  <TabsTrigger value="paste">Paste Text</TabsTrigger>
                  <TabsTrigger value="upload">Upload File</TabsTrigger>
                  <TabsTrigger value="image">Upload Image</TabsTrigger>
                </TabsList>
                
                <TabsContent value="paste" className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="conversation">Paste your WhatsApp group chat here</Label>
                    <Textarea
                      id="conversation"
                      placeholder="Paste your WhatsApp group chat here (e.g., [5/19/24, 7:45:12 PM] John: Hello everyone)"
                      value={conversation}
                      onChange={(e) => setConversation(e.target.value)}
                      className="min-h-[200px]"
                    />
                  </div>
                </TabsContent>
                
                <TabsContent value="upload" className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="file-upload">Upload a WhatsApp chat export (.txt or .zip)</Label>
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
                    <Label htmlFor="image-upload">Upload an image of your WhatsApp group chat</Label>
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
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-medium">Group Chat Participants</h3>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          onClick={handleDetectParticipants}
                        >
                          Detect Participants
                        </Button>
                        
                        <Button 
                          variant="outline" 
                          onClick={handleAddParticipant}
                        >
                          Add Participant
                        </Button>
                      </div>
                    </div>
                    
                    {participants.length > 0 ? (
                      <div className="mt-2">
                        <ScrollArea className="h-24">
                          <div className="flex flex-wrap gap-2">
                            {participants.map((participant, index) => (
                              <Badge 
                                key={index} 
                                variant="outline" 
                                className="py-1 pr-1 pl-3 flex items-center gap-1"
                              >
                                {participant}
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-5 w-5 rounded-full"
                                  onClick={() => handleRemoveParticipant(participant)}
                                >
                                  <XCircle className="h-3 w-3" />
                                </Button>
                              </Badge>
                            ))}
                          </div>
                        </ScrollArea>
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground">
                        No participants detected yet. Click "Detect Participants" to automatically identify them,
                        or "Add Participant" to enter them manually.
                      </div>
                    )}
                  </div>
                </>
              )}
              
              {/* Analysis options */}
              {conversation.trim() && participants.length > 0 && (
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
              disabled={isAnalyzing || !conversation.trim() || participants.length === 0}
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing...
                </>
              ) : "Analyze Group Chat"}
            </Button>
          </CardFooter>
        </Card>
      )}
    </section>
  );
}