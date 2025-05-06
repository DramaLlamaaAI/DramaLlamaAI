import { useState, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info, Search, ArrowLeftRight, Brain, Upload, Image, AlertCircle } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { analyzeChatConversation, detectParticipants, processImageOcr, ChatAnalysisResponse } from "@/lib/openai";
import { useToast } from "@/hooks/use-toast";
import { fileToBase64, validateConversation } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { getUserUsage } from "@/lib/openai";

export default function ChatAnalysis() {
  const [tabValue, setTabValue] = useState("paste");
  const [conversation, setConversation] = useState("");
  const [me, setMe] = useState("");
  const [them, setThem] = useState("");
  const [fileName, setFileName] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [result, setResult] = useState<ChatAnalysisResponse | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
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
      setResult(data);
      setShowResults(true);
      window.scrollTo({ top: document.getElementById('analysisResults')?.offsetTop || 0, behavior: 'smooth' });
    },
    onError: (error: any) => {
      const errorMsg = error.message || "Could not analyze conversation. Please try again.";
      setErrorMessage(errorMsg);
      console.error("Analysis error details:", error);
      
      toast({
        title: "Analysis Failed",
        description: errorMsg,
        variant: "destructive",
      });
    },
  });

  const detectNamesMutation = useMutation({
    mutationFn: detectParticipants,
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
    mutationFn: processImageOcr,
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
      const text = await file.text();
      setConversation(text);
      setFileName(file.name);
      toast({
        title: "File Uploaded",
        description: `${file.name} has been loaded.`,
      });
    } catch (error) {
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
      // Preview image
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
      
      // Process OCR
      const base64Image = await fileToBase64(file);
      ocrMutation.mutate({ image: base64Image });
    } catch (error) {
      toast({
        title: "Upload Failed",
        description: "Could not process the image. Please try another image.",
        variant: "destructive",
      });
    }
  };

  const handleDetectNames = () => {
    if (!conversation) {
      toast({
        title: "No Conversation",
        description: "Please paste or upload a conversation first.",
        variant: "destructive",
      });
      return;
    }
    
    // First try to automatically detect names using patterns in the text
    try {
      // Simple regex pattern to identify common chat format: "Name: Message"
      const namePattern = /^([A-Za-z]+):/gm;
      let match;
      const names: string[] = [];
      
      // Manually collect matches
      while ((match = namePattern.exec(conversation)) !== null) {
        names.push(match[1]);
      }
      
      // Get unique names
      const uniqueNames: string[] = [];
      for (const name of names) {
        if (!uniqueNames.includes(name)) {
          uniqueNames.push(name);
        }
      }
      
      if (uniqueNames.length >= 2) {
        setMe(uniqueNames[0]);
        setThem(uniqueNames[1]);
        
        toast({
          title: "Names Detected",
          description: `Found participants: ${uniqueNames[0]} and ${uniqueNames[1]}`,
        });
        return;
      }
    } catch (error) {
      console.error("Error in local name detection:", error);
    }
    
    // If local detection fails or API key is invalid, try the API
    detectNamesMutation.mutate(conversation);
  };

  const handleSwitchRoles = () => {
    const tempMe = me;
    setMe(them);
    setThem(tempMe);
  };

  const handleAnalyze = () => {
    if (!canUseFeature) {
      toast({
        title: "Usage Limit Reached",
        description: `You've reached your ${tier} tier limit of ${limit} analyses this month. Please upgrade your plan for more.`,
        variant: "destructive",
      });
      return;
    }
    
    if (!conversation) {
      toast({
        title: "No Conversation",
        description: "Please paste or upload a conversation first.",
        variant: "destructive",
      });
      return;
    }
    
    if (!me || !them) {
      toast({
        title: "Names Required",
        description: "Please identify both participants in the conversation.",
        variant: "destructive",
      });
      return;
    }
    
    if (!validateConversation(conversation)) {
      toast({
        title: "Invalid Format",
        description: "Please ensure your conversation includes messages between participants.",
        variant: "destructive",
      });
      return;
    }
    
    analysisMutation.mutate({
      conversation,
      me,
      them
    });
  };

  return (
    <section id="chatAnalysis" className="mb-12">
      <Card>
        <CardContent className="p-6">
          <h2 className="text-2xl font-bold mb-4">Chat Analysis</h2>
          
          <Tabs value={tabValue} onValueChange={setTabValue} className="mb-6">
            <TabsList className="mb-4">
              <TabsTrigger value="paste">Paste Chat</TabsTrigger>
              <TabsTrigger value="file">Import File</TabsTrigger>
              <TabsTrigger value="image">Upload Screenshot</TabsTrigger>
            </TabsList>
            
            <TabsContent value="paste">
              <Textarea 
                placeholder="Paste your conversation here..."
                className="w-full h-64 resize-none"
                value={conversation}
                onChange={(e) => setConversation(e.target.value)}
              />
            </TabsContent>
            
            <TabsContent value="file">
              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-10 text-center">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept=".txt,.csv,.log"
                  className="hidden"
                />
                <Upload className="h-10 w-10 text-muted-foreground/50 mx-auto mb-4" />
                <h3 className="mb-2 font-medium">Upload Chat Log</h3>
                <p className="text-sm text-muted-foreground mb-4">Drag and drop a .txt or .csv file, or click to browse</p>
                <Button 
                  variant="outline" 
                  onClick={() => fileInputRef.current?.click()}
                >
                  Choose File
                </Button>
                {fileName && (
                  <p className="mt-4 text-sm">Selected: {fileName}</p>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="image">
              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-10 text-center">
                <input
                  type="file"
                  ref={imageInputRef}
                  onChange={handleImageUpload}
                  accept="image/*"
                  className="hidden"
                />
                <Image className="h-10 w-10 text-muted-foreground/50 mx-auto mb-4" />
                <h3 className="mb-2 font-medium">Upload Screenshot</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Upload a screenshot of your conversation
                </p>
                <Button 
                  variant="outline" 
                  onClick={() => imageInputRef.current?.click()}
                >
                  Choose Image
                </Button>
                {imagePreview && (
                  <div className="mt-4">
                    <p className="text-sm mb-2">Preview:</p>
                    <img 
                      src={imagePreview} 
                      alt="Preview" 
                      className="max-h-40 mx-auto object-contain rounded" 
                    />
                    {ocrMutation.isPending && (
                      <div className="mt-2">
                        <p className="text-sm text-muted-foreground mb-1">Extracting text...</p>
                        <Progress value={45} className="h-2" />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium mb-2 text-muted-foreground">Me (Your Name)</label>
              <Input 
                type="text" 
                placeholder="Your name in the conversation" 
                value={me}
                onChange={(e) => setMe(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-muted-foreground">Them (Other Person)</label>
              <Input 
                type="text" 
                placeholder="Their name in the conversation"
                value={them}
                onChange={(e) => setThem(e.target.value)} 
              />
            </div>
          </div>
          
          <div className="flex flex-wrap gap-4 mb-6">
            <Button 
              variant="outline" 
              className="flex items-center gap-2" 
              onClick={handleDetectNames}
              disabled={!conversation || detectNamesMutation.isPending}
            >
              <Search className="h-4 w-4" /> 
              {detectNamesMutation.isPending ? "Detecting..." : "Detect Names"} 
              <span className="text-xs text-muted-foreground">(No API Required)</span>
            </Button>
            <Button 
              variant="outline" 
              className="flex items-center"
              onClick={handleSwitchRoles}
              disabled={!me && !them}
            >
              <ArrowLeftRight className="mr-2 h-4 w-4" /> Switch Roles
            </Button>
            <Button 
              className={`ml-auto flex items-center ${analysisMutation.isPending ? '' : 'pulsing'}`}
              onClick={handleAnalyze}
              disabled={analysisMutation.isPending || !me || !them || !conversation || !canUseFeature}
            >
              <Brain className="mr-2 h-4 w-4" /> 
              {analysisMutation.isPending ? "Analyzing..." : "Analyze Conversation"}
            </Button>
          </div>
          
          {errorMessage && (
            <Alert className="mb-4 border-red-400 bg-red-50" variant="destructive">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-700">
                <div className="font-bold">Analysis failed</div>
                <div>{errorMessage}</div>
                <div className="mt-2 text-sm">
                  If you're seeing API errors, please check that your OpenAI API key is configured correctly.
                </div>
              </AlertDescription>
            </Alert>
          )}

          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              {tier === 'free' ? (
                <div className="flex flex-col md:flex-row md:items-center justify-between">
                  <div>
                    <p className="font-medium">Free tier includes basic tone analysis.</p>
                    <p>Upgrade to Personal plan for red flags and pattern detection, or Pro for Drama Score™ and historical analysis.</p>
                  </div>
                  <Button variant="secondary" className="mt-2 md:mt-0 md:ml-4 whitespace-nowrap">
                    Upgrade Plan
                  </Button>
                </div>
              ) : (
                <p className="font-medium">
                  {tier === 'personal'
                    ? "Personal plan includes red flags and pattern detection."
                    : "Pro plan includes all analysis features, including Drama Score™."}
                </p>
              )}
            </AlertDescription>
          </Alert>
          
          {showResults && result && (
            <div id="analysisResults" className="mt-8 slide-in">
              <h3 className="text-xl font-bold mb-4">Analysis Results</h3>
              
              <div className="bg-muted p-4 rounded-lg mb-4">
                <h4 className="font-medium mb-2">Overall Tone</h4>
                <p className="text-lg">{result.toneAnalysis.overallTone}</p>
                
                <h4 className="font-medium mt-4 mb-2">Emotional States</h4>
                <div className="flex flex-wrap gap-2">
                  {result.toneAnalysis.emotionalState.map((emotion, idx) => (
                    <div 
                      key={idx} 
                      className="px-3 py-1 rounded-full text-white text-sm"
                      style={{
                        backgroundColor: `hsl(${220 + idx * 30}, 70%, 60%)`,
                        opacity: 0.5 + (emotion.intensity / 10) * 0.5
                      }}
                    >
                      {emotion.emotion} ({emotion.intensity}/10)
                    </div>
                  ))}
                </div>
              </div>
              
              {result.redFlags && (
                <div className="bg-red-50 p-4 rounded-lg mb-4 border border-red-200">
                  <h4 className="font-medium mb-2 text-red-700">Potential Red Flags</h4>
                  <ul className="space-y-2">
                    {result.redFlags.map((flag, idx) => (
                      <li key={idx} className="flex items-start">
                        <div className="mr-2 mt-1">
                          <div 
                            className="w-3 h-3 rounded-full"
                            style={{
                              backgroundColor: flag.severity >= 7 ? '#ef4444' : flag.severity >= 4 ? '#f97316' : '#fbbf24'
                            }}
                          />
                        </div>
                        <div>
                          <span className="font-medium">{flag.type}: </span>
                          <span>{flag.description}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              <div className="bg-muted p-4 rounded-lg mb-4">
                <h4 className="font-medium mb-2">Communication Insights</h4>
                {result.communication.patterns && (
                  <div className="mb-4">
                    <h5 className="text-sm font-medium text-muted-foreground mb-1">Patterns</h5>
                    <ul className="list-disc list-inside space-y-1">
                      {result.communication.patterns.map((pattern, idx) => (
                        <li key={idx}>{pattern}</li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {result.communication.suggestions && (
                  <div>
                    <h5 className="text-sm font-medium text-muted-foreground mb-1">Suggestions</h5>
                    <ul className="list-disc list-inside space-y-1">
                      {result.communication.suggestions.map((suggestion, idx) => (
                        <li key={idx}>{suggestion}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              
              {result.dramaScore !== undefined && (
                <div className="bg-primary/10 p-4 rounded-lg">
                  <h4 className="font-medium mb-2 text-primary">Drama Score™</h4>
                  <div className="flex items-center">
                    <div className="w-full bg-muted rounded-full h-4 mr-4">
                      <div 
                        className="bg-primary h-4 rounded-full"
                        style={{ width: `${result.dramaScore * 10}%` }}
                      />
                    </div>
                    <span className="font-bold text-lg">{result.dramaScore}/10</span>
                  </div>
                  <p className="text-sm mt-2">
                    {result.dramaScore < 3
                      ? "Low drama - healthy communication patterns detected."
                      : result.dramaScore < 7
                      ? "Moderate drama - some concerning patterns present."
                      : "High drama - significant communication issues detected."}
                  </p>
                </div>
              )}
              
              <div className="mt-6 flex justify-end">
                <Button
                  variant="outline"
                  className="mr-2"
                  onClick={() => setShowResults(false)}
                >
                  Back to Analysis
                </Button>
                <Button>
                  Export Results
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
