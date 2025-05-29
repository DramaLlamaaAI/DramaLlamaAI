import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info, Brain, Upload, AlertCircle, Users, Edit, Home, Image } from "lucide-react";
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
import ScreenshotTab from "@/components/screenshot-tab";

export default function ChatAnalysisRestored() {
  const [tabValue, setTabValue] = useState("upload");
  const [conversationType, setConversationType] = useState<"two_person" | "group_chat">("two_person");
  const [conversation, setConversation] = useState("");
  const [me, setMe] = useState("");
  const [them, setThem] = useState("");
  const [result, setResult] = useState<ChatAnalysisResponse | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { toast } = useToast();
  const { user } = useAuth();

  const { data: usage } = useQuery({
    queryKey: ['/api/user/usage'],
    queryFn: getUserUsage,
  });
  
  const tier = usage?.tier || 'free';
  const usedAnalyses = usage?.used || 0;
  const limitAnalyses = usage?.limit || 5;

  const analysisMutation = useMutation({
    mutationFn: async (conversation: any, me: any, them: any) => {
      console.log("Starting analysis with tier:", tier);
      
      if (!conversation.trim() || !me.trim() || !them.trim()) {
        throw new Error("Please fill in all fields");
      }

      const response = await analyzeChatConversation({
        conversation,
        me,
        them,
        tier,
        extraData: {
          conversationType: "two_person",
        }
      });

      return response;
    },
    onSuccess: (data) => {
      setResult(data);
      setShowResults(true);
      toast({
        title: "Analysis Complete",
        description: "Your conversation has been analyzed successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Analysis Failed", 
        description: error.message || "An error occurred during analysis.",
        variant: "destructive",
      });
    },
  });

  const detectParticipantsMutation = useMutation({
    mutationFn: detectParticipants,
    onSuccess: (data) => {
      if (data.me && data.them) {
        setMe(data.me);
        setThem(data.them);
      }
    },
    onError: (error: any) => {
      console.error("Participant detection failed:", error);
    },
  });

  const handleTextFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        setConversation(content);
        detectParticipantsMutation.mutate(content);
      };
      reader.readAsText(file);
    }
  };

  const getHealthScoreColor = (score: number) => {
    if (score >= 70) return '#10b981';
    if (score >= 40) return '#f59e0b'; 
    return '#ef4444';
  };

  const getHealthScoreText = (score: number) => {
    if (score >= 70) return 'Healthy communication patterns detected';
    if (score >= 40) return 'Some concerning patterns identified';
    return 'Significant communication issues detected';
  };

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
            
            {/* Usage display */}
            <div className="bg-white/60 rounded-lg p-4 mb-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-600">
                  {tier.charAt(0).toUpperCase() + tier.slice(1)} Tier Usage
                </span>
                <span className="text-sm text-gray-500">
                  {usedAnalyses}/{limitAnalyses} analyses used
                </span>
              </div>
              <Progress 
                value={(usedAnalyses / limitAnalyses) * 100} 
                className="h-2"
              />
            </div>
          </div>

          <Tabs value={tabValue} onValueChange={setTabValue} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="upload" className="flex items-center gap-2">
                <Upload className="h-4 w-4" />
                Chat Analysis
              </TabsTrigger>
              <TabsTrigger value="paste" className="flex items-center gap-2">
                <Edit className="h-4 w-4" />
                Paste Text
              </TabsTrigger>
              <TabsTrigger value="screenshot" className="flex items-center gap-2">
                <Image className="h-4 w-4" />
                Screenshot
              </TabsTrigger>
            </TabsList>

            {/* Chat Analysis Tab */}
            <TabsContent value="upload" className="space-y-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="file-upload" className="text-sm font-medium">
                    Upload Chat File (.txt)
                  </Label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    id="file-upload"
                    accept=".txt"
                    onChange={handleTextFileUpload}
                    className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-pink-50 file:text-pink-700 hover:file:bg-pink-100"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="me" className="text-sm font-medium">Your Name</Label>
                    <input
                      id="me"
                      type="text"
                      value={me}
                      onChange={(e) => setMe(e.target.value)}
                      placeholder="Enter your name"
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    />
                  </div>
                  <div>
                    <Label htmlFor="them" className="text-sm font-medium">Other Person's Name</Label>
                    <input
                      id="them"
                      type="text"
                      value={them}
                      onChange={(e) => setThem(e.target.value)}
                      placeholder="Enter their name"
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="conversation" className="text-sm font-medium">Conversation Content</Label>
                  <Textarea
                    id="conversation"
                    value={conversation}
                    onChange={(e) => setConversation(e.target.value)}
                    placeholder="Paste your conversation here..."
                    className="mt-1 min-h-[200px]"
                  />
                </div>

                <Button
                  onClick={() => analysisMutation.mutate(conversation, me, them)}
                  disabled={analysisMutation.isPending || !conversation.trim() || !me.trim() || !them.trim()}
                  className="w-full bg-pink-600 hover:bg-pink-700"
                >
                  {analysisMutation.isPending ? (
                    <>
                      <Brain className="mr-2 h-4 w-4 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Brain className="mr-2 h-4 w-4" />
                      Analyze Conversation
                    </>
                  )}
                </Button>
              </div>
            </TabsContent>

            {/* Paste Text Tab */}
            <TabsContent value="paste" className="space-y-6">
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="me-paste" className="text-sm font-medium">Your Name</Label>
                    <input
                      id="me-paste"
                      type="text"
                      value={me}
                      onChange={(e) => setMe(e.target.value)}
                      placeholder="Enter your name"
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    />
                  </div>
                  <div>
                    <Label htmlFor="them-paste" className="text-sm font-medium">Other Person's Name</Label>
                    <input
                      id="them-paste"
                      type="text"
                      value={them}
                      onChange={(e) => setThem(e.target.value)}
                      placeholder="Enter their name"
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="conversation-paste" className="text-sm font-medium">Conversation Content</Label>
                  <Textarea
                    id="conversation-paste"
                    value={conversation}
                    onChange={(e) => setConversation(e.target.value)}
                    placeholder="Paste your conversation here..."
                    className="mt-1 min-h-[300px]"
                  />
                </div>

                <Button
                  onClick={() => analysisMutation.mutate(conversation, me, them)}
                  disabled={analysisMutation.isPending || !conversation.trim() || !me.trim() || !them.trim()}
                  className="w-full bg-pink-600 hover:bg-pink-700"
                >
                  {analysisMutation.isPending ? (
                    <>
                      <Brain className="mr-2 h-4 w-4 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Brain className="mr-2 h-4 w-4" />
                      Analyze Conversation
                    </>
                  )}
                </Button>
              </div>
            </TabsContent>

            {/* Screenshot Tab */}
            <TabsContent value="screenshot" className="space-y-6">
              <ScreenshotTab
                selectedTier={tier}
                onAnalysisComplete={(result, conversation, me, them) => {
                  setTimeout(() => {
                    setResult(result);
                    setShowResults(true);
                    setConversation(conversation);
                    setMe(me);
                    setThem(them);
                    toast({
                      title: "Screenshot Analysis Complete",
                      description: "Your screenshot has been analyzed successfully.",
                    });
                  }, 100);
                }}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Results Section */}
      {showResults && result && (
        <Card>
          <CardHeader>
            <CardTitle className="text-purple-700">Analysis Results</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Overview Card */}
            <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-6 rounded-lg border">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold text-purple-700 mb-3">Overall Health Score</h3>
                  <div className="flex items-center space-x-4">
                    <div className="relative w-20 h-20">
                      <CircularProgressbar
                        value={result?.healthScore || 0}
                        text={`${result?.healthScore || 0}%`}
                        styles={buildStyles({
                          textSize: '16px',
                          pathColor: getHealthScoreColor(result?.healthScore || 0),
                          textColor: getHealthScoreColor(result?.healthScore || 0),
                          trailColor: '#e5e7eb',
                        })}
                      />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">
                        {getHealthScoreText(result?.healthScore || 0)}
                      </p>
                      <p className="text-xs text-gray-500">
                        Based on {tier} tier analysis
                      </p>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold text-purple-700 mb-3">Analysis Summary</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Participants:</span>
                      <span className="font-medium">{me} & {them}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Analysis Tier:</span>
                      <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">
                        {tier.charAt(0).toUpperCase() + tier.slice(1)}
                      </span>
                    </div>
                    {result?.toneAnalysis?.overallTone && (
                      <div className="flex justify-between">
                        <span>Overall Tone:</span>
                        <span className="text-xs max-w-[180px] text-right">
                          {result.toneAnalysis.overallTone}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Additional analysis sections */}
            {result?.toneAnalysis && (
              <Card className="bg-white border">
                <CardHeader>
                  <CardTitle className="text-lg text-purple-700">Tone Analysis</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {result.toneAnalysis.overallTone && (
                      <div>
                        <h4 className="font-medium text-gray-700 mb-2">Overall Tone</h4>
                        <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-md">
                          {result.toneAnalysis.overallTone}
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {result?.redFlags && (
              <Card className="bg-white border">
                <CardHeader>
                  <CardTitle className="text-lg text-red-700">Red Flags Detected</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {result.redFlags.types && result.redFlags.types.length > 0 && (
                      <div>
                        <h4 className="font-medium text-gray-700 mb-2">Concerning Patterns</h4>
                        <div className="flex flex-wrap gap-2">
                          {result.redFlags.types.map((type: string, index: number) => (
                            <span key={index} className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">
                              {type}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {result.redFlags.summary && (
                      <div>
                        <h4 className="font-medium text-gray-700 mb-2">Summary</h4>
                        <p className="text-sm text-gray-600 bg-red-50 p-3 rounded-md border border-red-200">
                          {result.redFlags.summary}
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            <SupportHelpLines />
          </CardContent>
        </Card>
      )}

      {!user && <RegistrationPrompt />}
    </div>
  );
}