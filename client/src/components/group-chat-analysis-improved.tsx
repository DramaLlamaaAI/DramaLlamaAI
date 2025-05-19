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

// Enhanced helper for detecting participants in WhatsApp group chat
function detectGroupParticipants(conversation: string): string[] {
  if (!conversation || conversation.trim() === '') {
    console.log("Empty conversation text, cannot detect participants");
    return [];
  }
  
  // Handle binary data in ZIP files
  if (conversation.startsWith('PK\u0003\u0004')) {
    console.log("Binary ZIP data detected, cannot extract participants directly");
    return [];
  }
  
  console.log("Detecting participants in conversation text");
  const lines = conversation.split('\n');
  console.log(`Found ${lines.length} lines in the conversation`);
  
  // Print a few sample lines to help with debugging
  if (lines.length > 3) {
    console.log("Sample lines:");
    console.log("Line 1:", lines[0]);
    console.log("Line 2:", lines[1]);
    console.log("Line 3:", lines[2]);
  }
  
  // WhatsApp format patterns - handling more variations
  // Note: The patterns below use non-greedy matches .*? and more flexible name capture
  // to handle emojis, special characters and various formats
  const patterns = [
    // Pattern for bracketed timestamp: [05/19/24, 7:45:12 PM] Name with 🌟 emoji: Message
    /\[\d+[\/-]\d+[\/-]\d+,?\s+\d+:\d+.*?\]\s+(.*?):/,
    
    // Pattern for hyphenated timestamp: 05/19/24, 7:45:12 PM - Name with 🌟 emoji: Message
    /\d+[\/-]\d+[\/-]\d+,?\s+\d+:\d+.*?\s+-\s+(.*?):/,
    
    // More flexible pattern for various formats
    /(?:^|\n)(?:\[|\()?\s*(?:\d+[\/-]\d+[\/-]\d+)?(?:,?\s+\d+:\d+.*?)?(?:\]|\))?\s*(?:-\s*)?([\w\s\u00C0-\u017F\u0080-\uFFFF]+?):/
  ];
  
  const foundParticipants = new Set<string>();
  let matchCount = 0;
  
  for (const line of lines) {
    let matched = false;
    
    for (const pattern of patterns) {
      const match = line.match(pattern);
      if (match && match[1]) {
        // Get the participant name, preserving emojis and special characters
        const participant = match[1].trim();
        matchCount++;
        
        // Skip system messages by checking for common WhatsApp notification text
        if (participant && 
            !participant.includes('changed the subject') && 
            !participant.includes('added') && 
            !participant.includes('removed') &&
            !participant.includes('left') &&
            !participant.includes('joined') &&
            !participant.includes('created group') &&
            !participant.includes('changed this group')) {
          
          foundParticipants.add(participant);
          matched = true;
          break; // Found a match with this pattern, no need to check others
        }
      }
    }
    
    // Debug non-matching lines (first 5 only)
    if (!matched && matchCount < 5) {
      console.log("Non-matching line sample:", line.substring(0, 100));
    }
  }
  
  console.log(`Found ${matchCount} matching message lines`);
  console.log(`Detected ${foundParticipants.size} unique participants:`, Array.from(foundParticipants));
  
  return Array.from(foundParticipants);
}

export default function GroupChatAnalysisImproved() {
  const [tabValue, setTabValue] = useState("paste");
  const [conversation, setConversation] = useState("");
  const [participants, setParticipants] = useState<string[]>([]);
  const [newParticipant, setNewParticipant] = useState("");
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
  
  // Simplified file upload handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Show loading notification
    toast({
      title: "Processing File",
      description: "Please wait while we import your conversation...",
    });
    
    setFileName(file.name);
    
    try {
      console.log("Processing file:", file.name, "Type:", file.type);
      
      // First try the simple approach - read as text file
      try {
        const text = await file.text();
        console.log("Text content length:", text.length, "Sample:", text.substring(0, 50));
        
        if (text && text.length > 0) {
          // Set the conversation text
          setConversation(text);
          
          // Detect participants
          const detectedParticipants = detectGroupParticipants(text);
          console.log("Detected participants:", detectedParticipants);
          
          if (detectedParticipants.length > 0) {
            setParticipants(detectedParticipants);
            toast({
              title: "Chat Imported Successfully",
              description: `Found ${detectedParticipants.length} participants in the group chat.`,
            });
          } else {
            // If no participants detected, set default ones
            const defaultParticipants = ["Person 1", "Person 2"];
            setParticipants(defaultParticipants);
            toast({
              title: "Chat Imported - Names Not Detected",
              description: "Please update the participant names below before analyzing.",
            });
          }
          return;
        }
      } catch (directReadError) {
        console.log("Direct text reading failed, trying ZIP approach:", directReadError);
      }
      
      // If direct text reading failed, try as ZIP
      if (file.name.endsWith('.zip') || file.type === 'application/zip' || file.type === '') {
        try {
          const arrayBuffer = await file.arrayBuffer();
          const zip = await JSZip.loadAsync(arrayBuffer);
          const files = Object.values(zip.files);
          
          // Find all text files in the ZIP
          const textFiles = files.filter(f => !f.dir && 
            (f.name.endsWith('.txt') || f.name.includes('chat')));
          
          console.log("Text files in ZIP:", textFiles.map(f => f.name));
          
          if (textFiles.length === 0) {
            // No text files found, but we can still show the conversation
            // This allows the user to manually enter participant names
            
            // Create some default participants to allow analysis
            const defaultParticipants = ["Person 1", "Person 2"];
            setParticipants(defaultParticipants);
            
            // Take the first non-directory file as the conversation
            const anyFile = files.find(f => !f.dir);
            if (anyFile) {
              try {
                const content = await anyFile.async('text');
                setConversation(content);
                toast({
                  title: "Chat Imported - Names Not Detected",
                  description: "Please verify and edit the participant names below before analyzing.",
                });
              } catch (err) {
                console.error("Error reading file from ZIP:", err);
                toast({
                  title: "Import Issue",
                  description: "Please try exporting your WhatsApp chat as a text file instead of ZIP.",
                  variant: "destructive",
                });
              }
            } else {
              toast({
                title: "Empty ZIP File",
                description: "The ZIP file appears to be empty. Please try exporting the chat again.",
                variant: "destructive",
              });
            }
            return;
          }
          
          // Try each text file until we find one with valid content
          for (const textFile of textFiles) {
            try {
              const content = await textFile.async('text');
              
              if (content && content.length > 0) {
                setConversation(content);
                
                const detectedParticipants = detectGroupParticipants(content);
                if (detectedParticipants.length > 0) {
                  setParticipants(detectedParticipants);
                  toast({
                    title: "Chat Imported Successfully",
                    description: `Found ${detectedParticipants.length} participants in the group chat from ${textFile.name}.`,
                  });
                  return;
                } else {
                  // If no participants detected, set default ones
                  setParticipants(["Person 1", "Person 2"]);
                  toast({
                    title: "Chat Imported - Names Not Detected",
                    description: "Please verify and edit the participant names below before analyzing.",
                  });
                  return;
                }
              }
            } catch (err) {
              console.error("Error reading file from ZIP:", textFile.name, err);
            }
          }
          
          // If we got here, we found text files but couldn't detect participants
          if (textFiles.length > 0) {
            // Use the first text file
            const content = await textFiles[0].async('text');
            setConversation(content);
            // Set default participant names
            setParticipants(["Person 1", "Person 2"]);
            toast({
              title: "Chat Imported - Please Verify Names",
              description: "Please update the participant names below before analyzing.",
            });
          }
        } catch (zipError) {
          console.error("ZIP processing error:", zipError);
          toast({
            title: "ZIP Processing Failed",
            description: "Could not process the ZIP file. Please try uploading a direct .txt export instead.",
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Unknown File Format",
          description: "Please upload a WhatsApp chat export as a .txt file or .zip archive.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("File processing error:", error);
      toast({
        title: "Import Failed",
        description: "Could not process the file. Please try exporting the chat again in a different format.",
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
      // Pass participant information in an expected field
      extraData: JSON.stringify({
        groupChat: true,
        allParticipants: participants
      })
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
              {result.redFlags && (
                <RedFlags 
                  redFlags={result.redFlags} 
                  tier="free"
                  redFlagsCount={result.redFlagsCount || 0}
                  redFlagTypes={result.redFlagTypes || []}
                  redFlagsDetected={result.redFlagsDetected || false}
                  sampleQuotes={[]}
                  conversation={conversation}
                  overallTone={result.toneAnalysis?.overallTone || 'neutral'}
                />
              )}
              <RegistrationPrompt tier={usage?.tier || 'anonymous'} />
            </div>
          ) : (
            <div className="space-y-8">
              {result.redFlags && (
                <RedFlags 
                  redFlags={result.redFlags} 
                  tier={selectedTier}
                  redFlagsCount={result.redFlagsCount || 0}
                  redFlagTypes={result.redFlagTypes || []}
                  redFlagsDetected={result.redFlagsDetected || false}
                  sampleQuotes={[]}
                  conversation={conversation}
                  overallTone={result.toneAnalysis?.overallTone || 'neutral'}
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
                    usage.tier === 'anonymous' && usage.limit !== null
                      ? ` - ${Math.max(0, usage.limit - usage.used)} free ${Math.max(0, usage.limit - usage.used) === 1 ? 'analysis' : 'analyses'} remaining` 
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
                  
                  <div className="mb-4">
                    <div className="flex justify-between mb-1">
                      <Label htmlFor="participants-list">Group Chat Participants</Label>
                      <div className="text-xs text-muted-foreground">
                        {participants.length} participants {participants.length > 0 ? 'added' : 'needed'}
                      </div>
                    </div>
                    
                    {/* Participant addition form */}
                    <div className="flex gap-2 mb-3">
                      <input
                        type="text"
                        id="new-participant"
                        placeholder="Enter participant name including any emojis"
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={newParticipant}
                        onChange={(e) => setNewParticipant(e.target.value)}
                      />
                      <Button 
                        type="button" 
                        onClick={() => {
                          if (newParticipant.trim()) {
                            setParticipants([...participants, newParticipant.trim()]);
                            setNewParticipant("");
                          }
                        }}
                        disabled={!newParticipant.trim()}
                      >
                        Add
                      </Button>
                    </div>
                    
                    {/* Participant list */}
                    <div className="border rounded-md mb-3">
                      <div className="p-3 bg-muted/30 border-b">
                        <h4 className="font-medium text-sm">Current Participants</h4>
                      </div>
                      
                      {participants.length > 0 ? (
                        <ul className="p-2">
                          {participants.map((participant, index) => (
                            <li key={index} className="flex justify-between items-center p-2 border-b last:border-0">
                              <span className="font-medium">{participant}</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  const newParticipants = [...participants];
                                  newParticipants.splice(index, 1);
                                  setParticipants(newParticipants);
                                }}
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <div className="p-4 text-center text-sm text-muted-foreground">
                          No participants added yet. Add at least 2 participants for analysis.
                        </div>
                      )}
                    </div>
                    
                    {/* Helper information */}
                    <Alert className="bg-blue-50 border-blue-200">
                      <AlertCircle className="h-4 w-4 mr-2 text-blue-600" />
                      <AlertTitle className="text-sm font-medium text-blue-800">Important Tips</AlertTitle>
                      <AlertDescription className="text-xs text-blue-700">
                        <ul className="list-disc pl-4 space-y-1 mt-1">
                          <li>Add names <strong>exactly as they appear in the chat</strong>, including any emojis and special characters</li>
                          <li>At least 2 participants are required for analysis</li>
                          <li>For accurate results, make sure you've added all active participants from the conversation</li>
                        </ul>
                      </AlertDescription>
                    </Alert>
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