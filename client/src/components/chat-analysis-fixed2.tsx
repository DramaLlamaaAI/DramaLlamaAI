import { useState, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info, Brain, Upload, AlertCircle, Users, Edit, Home } from "lucide-react";
import { Link } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { analyzeChatConversation, detectParticipants, ChatAnalysisResponse } from "@/lib/openai";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import { getUserUsage } from "@/lib/openai";
import { Label } from "@/components/ui/label";
import RegistrationPrompt from "@/components/registration-prompt";

export default function ChatAnalysisFixed() {
  const [tabValue, setTabValue] = useState("paste");
  const [conversationType, setConversationType] = useState<"two_person" | "group_chat">("two_person");
  const [conversation, setConversation] = useState("");
  const [me, setMe] = useState("");
  const [them, setThem] = useState("");
  const [result, setResult] = useState<ChatAnalysisResponse | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { toast } = useToast();

  const { data: usage } = useQuery({
    queryKey: ['/api/user/usage'],
    queryFn: getUserUsage,
  });
  
  const tier = usage?.tier || 'free';
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
  
  // Participant Name Form component for reuse
  const ParticipantNameForm = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="me-name" className="text-sm font-medium">Your Name/Identifier:</Label>
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
          <Label htmlFor="them-name" className="text-sm font-medium">Other Person's Name:</Label>
          <div className="flex gap-2">
            <input
              id="them-name"
              type="text"
              value={them}
              onChange={(e) => setThem(e.target.value)}
              className="w-full p-2 border rounded mt-1 text-sm"
              placeholder="Their name in the chat"
            />
            <Button 
              type="button" 
              variant="outline" 
              size="sm" 
              onClick={handleSwitchNames}
              className="mt-1"
            >
              Switch
            </Button>
          </div>
        </div>
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
          className="bg-teal-500 hover:bg-teal-600"
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
      <div className="flex justify-start mb-4">
        <Link to="/">
          <Button variant="outline" size="sm">
            <Home className="h-4 w-4 mr-2" />
            Back to Home
          </Button>
        </Link>
      </div>
      
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
                <TabsList className="grid grid-cols-2">
                  <TabsTrigger value="paste">
                    <Edit className="h-4 w-4 mr-2" />
                    Paste Text
                  </TabsTrigger>
                  <TabsTrigger value="upload">
                    <Upload className="h-4 w-4 mr-2" />
                    Upload File
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="paste" className="mt-4">
                  <div className="space-y-4">
                    {/* Info about chat analysis */}
                    <div className="mb-4">
                      <div className="flex items-center gap-2">
                        <Info className="h-4 w-4" />
                        <p className="text-sm text-muted-foreground">
                          For group chat analysis, please use the <Link to="/group-chat-analysis" className="text-teal-500 hover:underline">WhatsApp Group Chat Analysis</Link> page
                        </p>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-2">Paste your conversation here:</label>
                      <Textarea
                        value={conversation}
                        onChange={(e) => setConversation(e.target.value)}
                        placeholder="Paste your conversation or WhatsApp chat export..."
                        className="min-h-[200px]"
                      />
                      <p className="text-sm text-muted-foreground mt-1">
                        <Info className="h-4 w-4 inline-block mr-1" />
                        For best results, include at least 10-20 message exchanges
                      </p>
                    </div>
                    
                    {/* Paste tab participant form */}
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
                  <div className="bg-gray-50 rounded-lg p-6 mb-6">
                    <h2 className="text-xl font-bold mb-4">Analysis of conversation between {me} and {them}</h2>
                    
                    <div className="mb-6">
                      <h3 className="font-semibold mb-2">Overall Emotional Tone</h3>
                      <p className="mb-4">{result.toneAnalysis?.overallTone}</p>
                      
                      <h3 className="font-semibold mb-2">Conversation Health Score</h3>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm">{result.healthScore?.score || 0}/100</span>
                        <div className="flex-1 bg-gray-200 rounded-full h-2.5 overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${
                              (result.healthScore?.score || 0) >= 80 ? 'bg-green-600' : 
                              (result.healthScore?.score || 0) >= 65 ? 'bg-green-500' : 
                              (result.healthScore?.score || 0) >= 50 ? 'bg-yellow-500' :
                              (result.healthScore?.score || 0) >= 35 ? 'bg-orange-500' :
                              'bg-red-500'
                            }`}
                            style={{ width: `${result.healthScore?.score || 0}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium">
                          {(result.healthScore?.score || 0) >= 80 ? 'Very Healthy' : 
                           (result.healthScore?.score || 0) >= 65 ? 'Healthy' : 
                           (result.healthScore?.score || 0) >= 50 ? 'Tension' : 
                           (result.healthScore?.score || 0) >= 35 ? 'Concerning' :
                           'Conflict'}
                        </span>
                      </div>
                    </div>
                    
                    {result.redFlags && result.redFlags.length > 0 && (
                      <div className="mb-6">
                        <h3 className="font-semibold mb-2">
                          Potential Issues Detected 
                          <span className="ml-2 text-sm bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                            {result.redFlags.length} {result.redFlags.length === 1 ? 'red flag' : 'red flags'}
                          </span>
                        </h3>
                        <ul className="list-disc pl-5 space-y-2">
                          {result.redFlags.map((flag, i) => (
                            <li key={i}>
                              <span className="font-medium">{flag.type}:</span> {flag.description}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                  
                  {/* Prompt to register for more features */}
                  {tier === 'free' && <RegistrationPrompt tier="free" />}
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}