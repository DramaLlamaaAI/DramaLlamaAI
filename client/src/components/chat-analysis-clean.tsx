import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { 
  Upload, 
  Image, 
  Info, 
  Check, 
  Users, 
  FileText,
  ArrowRight,
  Sparkles,
  Heart,
  Zap,
  Crown,
  Star,
  Loader2
} from "lucide-react";

// Types
interface ChatAnalysisResult {
  overallTone: string;
  summary: string;
  participants: Array<{
    name: string;
    tone: string;
    behaviorPatterns: string[];
    communicationStyle: string;
  }>;
  redFlags: string[];
  recommendations: string[];
  conversationFlow: string;
  emotionalDynamics: string;
  tier: string;
}

interface UsageData {
  used: number;
  limit: number | null;
  tier: string;
}

// Participant Name Form Component
function ParticipantNameForm({ participants, setParticipants }: {
  participants: Array<{ id: number; name: string; placeholder: string }>;
  setParticipants: React.Dispatch<React.SetStateAction<Array<{ id: number; name: string; placeholder: string }>>>;
}) {
  const updateParticipantName = (id: number, name: string) => {
    setParticipants(participants.map(p => 
      p.id === id ? { ...p, name } : p
    ));
  };

  return (
    <div className="space-y-3">
      {participants.map((participant, index) => (
        <div key={participant.id} className="flex gap-2 items-center">
          <div className="flex-shrink-0 w-8 h-8 bg-teal-100 rounded-full flex items-center justify-center">
            <span className="text-sm font-medium text-teal-600">{index + 1}</span>
          </div>
          <input
            type="text"
            value={participant.name}
            onChange={(e) => updateParticipantName(participant.id, e.target.value)}
            placeholder={participant.placeholder}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          />
        </div>
      ))}
    </div>
  );
}

// Main Chat Analysis Component
export default function ChatAnalysis() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [result, setResult] = useState<ChatAnalysisResult | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [fileUploaded, setFileUploaded] = useState(false);
  const [participants, setParticipants] = useState([
    { id: 1, name: "", placeholder: "Your name (optional - we'll auto-detect)" },
    { id: 2, name: "", placeholder: "Other person's name (optional - we'll auto-detect)" }
  ]);

  // Switch participant names
  const switchNames = () => {
    setParticipants([participants[1], participants[0]]);
  };

  // Fetch usage data
  const { data: usage } = useQuery<UsageData>({
    queryKey: ['/api/usage'],
    enabled: !!user,
  });

  const tier = user?.tier || 'free';
  const usedAnalyses = usage?.used || 0;
  const limit = usage?.limit;

  // File upload handler - only detects names, doesn't analyze
  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.match(/\.(txt|text|zip)$/i)) {
      toast({
        title: "Invalid file type",
        description: "Please upload a .txt or .zip file",
        variant: "destructive",
      });
      return;
    }

    try {
      // Store the uploaded file and immediately run analysis (original working approach)
      setUploadedFile(file);
      setFileUploaded(true);
      setIsAnalyzing(true);

      const formData = new FormData();
      formData.append('file', file);

      // Use the original working chat import endpoint
      const response = await fetch('/api/chat/import', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const analysisResult = await response.json();
        console.log('Analysis result received:', analysisResult);
        
        setResult(analysisResult);
        setShowResults(true);
        
        // Extract participant names from the result if available
        if (analysisResult.participantTones) {
          const names = Object.keys(analysisResult.participantTones);
          if (names.length >= 2) {
            setParticipants([
              { id: 1, name: names[0], placeholder: "Your name" },
              { id: 2, name: names[1], placeholder: "Other person's name" }
            ]);
          }
        }
        
        toast({
          title: "Analysis Complete",
          description: "Your chat has been analyzed successfully.",
        });
      } else {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        throw new Error(errorData.message || 'Analysis failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  }, [toast]);

  // Legacy analysis handler - no longer needed since analysis runs on upload
  const handleAnalyzeChat = useCallback(async () => {
    if (!uploadedFile) {
      toast({
        title: "No file uploaded",
        description: "Please upload a chat file first.",
        variant: "destructive",
      });
      return;
    }

    // Get participant names (can be empty for auto-detection)
    const participantNames = participants.map(p => p.name.trim()).filter(name => name.length > 0);
    
    // If no names provided, send empty strings for auto-detection
    if (participantNames.length === 0) {
      participantNames.push("", ""); // Empty strings for auto-detection
    } else if (participantNames.length === 1) {
      participantNames.push(""); // Add empty second name for auto-detection
    }

    setIsAnalyzing(true);

    try {
      const formData = new FormData();
      formData.append('file', uploadedFile);
      
      // Add participant names to the form data
      participantNames.forEach((name, index) => {
        formData.append(`participant_${index}`, name);
      });

      const response = await fetch('/api/chat/import', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Analysis failed:', response.status, errorText);
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: errorText };
        }
        throw new Error(errorData.error || `Analysis failed with status ${response.status}`);
      }

      const analysisResult = await response.json();
      console.log('Analysis result received:', analysisResult);
      console.log('Analysis result keys:', Object.keys(analysisResult));
      console.log('Analysis result type:', typeof analysisResult);
      setResult(analysisResult);
      setShowResults(true);
      
      // Invalidate usage cache
      queryClient.invalidateQueries({ queryKey: ['/api/usage'] });

      toast({
        title: "Analysis Complete",
        description: "Your chat has been analyzed successfully!",
      });
    } catch (error) {
      console.error('Analysis error:', error);
      toast({
        title: "Analysis Failed",
        description: error instanceof Error ? error.message : "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  }, [toast, queryClient, participants, uploadedFile]);

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-gray-50">
        <CardHeader className="text-center space-y-4 pb-8">
          <div className="mx-auto w-16 h-16 bg-gradient-to-r from-pink-500 to-rose-400 rounded-full flex items-center justify-center">
            <Users className="h-8 w-8 text-white" />
          </div>
          <div>
            <CardTitle className="text-3xl font-bold bg-gradient-to-r from-pink-600 to-rose-500 bg-clip-text text-transparent">
              Chat Analysis
            </CardTitle>
            <p className="text-gray-600 mt-2">
              Upload your WhatsApp chat exports for AI-powered emotional analysis
            </p>
          </div>
        </CardHeader>

        <CardContent>
          {!showResults ? (
            <>
              {/* Step Indicators */}
              <div className="flex items-center justify-center mb-8">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                      fileUploaded ? 'bg-teal-500 text-white' : 'bg-teal-500 text-white'
                    }`}>
                      1
                    </div>
                    <span className="ml-2 text-sm font-medium text-gray-700">Upload</span>
                  </div>
                  <ArrowRight className="text-gray-400" />
                  <div className="flex items-center">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                      fileUploaded ? 'bg-teal-500 text-white' : 'bg-gray-200 text-gray-500'
                    }`}>
                      2
                    </div>
                    <span className={`ml-2 text-sm font-medium ${fileUploaded ? 'text-gray-700' : 'text-gray-500'}`}>Analyze</span>
                  </div>
                  <ArrowRight className="text-gray-400" />
                  <div className="flex items-center">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                      showResults ? 'bg-teal-500 text-white' : 'bg-gray-200 text-gray-500'
                    }`}>
                      3
                    </div>
                    <span className={`ml-2 text-sm font-medium ${showResults ? 'text-gray-700' : 'text-gray-500'}`}>Results</span>
                  </div>
                </div>
              </div>

              {/* Tabs */}
              <Tabs defaultValue="upload" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger value="screenshot" className="data-[state=active]:bg-pink-500 data-[state=active]:text-white">
                    <Image className="h-4 w-4 mr-2" />
                    Screenshot Analysis
                  </TabsTrigger>
                  <TabsTrigger value="upload" className="data-[state=active]:bg-teal-500 data-[state=active]:text-white">
                    <Upload className="h-4 w-4 mr-2" />
                    Upload File
                  </TabsTrigger>
                </TabsList>

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

                <TabsContent value="upload" className="mt-4">
                  <div className="space-y-4">
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        accept=".txt,.text,.zip"
                        className="hidden"
                        disabled={isAnalyzing}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        className="mb-2"
                        disabled={isAnalyzing}
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        {isAnalyzing ? "Analyzing..." : "Upload WhatsApp Export"}
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
                      <h3 className="font-medium text-sm">Enter Participant Names (Optional):</h3>
                      
                      <ParticipantNameForm participants={participants} setParticipants={setParticipants} />
                      
                      <div className="flex justify-center mt-4">
                        <Button
                          onClick={switchNames}
                          variant="outline"
                          size="sm"
                          className="text-sm"
                        >
                          ↔ Switch Names
                        </Button>
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
                                <span>Analyses used this month: {usedAnalyses}{limit !== null ? ` of ${limit}` : ' (unlimited)'}</span>
                                <span className="text-xs">
                                  {tier === 'free' && 'Free Tier'}
                                  {tier === 'personal' && 'Personal Tier'}
                                  {tier === 'pro' && 'Pro Tier'}
                                  {tier === 'beta' && 'Beta Tier'}
                                  {tier === 'instant' && 'Instant Deep Dive'}
                                </span>
                              </div>
                              
                              {limit !== null && limit !== undefined && (
                                <Progress value={(usedAnalyses / limit) * 100} className="h-2" />
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Analyze Chat Button - only show when file is uploaded */}
                    {fileUploaded && (
                      <div className="mt-6 text-center">
                        <Button
                          onClick={handleAnalyzeChat}
                          disabled={isAnalyzing || (limit !== null && limit !== undefined && usedAnalyses >= limit)}
                          className="bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white px-8 py-3 text-lg font-semibold"
                        >
                          {isAnalyzing ? (
                            <>
                              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                              Analyzing Chat...
                            </>
                          ) : (
                            <>
                              <Sparkles className="h-5 w-5 mr-2" />
                              Analyze Chat
                            </>
                          )}
                        </Button>
                        
                        {limit !== null && limit !== undefined && usedAnalyses >= limit && (
                          <p className="text-sm text-red-500 mt-2">
                            Analysis limit reached for this month
                          </p>
                        )}
                      </div>
                    )}
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
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 bg-pink-500 rounded-lg">
                        <Sparkles className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold text-gray-900">Analysis Complete</h2>
                        <p className="text-pink-600 font-medium">
                          {tier === 'free' && 'Basic Analysis'}
                          {tier === 'personal' && 'Personal Analysis'}
                          {tier === 'pro' && 'Professional Analysis'}
                          {tier === 'instant' && 'Instant Deep Dive'}
                        </p>
                      </div>
                    </div>
                    
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div>
                          <h3 className="font-semibold text-gray-900 mb-2">Overall Tone</h3>
                          <Badge className="bg-pink-100 text-pink-700 hover:bg-pink-200">
                            {result.overallTone}
                          </Badge>
                        </div>
                        
                        <div>
                          <h3 className="font-semibold text-gray-900 mb-2">Summary</h3>
                          <p className="text-gray-700 text-sm leading-relaxed">
                            {result.summary}
                          </p>
                        </div>
                      </div>
                      
                      <div className="space-y-4">
                        <div>
                          <h3 className="font-semibold text-gray-900 mb-2">Participants</h3>
                          <div className="space-y-2">
                            {result.participants?.map((participant, index) => (
                              <div key={index} className="bg-white rounded-lg p-3 border">
                                <div className="flex items-center gap-2 mb-1">
                                  <Users className="h-4 w-4 text-teal-500" />
                                  <span className="font-medium text-gray-900">{participant.name}</span>
                                </div>
                                <p className="text-sm text-gray-600">Tone: {participant.tone}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Detailed Results for higher tiers */}
                  {(tier === 'personal' || tier === 'pro' || tier === 'instant') && (
                    <div className="space-y-6">
                      {result.redFlags && result.redFlags.length > 0 && (
                        <Card className="border-red-200 bg-red-50">
                          <CardHeader>
                            <CardTitle className="text-red-800 flex items-center gap-2">
                              <Heart className="h-5 w-5" />
                              Red Flags Detected
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <ul className="space-y-2">
                              {result.redFlags?.map((flag, index) => (
                                <li key={index} className="text-red-700 text-sm flex items-start gap-2">
                                  <span className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0"></span>
                                  {flag}
                                </li>
                              ))}
                            </ul>
                          </CardContent>
                        </Card>
                      )}

                      {result.recommendations && result.recommendations.length > 0 && (
                        <Card className="border-green-200 bg-green-50">
                          <CardHeader>
                            <CardTitle className="text-green-800 flex items-center gap-2">
                              <Star className="h-5 w-5" />
                              Recommendations
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <ul className="space-y-2">
                              {result.recommendations?.map((rec, index) => (
                                <li key={index} className="text-green-700 text-sm flex items-start gap-2">
                                  <Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                  {rec}
                                </li>
                              ))}
                            </ul>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  )}

                  {/* Pro and Instant tier exclusive content */}
                  {(tier === 'pro' || tier === 'instant') && (
                    <div className="mt-6 space-y-6">
                      <Card className="border-purple-200 bg-purple-50">
                        <CardHeader>
                          <CardTitle className="text-purple-800 flex items-center gap-2">
                            <Crown className="h-5 w-5" />
                            Professional Insights
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div>
                            <h4 className="font-medium text-purple-900 mb-2">Conversation Flow</h4>
                            <p className="text-purple-700 text-sm">{result.conversationFlow}</p>
                          </div>
                          <div>
                            <h4 className="font-medium text-purple-900 mb-2">Emotional Dynamics</h4>
                            <p className="text-purple-700 text-sm">{result.emotionalDynamics}</p>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {isAnalyzing && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500 mx-auto mb-4"></div>
                  <h3 className="text-lg font-semibold mb-2">Analyzing Your Chat</h3>
                  <p className="text-gray-600 text-sm">
                    Our AI is carefully reviewing your conversation for emotional patterns and insights...
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}