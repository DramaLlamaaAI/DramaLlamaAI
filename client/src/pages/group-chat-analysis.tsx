import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Loader2, AlertCircle, FileText, XCircle, Brain, ArrowLeft, UserPlus, UserMinus, Save, Download, Lock } from "lucide-react";
import { ChatAnalysisRequest, ChatAnalysisResponse, analyzeChatConversation, getUserUsage } from "@/lib/openai";
import JSZip from "jszip";
import exportToPdf from '@/components/export-document-generator';
import RedFlags from "@/components/red-flags";
import RegistrationPrompt from "@/components/registration-prompt";
import EvasionDetection from "@/components/evasion-detection";
import ConflictDynamics from "@/components/conflict-dynamics";
import BackHomeButton from "@/components/back-home-button";
import WhatsAppImporter from "@/components/whats-app-importer";

export default function GroupChatAnalysis() {
  const { user, isLoading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const [conversation, setConversation] = useState("");
  const [participants, setParticipants] = useState<string[]>([]);
  const [newParticipant, setNewParticipant] = useState("");
  const [fileName, setFileName] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [result, setResult] = useState<ChatAnalysisResponse | null>(null);
  const { toast } = useToast();
  
  // Check if user can access this Pro feature
  const isPro = user?.tier === 'pro' || user?.tier === 'instant';

  // Track if analysis is running
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Get user usage
  const { data: usage = { tier: "free", used: 0, limit: 2 } } = useQuery({
    queryKey: ["/api/user/usage"],
    queryFn: getUserUsage,
  });

  // Analysis mutation
  const analysisMutation = useMutation({
    mutationFn: (requestData: ChatAnalysisRequest) => analyzeChatConversation(requestData),
    onSuccess: (data) => {
      setResult(data);
      setIsAnalyzing(false);
      toast({
        title: "Analysis Complete",
        description: "Your group conversation analysis is ready to review.",
      });
    },
    onError: (error: any) => {
      setErrorMessage(error.message || "Analysis failed. Please try again.");
      setIsAnalyzing(false);
      toast({
        title: "Analysis Failed",
        description: error.message || "Analysis failed. Please try again.",
        variant: "destructive",
      });
    },
  });
  
  // Add a participant to the list
  const addParticipant = () => {
    if (newParticipant.trim() === "") return;
    if (!participants.includes(newParticipant.trim())) {
      setParticipants([...participants, newParticipant.trim()]);
    }
    setNewParticipant("");
  };

  // Remove a participant from the list
  const removeParticipant = (index: number) => {
    const updatedParticipants = [...participants];
    updatedParticipants.splice(index, 1);
    setParticipants(updatedParticipants);
  };

  // Update a participant name
  const updateParticipant = (index: number, newName: string) => {
    const updatedParticipants = [...participants];
    updatedParticipants[index] = newName;
    setParticipants(updatedParticipants);
  };

  // Handle WhatsApp chat import
  const handleChatImport = (text: string, detectedParticipants: string[]) => {
    setConversation(text);
    if (detectedParticipants.length > 0) {
      setParticipants(detectedParticipants);
    }
  };

  // Run the analysis
  const runAnalysis = () => {
    if (!conversation || conversation.trim() === "") {
      toast({
        title: "Missing Conversation",
        description: "Please enter or upload a conversation to analyze.",
        variant: "destructive",
      });
      return;
    }

    if (participants.length < 2) {
      toast({
        title: "Need More Participants",
        description: "Please add at least 2 participants for group analysis.",
        variant: "destructive",
      });
      return;
    }

    setIsAnalyzing(true);
    setResult(null);
    setErrorMessage(null);

    // Create the analysis request with participant data
    const requestData: ChatAnalysisRequest = {
      conversation,
      me: participants[0],
      them: participants[1],
      // Pass group chat info in extraData as our API expects
      extraData: {
        isGroupChat: true,
        groupParticipants: participants
      }
    };

    analysisMutation.mutate(requestData);
  };

  // Handle PDF export
  const handleExportToPdf = () => {
    if (!result) return;
    
    const filename = fileName ? `${fileName.split('.')[0]}_analysis.pdf` : "group_chat_analysis.pdf";
    
    exportToPdf({
      result: result,
      fileName: filename,
      me: participants[0],
      them: participants.length > 1 ? participants[1] : "Other",
      participants: participants,
      tier: usage?.tier || "free",
      isGroupChat: true
    });
    
    toast({
      title: "Export Started",
      description: "Your PDF is being generated and will download shortly.",
    });
  };

  // Go back to home
  const goBack = () => {
    navigate("/");
  };

  // If user is not Pro, we'll show a restriction message and prompt to upgrade
  if (!isPro) {
    return (
      <div className="container mx-auto py-8 px-4 md:px-8 max-w-5xl">
        <BackHomeButton />
        
        <h1 className="text-3xl font-bold mb-8 mt-4 text-center">Group Chat Analysis</h1>
        
        <Card className="border-2 border-muted-foreground/20 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-primary/10 to-secondary/10">
            <div className="flex items-center justify-between">
              <CardTitle>WhatsApp Group Chat Analysis</CardTitle>
              <Badge className="bg-gradient-to-r from-primary to-secondary border-0">PRO</Badge>
            </div>
            <CardDescription>
              Advanced multi-participant chat analysis with personalized insights for each member
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6 text-center">
            <div className="flex justify-center mb-6">
              <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center">
                <Users className="w-12 h-12 text-muted-foreground" />
              </div>
            </div>
            
            <h3 className="text-xl font-bold mb-3">Pro Plan Feature</h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Group chat analysis is exclusively available to Pro tier subscribers. Upgrade your plan to analyze conversations with multiple participants and discover group dynamics.
            </p>
            
            <Button 
              className="bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 text-white border-0"
              size="lg"
              onClick={() => navigate("/subscription")}
            >
              Upgrade to Pro
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  // If user is Pro, show the regular interface
  return (
    <div className="container mx-auto py-8 px-4 md:px-8 max-w-5xl">
      <BackHomeButton />
      
      <h1 className="text-3xl font-bold mb-8 mt-4 text-center">Group Chat Analysis</h1>
      
      {!result ? (
        <div className="space-y-8">
          {/* Analysis Setup Card */}
          <Card>
            <CardHeader>
              <CardTitle>Group Chat Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* WhatsApp Upload Section */}
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">Import Your Chat</h3>
                
                <WhatsAppImporter onConversationImport={handleChatImport} />
                
                {/* Usage limit warning */}
                {usage && (
                  <div className="mt-4">
                    <Alert className={(usage.limit - usage.used) <= 1 ? "bg-amber-50 border-amber-200" : "bg-blue-50 border-blue-200"}>
                      <AlertCircle className="h-4 w-4 mr-2 text-foreground" />
                      <AlertTitle>Usage Information</AlertTitle>
                      <AlertDescription>
                        You have {usage.limit - usage.used} out of {usage.limit} free analyses remaining this month.
                        {(usage.limit - usage.used) <= 1 && (
                          <p className="mt-1 text-amber-800">
                            ⚠️ You're almost out of free analyses. Consider upgrading for more.
                          </p>
                        )}
                      </AlertDescription>
                    </Alert>
                  </div>
                )}
              </div>
              
              {/* Conversation Text Area */}
              <div className="space-y-2">
                <Label htmlFor="conversation">
                  Conversation Text 
                  {conversation && <span className="text-xs text-muted-foreground ml-2">({conversation.length} characters)</span>}
                </Label>
                <Textarea
                  id="conversation"
                  placeholder="Paste your group conversation here..."
                  className="min-h-[200px]"
                  value={conversation}
                  onChange={(e) => setConversation(e.target.value)}
                />
              </div>
              
              {/* Participants Section */}
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold mb-2">Participants</h3>
                  <div className="text-sm text-muted-foreground mb-4">
                    Enter the names of all participants in the conversation
                  </div>
                  
                  {/* Add participant form */}
                  <div className="flex gap-2 mb-4">
                    <Input
                      placeholder="Enter a participant's name"
                      value={newParticipant}
                      onChange={(e) => setNewParticipant(e.target.value)}
                      className="flex-1"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addParticipant();
                        }
                      }}
                    />
                    <Button 
                      onClick={addParticipant}
                      variant="outline"
                    >
                      <UserPlus className="h-4 w-4 mr-2" />
                      Add
                    </Button>
                  </div>
                  
                  {/* Participants list */}
                  {participants.length > 0 ? (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium">Current Participants:</h4>
                      <div className="flex flex-wrap gap-2">
                        {participants.map((participant, index) => (
                          <div 
                            key={index} 
                            className="flex items-center gap-2 border rounded-md px-2 py-1 bg-background"
                          >
                            <Input
                              value={participant}
                              onChange={(e) => updateParticipant(index, e.target.value)}
                              className="h-7 min-w-[120px] max-w-[200px]"
                              size="sm"
                            />
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => removeParticipant(index)}
                              className="h-6 w-6 text-destructive"
                            >
                              <UserMinus className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 border border-dashed rounded-md text-center text-muted-foreground">
                      No participants added yet. Add at least two participants.
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
            <CardFooter className="border-t pt-6 flex justify-between">
              <Button onClick={goBack} variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Home
              </Button>
              <Button 
                onClick={runAnalysis}
                disabled={isAnalyzing || !conversation || participants.length < 2}
                className="bg-primary text-white"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Brain className="h-4 w-4 mr-2" />
                    Analyze Group Chat
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>

          {/* Error message display */}
          {errorMessage && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4 mr-2" />
              <AlertTitle>Analysis Error</AlertTitle>
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          )}
        </div>
      ) : (
        // Analysis Results Section
        <div className="space-y-8">
          {/* Results header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold">Analysis Results</h2>
              <p className="text-muted-foreground mt-1">
                Group chat with {participants.length} participants
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={goBack}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <Button 
                onClick={handleExportToPdf}
                variant="outline"
              >
                <Download className="h-4 w-4 mr-2" />
                Export as PDF
              </Button>
            </div>
          </div>
          
          {/* Results tabs */}
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid grid-cols-3 mb-6">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="dynamics">Group Dynamics</TabsTrigger>
              <TabsTrigger value="red-flags">Red Flags</TabsTrigger>
            </TabsList>
            
            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Overall Conversation Tone</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-medium">Group Tone</h3>
                      <p>{result.toneAnalysis?.overallTone || "Neutral"}</p>
                    </div>
                    
                    {result.toneAnalysis?.participantTones && (
                      <div>
                        <h3 className="text-lg font-medium">Individual Tones</h3>
                        <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                          {Object.entries(result.toneAnalysis.participantTones).map(([name, tone]) => (
                            <div key={name} className="border rounded-md p-3">
                              <div className="font-medium">{name}</div>
                              <div className="text-sm mt-1">{tone}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {result.communication?.patterns && (
                      <div>
                        <h3 className="text-lg font-medium">Communication Patterns</h3>
                        <ul className="list-disc pl-6 mt-2 space-y-1">
                          {result.communication.patterns.map((pattern, i) => (
                            <li key={i}>{pattern}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle>Emotional Analysis</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-5">
                    {result.toneAnalysis?.emotionalState && (
                      <div>
                        <h3 className="text-lg font-medium mb-4">Emotional States</h3>
                        <div className="mt-3 grid grid-cols-2 md:grid-cols-3 gap-4">
                          {result.toneAnalysis.emotionalState.map((emotion, i) => (
                            <div key={i} className="border rounded-md p-4 flex flex-col">
                              <div className="font-medium">{emotion.emotion}</div>
                              <div className="mt-2 h-2.5 bg-gray-200 rounded-full">
                                <div 
                                  className="h-full bg-primary rounded-full"
                                  style={{ width: `${emotion.intensity * 100}%` }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {result.communication?.suggestions && (
                      <div>
                        <h3 className="text-lg font-medium mb-4">Communication Suggestions</h3>
                        <div className="mt-2 border rounded-md p-5 bg-muted/30">
                          <ul className="list-disc pl-6 space-y-3">
                            {result.communication.suggestions.map((suggestion, i) => (
                              <li key={i} className="text-sm">{suggestion}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
              
              {usage?.tier === "free" && (
                <RegistrationPrompt tier="free" />
              )}
            </TabsContent>
            
            {/* Group Dynamics Tab */}
            <TabsContent value="dynamics" className="space-y-6">
              {/* Evasion Detection (personal and pro tiers only) */}
              {(usage?.tier === "personal" || usage?.tier === "pro" || usage?.tier === "instant") && result.evasionDetection && (
                <EvasionDetection
                  tier={usage?.tier || "free"}
                  evasionDetection={result.evasionDetection}
                />
              )}
              
              {/* Conflict Dynamics (all tiers) */}
              {result.conflictDynamics && (
                <ConflictDynamics 
                  tier={usage?.tier || "free"}
                  conflictDynamics={result.conflictDynamics} 
                />
              )}
              
              {/* Only show Message Dominance for personal and pro tiers */}
              {(usage?.tier === "personal" || usage?.tier === "pro" || usage?.tier === "instant") && result.messageDominance && (
                <Card>
                  <CardHeader className="pb-4">
                    <CardTitle>Message Dominance</CardTitle>
                    <CardDescription>
                      Analysis of messaging patterns and participation levels
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-5">
                      {result.messageDominance.summary && (
                        <p className="text-sm">{result.messageDominance.summary}</p>
                      )}
                      
                      {result.messageDominance.participants && (
                        <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-5">
                          {Object.entries(result.messageDominance.participants).map(([name, data]) => (
                            <div key={name} className="border rounded-md p-5">
                              <div className="font-medium">{name}</div>
                              <div className="flex items-center gap-3 mt-3">
                                <div className="text-sm">Message share:</div>
                                <div className="h-2.5 bg-gray-200 rounded-full flex-1">
                                  <div 
                                    className="h-full bg-primary rounded-full"
                                    style={{ width: `${data.percentage || 0}%` }}
                                  />
                                </div>
                                <div className="text-sm font-medium">{data.percentage || 0}%</div>
                              </div>
                              {data.assessment && (
                                <div className="mt-3 text-sm">{data.assessment}</div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
              
              {/* Only show Power Dynamics for pro and instant tiers */}
              {(usage?.tier === "pro" || usage?.tier === "instant") && result.powerDynamics && (
                <Card>
                  <CardHeader className="pb-4">
                    <CardTitle>Power Dynamics</CardTitle>
                    <CardDescription>
                      Analysis of relationship influence and control patterns
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-5">
                      {result.powerDynamics.summary && (
                        <p className="text-sm">{result.powerDynamics.summary}</p>
                      )}
                      
                      {result.powerDynamics.patterns && result.powerDynamics.patterns.length > 0 && (
                        <div className="mt-5">
                          <h3 className="text-lg font-medium mb-4">Power Patterns</h3>
                          <div className="space-y-4">
                            {result.powerDynamics.patterns.map((pattern, i) => (
                              <div key={i} className="border rounded-md p-5">
                                <div className="font-medium">{pattern.type}</div>
                                <div className="text-sm mt-2">By: {pattern.participant}</div>
                                {pattern.quote && (
                                  <div className="mt-3 text-sm text-muted-foreground italic">
                                    "{pattern.quote}"
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
            
            {/* Red Flags Tab */}
            <TabsContent value="red-flags" className="space-y-6">
              <RedFlags 
                redFlags={result.redFlags}
                redFlagTypes={result.redFlagTypes}
                redFlagsCount={result.redFlagsCount}
                redFlagsDetected={result.redFlagsDetected}
                sampleQuotes={result.sampleQuotes}
                tier={usage?.tier || "free"}
                overallTone={result.toneAnalysis?.overallTone}
              />
              
              {usage?.tier === "free" && (
                <RegistrationPrompt tier="free" />
              )}
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
}