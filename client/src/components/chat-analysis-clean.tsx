import { useState, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info, Search, ArrowLeftRight, Brain, Upload, Image, AlertCircle, TrendingUp, Flame, Activity, Users, Edit, Settings, ChevronUpCircle, Zap, Archive, FileText, Home } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Link } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { analyzeChatConversation, detectParticipants, detectGroupParticipants, ChatAnalysisResponse } from "@/lib/openai";
import { useToast } from "@/hooks/use-toast";
import { validateConversation, getParticipantColor } from "@/lib/utils";
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
import LockedPreviewSections from "@/components/locked-preview-sections";

export default function ChatAnalysis() {
  const [tabValue, setTabValue] = useState("paste");
  const [conversationType, setConversationType] = useState<"two_person" | "group_chat">("two_person");
  const [conversation, setConversation] = useState("");
  const [me, setMe] = useState("");
  const [them, setThem] = useState("");
  const [participants, setParticipants] = useState<string[]>([]);
  const [fileName, setFileName] = useState("");
  const [fileIsZip, setFileIsZip] = useState(false);
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
  const { toast } = useToast();

  // Fetch user usage to determine feature access
  const { data: userUsage } = useQuery({
    queryKey: ["/api/user-usage"],
    queryFn: getUserUsage,
  });

  // Check if user can use features based on tier and usage
  const canUseFeature = userUsage && (userUsage.limit === null || userUsage.analysesRemaining > 0);

  const analysisMutation = useMutation({
    mutationFn: analyzeChatConversation,
    onSuccess: (data) => {
      setResult(data);
      setShowResults(true);
      setErrorMessage(null);
    },
    onError: (error: any) => {
      console.error('Analysis error:', error);
      setErrorMessage(error.message || 'An error occurred during analysis');
      setShowResults(false);
    },
  });

  const detectNamesMutation = useMutation({
    mutationFn: conversationType === "two_person" ? detectParticipants : detectGroupParticipants,
    onSuccess: (data) => {
      if (conversationType === "two_person") {
        const participantData = data as { me: string; them: string };
        setMe(participantData.me);
        setThem(participantData.them);
      } else {
        const participantData = data as { participants: string[] };
        setParticipants(participantData.participants);
      }
      toast({
        title: "Names detected",
        description: "Participant names have been automatically detected.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Detection failed",
        description: error.message || "Could not detect participant names automatically.",
        variant: "destructive",
      });
    },
  });

  const isSubmitting = analysisMutation.isPending;
  const isDetectingNames = detectNamesMutation.isPending;

  const handleSubmit = async () => {
    if (!canUseFeature) {
      toast({
        title: "Usage limit reached",
        description: "You have reached your analysis limit for this tier.",
        variant: "destructive",
      });
      return;
    }

    if (!conversation.trim()) {
      toast({
        title: "No conversation",
        description: "Please enter a conversation to analyze.",
        variant: "destructive",
      });
      return;
    }

    if (conversationType === "two_person" && (!me.trim() || !them.trim())) {
      toast({
        title: "Missing names",
        description: "Please enter both participant names.",
        variant: "destructive",
      });
      return;
    }

    if (conversationType === "group_chat" && participants.length === 0) {
      toast({
        title: "Missing participants",
        description: "Please detect or enter participant names.",
        variant: "destructive",
      });
      return;
    }

    const validationResult = validateConversation(conversation);
    if (!validationResult.isValid) {
      toast({
        title: "Invalid conversation format",
        description: validationResult.error || "Please check the conversation format.",
        variant: "destructive",
      });
      return;
    }

    let filteredConversation = conversation;
    if (focusRecent && fromDate) {
      const lines = conversation.split('\n');
      const filteredLines = lines.filter(line => {
        const dateMatch = line.match(/\[?(\d{1,2}\/\d{1,2}\/\d{2,4}|\d{1,2}-\d{1,2}-\d{2,4}|\d{4}-\d{1,2}-\d{1,2})/);
        if (dateMatch) {
          const messageDate = new Date(dateMatch[1]);
          const filterFromDate = new Date(fromDate);
          const filterToDate = toDate ? new Date(toDate) : new Date();
          return messageDate >= filterFromDate && messageDate <= filterToDate;
        }
        return true;
      });
      filteredConversation = filteredLines.join('\n');
    }

    analysisMutation.mutate({
      conversation: filteredConversation,
      me: conversationType === "two_person" ? me : "",
      them: conversationType === "two_person" ? them : "",
      participants: conversationType === "group_chat" ? participants : [],
      tier: selectedTier,
      conversationType
    });
  };

  const handleDetectNames = () => {
    if (!conversation.trim()) {
      toast({
        title: "No conversation",
        description: "Please enter a conversation first.",
        variant: "destructive",
      });
      return;
    }

    detectNamesMutation.mutate({ conversation });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      let content = "";
      setFileName(file.name);

      if (file.name.endsWith('.zip')) {
        setFileIsZip(true);
        const zip = new JSZip();
        const zipContents = await zip.loadAsync(file);
        
        for (const [filename, fileObj] of Object.entries(zipContents.files)) {
          if (filename.endsWith('.txt') && !fileObj.dir) {
            content = await fileObj.async('text');
            break;
          }
        }
      } else {
        setFileIsZip(false);
        content = await file.text();
      }

      setConversation(content);
      
      toast({
        title: "File uploaded",
        description: "WhatsApp chat file has been loaded successfully.",
      });
    } catch (error) {
      toast({
        title: "Upload failed",
        description: "Could not read the file. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-teal-600 mb-2">Chat Analysis</h1>
          <p className="text-muted-foreground">
            Get AI-powered insights into your conversations and communication patterns
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button variant="outline" size="sm">
              <Home className="h-4 w-4 mr-2" />
              Home
            </Button>
          </Link>
          <SupportHelpLinesLink />
        </div>
      </div>

      <Card>
        <CardContent className="p-6">
          <Tabs value={tabValue} onValueChange={setTabValue}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="paste">Paste Text</TabsTrigger>
              <TabsTrigger value="upload">Upload File</TabsTrigger>
              <TabsTrigger value="screenshot">Screenshot</TabsTrigger>
            </TabsList>

            {/* Paste Text Tab */}
            <TabsContent value="paste" className="mt-4">
              <div className="space-y-4">
                <div className="text-center mb-6">
                  <div className="bg-green-100 inline-block p-4 mb-3 rounded-full">
                    <FileText className="h-8 w-8 text-green-600" />
                  </div>
                  <h3 className="text-xl font-medium text-green-700 mb-2">Paste Your Conversation</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Copy and paste your conversation text directly into the textarea below
                  </p>
                </div>

                <div className="mb-4">
                  <Label className="block mb-2 font-medium">Conversation Type</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <Button
                      variant={conversationType === "two_person" ? "default" : "outline"}
                      onClick={() => setConversationType("two_person")}
                      className="justify-start"
                    >
                      <Users className="h-4 w-4 mr-2" />
                      Two-Person Chat
                    </Button>
                    <Button
                      variant={conversationType === "group_chat" ? "default" : "outline"}
                      onClick={() => setConversationType("group_chat")}
                      className="justify-start"
                    >
                      <Users className="h-4 w-4 mr-2" />
                      WhatsApp Group Chat
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    {conversationType === "two_person" 
                      ? "Select 'Two-Person Chat' for a conversation between two people." 
                      : "Select 'WhatsApp Group Chat' for a conversation with multiple participants."}
                  </p>
                </div>

                <Textarea
                  placeholder="Paste your conversation here..."
                  value={conversation}
                  onChange={(e) => setConversation(e.target.value)}
                  className="min-h-32 font-mono text-sm"
                />

                {conversation && (
                  <div className="space-y-4">
                    {conversationType === "two_person" ? (
                      <>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="your-name" className="block mb-2 font-medium">Your Name</Label>
                            <Input
                              id="your-name"
                              placeholder="Your name in the chat"
                              value={me}
                              onChange={(e) => setMe(e.target.value)}
                            />
                          </div>
                          <div>
                            <Label htmlFor="other-name" className="block mb-2 font-medium">Other Person's Name</Label>
                            <Input
                              id="other-name"
                              placeholder="Other person's name"
                              value={them}
                              onChange={(e) => setThem(e.target.value)}
                            />
                          </div>
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
                        </div>
                      </>
                    ) : (
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
                              Auto-Detect Participants
                            </>
                          )}
                        </Button>

                        {participants.length > 0 && (
                          <div className="p-3 bg-gray-50 rounded-md">
                            <p className="text-sm font-medium mb-2">Detected Participants:</p>
                            <div className="flex flex-wrap gap-2">
                              {participants.map((participant, index) => (
                                <span
                                  key={index}
                                  className="px-2 py-1 text-xs rounded-full"
                                  style={{ backgroundColor: getParticipantColor(participant) }}
                                >
                                  {participant}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

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
                )}
              </div>
            </TabsContent>

            {/* Upload File Tab */}
            <TabsContent value="upload" className="mt-4">
              <div className="space-y-4">
                <div className="mb-4">
                  <Label className="block mb-2 font-medium">Conversation Type</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <Button
                      variant={conversationType === "two_person" ? "default" : "outline"}
                      onClick={() => setConversationType("two_person")}
                      className="justify-start"
                    >
                      <Users className="h-4 w-4 mr-2" />
                      Two-Person Chat
                    </Button>
                    <Button
                      variant={conversationType === "group_chat" ? "default" : "outline"}
                      onClick={() => setConversationType("group_chat")}
                      className="justify-start"
                    >
                      <Users className="h-4 w-4 mr-2" />
                      WhatsApp Group Chat
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    {conversationType === "two_person" 
                      ? "Select 'Two-Person Chat' for a conversation between two people." 
                      : "Select 'WhatsApp Group Chat' for a conversation with multiple participants."}
                  </p>
                </div>
                
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
                  
                  {fileName && (
                    <div className="mt-4 text-left max-w-md mx-auto">
                      <p className="text-sm font-medium text-center mb-4">
                        File loaded: <span className="text-blue-700">{fileName}</span>
                      </p>
                      
                      <div className="space-y-4">
                        {conversationType === "two_person" ? (
                          <>
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
                            </div>
                          </>
                        ) : (
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
                                  Auto-Detect Participants
                                </>
                              )}
                            </Button>

                            {participants.length > 0 && (
                              <div className="p-3 bg-gray-50 rounded-md">
                                <p className="text-sm font-medium mb-2">Detected Participants:</p>
                                <div className="flex flex-wrap gap-2">
                                  {participants.map((participant, index) => (
                                    <span
                                      key={index}
                                      className="px-2 py-1 text-xs rounded-full"
                                      style={{ backgroundColor: getParticipantColor(participant) }}
                                    >
                                      {participant}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                        
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
                </div>
              </div>
            </TabsContent>

            {/* Screenshot Analysis Tab */}
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

            {/* Developer Mode Tab */}
            {isDevMode && (
              <TabsContent value="developer" className="mt-4">
                <div className="text-sm text-muted-foreground">
                  Developer mode for testing purposes
                </div>
              </TabsContent>
            )}
          </Tabs>

          {errorMessage && (
            <Alert className="mt-4" variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          )}

          {!canUseFeature && (
            <Alert className="mt-4">
              <Info className="h-4 w-4" />
              <AlertDescription>
                You have reached your analysis limit. Please upgrade your plan to continue.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {showResults && result && (
        <div className="mt-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-teal-600">Analysis Results</h2>
                <Button
                  onClick={() => exportToPdf({
                    result,
                    me: conversationType === "two_person" ? me : "",
                    them: conversationType === "two_person" ? them : "",
                    participants: conversationType === "group_chat" ? participants : [],
                    toast,
                    tier: selectedTier,
                    conversation
                  })}
                  variant="outline"
                  size="sm"
                >
                  Export PDF
                </Button>
              </div>

              {/* Overall Analysis */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <TrendingUp className="h-5 w-5 mr-2 text-blue-500" />
                  Overall Analysis
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">Summary</h4>
                    <p className="text-sm text-muted-foreground">{result.summary}</p>
                  </div>
                  
                  {result.tone && (
                    <div>
                      <h4 className="font-medium mb-2">Overall Tone</h4>
                      <p className="text-sm text-muted-foreground">{result.tone}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Red Flags Section */}
              {result.redFlags && (
                <RedFlags 
                  redFlags={result.redFlags}
                  redFlagTypes={result.redFlagTypes}
                />
              )}

              {/* Evasion Detection */}
              {result.evasionDetection && (
                <EvasionDetection evasionDetection={result.evasionDetection} />
              )}

              {/* Conflict Dynamics */}
              {result.conflictDynamics && (
                <ConflictDynamics conflictDynamics={result.conflictDynamics} />
              )}

              {/* Locked Sections for Free Tier */}
              <LockedPreviewSections 
                tier={selectedTier}
                result={result}
              />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}