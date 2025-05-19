import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, AlertCircle, FileText, XCircle, Brain } from "lucide-react";
import { ChatAnalysisRequest, ChatAnalysisResponse, analyzeChatConversation, getUserUsage } from "@/lib/openai";
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

export default function GroupChatAnalysisImproved() {
  const [tabValue, setTabValue] = useState("paste");
  const [conversation, setConversation] = useState("");
  const [participants, setParticipants] = useState<string[]>([]);
  const [fileName, setFileName] = useState("");
  const [fileIsZip, setFileIsZip] = useState(false);
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
  
  // Improved file upload handler with better error handling
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Show loading notification
    toast({
      title: "Processing File",
      description: "Please wait while we import your conversation...",
    });
    
    setFileName(file.name);
    setFileIsZip(file.type === 'application/zip' || file.name.endsWith('.zip'));
    
    try {
      if (file.type === 'application/zip' || file.name.endsWith('.zip')) {
        // Handle zip file (likely WhatsApp export)
        try {
          const arrayBuffer = await file.arrayBuffer();
          const zip = await JSZip.loadAsync(arrayBuffer);
          
          // Look for the chat text file in the zip
          const files = Object.values(zip.files);
          const chatFile = files.find(f => 
            !f.dir && f.name.endsWith('.txt')
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
            } else {
              toast({
                title: "No Participants Detected",
                description: "Could not automatically detect chat participants. Please add them manually.",
                variant: "destructive",
              });
            }
            
            toast({
              title: "Chat Imported",
              description: `${file.name} has been processed successfully.`,
            });
          } else {
            toast({
              title: "No Chat Found",
              description: "Could not find a text file in the zip archive. Please ensure this is a WhatsApp export.",
              variant: "destructive",
            });
          }
        } catch (zipError) {
          console.error("ZIP parsing error:", zipError);
          toast({
            title: "Invalid ZIP File",
            description: "The ZIP file could not be processed. Please ensure it's a valid WhatsApp export.",
            variant: "destructive",
          });
        }
      } else if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
        // Handle text file
        try {
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
          } else {
            toast({
              title: "No Participants Detected",
              description: "Could not detect participants automatically. Please add them manually.",
              variant: "destructive",
            });
          }
          
          toast({
            title: "Chat Imported",
            description: `${file.name} has been processed successfully.`,
          });
        } catch (textError) {
          console.error("Text file reading error:", textError);
          toast({
            title: "Text File Error",
            description: "Could not read the text file. Please check if it contains valid text.",
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Unsupported File",
          description: "Please upload a text file (.txt) or WhatsApp chat export (.zip)",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("File processing error:", error);
      toast.dismiss(loadingId);
      toast({
        title: "File Processing Failed",
        description: "Could not process the file. Please try again with a different file.",
        variant: "destructive",
      });
    }
  };

  // Submit handler
  const handleSubmit = () => {
    if (!conversation || analysisMutation.isPending || participants.length < 2) return;
    
    // Reset any previous errors
    setErrorMessage(null);
    
    // Prepare analysis request
    const requestData: ChatAnalysisRequest = {
      conversation,
      me: participants[0] || "",
      them: participants[1] || "",
      tier: selectedTier,
      includeOtherParticipants: true,
      allParticipants: participants
    };
    
    // Send the analysis request
    analysisMutation.mutate(requestData);
  };
  
  // Export to PDF function
  const handleExportToPdf = () => {
    if (!result) return;
    
    try {
      exportToPdf({
        result,
        me: participants[0] || "", // Use first participant as "me" for PDF export
        them: participants[1] || "", // Use second participant as "them" for PDF export
        toast,
        tier: selectedTier,
        participants,
        conversationType: "group_chat",
        conversation
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
    setResult(null);
    setShowResults(false);
    setErrorMessage(null);
    
    // Reset file inputs
    if (fileInputRef.current) fileInputRef.current.value = "";
    
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
          Upload or paste a WhatsApp group chat to analyze interactions and dynamics between multiple participants.
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
                  <FileText className="h-4 w-4 mr-2" />
                  Export to PDF
                </Button>
              )}
            </div>
          </div>
          
          <div className="text-sm text-muted-foreground mb-6">
            <strong>Participants:</strong> {participants.join(', ')}
            <br />
            <strong>Analysis Tier:</strong> {selectedTier.charAt(0).toUpperCase() + selectedTier.slice(1)}
          </div>
          
          {/* Anonymous users see registration prompt */}
          {usage?.tier === 'anonymous' ? (
            <div className="space-y-8">
              <RedFlags 
                redFlags={result.redFlags} 
                tier="free"
                redFlagsCount={result.redFlagsCount}
                redFlagTypes={result.redFlagTypes}
                redFlagsDetected={result.redFlagsDetected}
                sampleQuotes={result.sampleQuotes}
                conversation={conversation}
                overallTone={result.toneAnalysis?.overallTone}
              />
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
      
      {/* Chat input form */}
      {!showResults && (
        <Card className="mb-6">
          <CardHeader>
            <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-2">
              <CardTitle>WhatsApp Group Chat Analysis</CardTitle>
              <div className="text-sm text-muted-foreground">
                {usage && 
                  `${usage.used}/${usage.limit === null ? '∞' : usage.limit} analyses used${
                    usage.tier === 'anonymous' 
                      ? ` - ${usage.remaining} free ${usage.remaining === 1 ? 'analysis' : 'analyses'} remaining` 
                      : ''
                  }`
                }
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="paste" value={tabValue} onValueChange={setTabValue}>
              <TabsList className="mb-4 w-full">
                <TabsTrigger value="paste" className="flex-1">Paste Text</TabsTrigger>
                <TabsTrigger value="upload" className="flex-1">Upload File</TabsTrigger>
              </TabsList>
              
              <TabsContent value="paste">
                <div className="space-y-6">
                  <div>
                    <Label htmlFor="conversation">WhatsApp Group Chat</Label>
                    <Textarea
                      id="conversation"
                      placeholder="Paste your WhatsApp group chat conversation here..."
                      className="mt-1 min-h-[200px]"
                      value={conversation}
                      onChange={(e) => {
                        setConversation(e.target.value);
                        // Auto-detect participants from pasted content
                        if (e.target.value && e.target.value.length > 50) {
                          const detectedParticipants = detectGroupParticipants(e.target.value);
                          if (detectedParticipants.length > 0) {
                            setParticipants(detectedParticipants);
                            
                            // Only show the toast if we detect 2 or more participants
                            if (detectedParticipants.length >= 2) {
                              toast({
                                title: "Participants Detected",
                                description: `Found ${detectedParticipants.length} participants in the group chat.`,
                              });
                            }
                          }
                        }
                      }}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Paste your WhatsApp group chat history including message dates and participant names.
                    </p>
                  </div>
                  
                  <div>
                    <div className="flex justify-between mb-1">
                      <Label htmlFor="participants">Group Chat Participants</Label>
                      <div className="text-xs text-muted-foreground">
                        {participants.length} participants detected
                      </div>
                    </div>
                    <Textarea
                      id="participants"
                      placeholder="Enter participant names, one per line (automatically detected from conversation)"
                      className="mt-1 h-[100px]"
                      value={participants.join('\n')}
                      onChange={(e) => {
                        const lines = e.target.value.split('\n').filter(line => line.trim() !== '');
                        setParticipants(lines);
                      }}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Participants are automatically detected. You can add or remove names as needed.
                    </p>
                  </div>
                  
                  <div className="mb-6">
                    <Label className="mb-2 block">Analysis Tier</Label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <Button
                        variant={selectedTier === 'free' ? 'default' : 'outline'}
                        onClick={() => setSelectedTier('free')}
                        className={selectedTier === 'free' ? 'bg-primary text-white' : ''}
                      >
                        Free
                      </Button>
                      <Button
                        variant={selectedTier === 'personal' ? 'default' : 'outline'}
                        onClick={() => setSelectedTier('personal')}
                        className={selectedTier === 'personal' ? 'bg-primary text-white' : ''}
                      >
                        Personal
                      </Button>
                      <Button
                        variant={selectedTier === 'pro' ? 'default' : 'outline'}
                        onClick={() => setSelectedTier('pro')}
                        className={selectedTier === 'pro' ? 'bg-primary text-white' : ''}
                      >
                        Pro
                      </Button>
                      <Button
                        variant={selectedTier === 'instant' ? 'default' : 'outline'}
                        onClick={() => setSelectedTier('instant')}
                        className={selectedTier === 'instant' ? 'bg-primary text-white' : ''}
                      >
                        Instant
                      </Button>
                    </div>
                  </div>
                  
                  <Button 
                    onClick={handleSubmit}
                    disabled={!conversation || isAnalyzing || participants.length < 2}
                    className="w-full bg-primary text-white"
                  >
                    {isAnalyzing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Analyzing Group Chat...
                      </>
                    ) : (
                      <>
                        <Brain className="h-4 w-4 mr-2" />
                        Analyze Group Chat
                      </>
                    )}
                  </Button>
                </div>
              </TabsContent>
              
              <TabsContent value="upload">
                <div className="space-y-6">
                  <div>
                    <Label className="mb-2 block">Upload WhatsApp Chat Export</Label>
                    <div 
                      className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:bg-gray-50 transition-colors"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <FileText className="h-12 w-12 mx-auto mb-4 text-primary" />
                      <h3 className="mb-2 font-medium">Import WhatsApp Group Chat</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Click to upload a WhatsApp chat export (.txt file or .zip archive)
                      </p>
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        accept=".txt,.zip"
                        className="hidden"
                      />
                      <Button size="lg" className="mx-auto bg-primary text-white">
                        <FileText className="h-4 w-4 mr-2" />
                        Import Chat
                      </Button>
                      <p className="text-xs text-muted-foreground mt-4">
                        To export your WhatsApp chat: Open the chat in WhatsApp → Menu (⋮) → More → Export chat → Without media
                      </p>
                    </div>
                  </div>
                  
                  {fileName && (
                    <div className="bg-green-50 border border-green-200 rounded-md p-4 flex items-center justify-between">
                      <div className="flex items-center">
                        <FileText className="h-5 w-5 mr-2 text-green-600" />
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">{fileName}</span>
                          <span className="text-xs text-muted-foreground">{conversation.length} characters imported</span>
                        </div>
                        {fileIsZip && <Badge className="ml-2 bg-blue-500/80 text-white text-xs">WhatsApp Export</Badge>}
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setFileName("");
                          setConversation("");
                          if (fileInputRef.current) fileInputRef.current.value = "";
                        }}
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                  
                  <div>
                    <div className="flex justify-between mb-1">
                      <Label htmlFor="participants-upload">Group Chat Participants</Label>
                      <div className="text-xs text-muted-foreground">
                        {participants.length} participants detected
                      </div>
                    </div>
                    <Textarea
                      id="participants-upload"
                      placeholder="Enter participant names, one per line (automatically detected from conversation)"
                      className="mt-1 h-[100px]"
                      value={participants.join('\n')}
                      onChange={(e) => {
                        const lines = e.target.value.split('\n').filter(line => line.trim() !== '');
                        setParticipants(lines);
                      }}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Participants are automatically detected. You can add or remove names as needed.
                    </p>
                  </div>
                  
                  <div className="mb-6">
                    <Label className="mb-2 block">Analysis Tier</Label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <Button
                        variant={selectedTier === 'free' ? 'default' : 'outline'}
                        onClick={() => setSelectedTier('free')}
                        className={selectedTier === 'free' ? 'bg-primary text-white' : ''}
                      >
                        Free
                      </Button>
                      <Button
                        variant={selectedTier === 'personal' ? 'default' : 'outline'}
                        onClick={() => setSelectedTier('personal')}
                        className={selectedTier === 'personal' ? 'bg-primary text-white' : ''}
                      >
                        Personal
                      </Button>
                      <Button
                        variant={selectedTier === 'pro' ? 'default' : 'outline'}
                        onClick={() => setSelectedTier('pro')}
                        className={selectedTier === 'pro' ? 'bg-primary text-white' : ''}
                      >
                        Pro
                      </Button>
                      <Button
                        variant={selectedTier === 'instant' ? 'default' : 'outline'}
                        onClick={() => setSelectedTier('instant')}
                        className={selectedTier === 'instant' ? 'bg-primary text-white' : ''}
                      >
                        Instant
                      </Button>
                    </div>
                  </div>
                  
                  <Button 
                    onClick={handleSubmit}
                    disabled={!conversation || isAnalyzing || participants.length < 2}
                    className="w-full bg-primary text-white"
                  >
                    {isAnalyzing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Analyzing Group Chat...
                      </>
                    ) : (
                      <>
                        <Brain className="h-4 w-4 mr-2" />
                        Analyze Group Chat
                      </>
                    )}
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
      
      {/* Display error message if present */}
      {errorMessage && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}
    </section>
  );
}