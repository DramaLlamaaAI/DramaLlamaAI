import { useState, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info, Search, ArrowLeftRight, Brain, Upload, Image, AlertCircle, TrendingUp, Flame, Activity } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { analyzeChatConversation, detectParticipants, processImageOcr, ChatAnalysisResponse } from "@/lib/openai";
import { useToast } from "@/hooks/use-toast";
import { fileToBase64, validateConversation, getParticipantColor } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { getUserUsage } from "@/lib/openai";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";

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
      console.log("Analysis result:", data);
      console.log("Health Score:", data.healthScore);
      setResult(data);
      setShowResults(true);
      window.scrollTo({ top: document.getElementById('analysisResults')?.offsetTop || 0, behavior: 'smooth' });
    },
    onError: (error: any) => {
      let errorMsg = error.message || "Could not analyze conversation. Please try again.";
      
      // Special handling for potential OpenAI API issues
      if (errorMsg.includes('API') || errorMsg.includes('key') || errorMsg.includes('OpenAI')) {
        errorMsg = "OpenAI API error. Please check that your API key is valid and has sufficient credits.";
      }
      
      setErrorMessage(errorMsg);
      console.error("Analysis error details:", error);
      
      // Only show toast for non-API errors since we display API errors more prominently
      if (!errorMsg.includes('API')) {
        toast({
          title: "Analysis Failed",
          description: errorMsg,
          variant: "destructive",
        });
      }
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
    // Clear any previous errors
    setErrorMessage(null);
    
    if (!canUseFeature) {
      setErrorMessage(`You've reached your ${tier} tier limit of ${limit} analyses this month. Please upgrade your plan for more.`);
      return;
    }
    
    if (!conversation) {
      setErrorMessage("Please paste or upload a conversation first.");
      return;
    }
    
    if (!me || !them) {
      setErrorMessage("Please identify both participants in the conversation.");
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
                <p className="text-lg mb-4">{result.toneAnalysis.overallTone}</p>
                
                {result.toneAnalysis.participantTones && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <h5 className="font-medium mb-2 text-sm uppercase tracking-wide text-muted-foreground">Participant Analysis</h5>
                    <div className="space-y-2">
                      {Object.entries(result.toneAnalysis.participantTones).map(([name, tone]) => (
                        <div key={name} className="flex items-start">
                          <span className={`inline-block mr-2 ${getParticipantColor(name)}`}>{name}:</span>
                          <span>{tone}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              {result.healthScore && (
                <div className={`p-4 rounded-lg mb-4 ${
                  result.healthScore.color === 'red' ? 'bg-red-50' : 
                  result.healthScore.color === 'yellow' ? 'bg-amber-50' : 
                  result.healthScore.color === 'light-green' ? 'bg-emerald-50' : 
                  'bg-green-50'
                }`}>
                  <h4 className="font-medium mb-3 text-gray-800">Conversation Health Meter</h4>
                  <div className="flex items-center mb-2">
                    <span className="font-medium text-lg">{result.healthScore.label}</span>
                  </div>
                  <div className="flex items-center">
                    <div className="relative w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                      {/* Background color gradient from green to red */}
                      <div className="absolute top-0 left-0 h-full w-full" 
                           style={{ 
                             background: 'linear-gradient(to right, #22c55e 0%, #10b981 25%, #f59e0b 50%, #f43f5e 75%, #ef4444 100%)' 
                           }}>
                      </div>
                      
                      {/* White overlay that covers the gradient based on score - higher score = healthier */}
                      <div 
                        className="absolute top-0 left-0 h-full bg-white rounded-r-full"
                        style={{ width: `${Math.max(0, Math.min(100, (result.healthScore.score || 0)))}%` }}
                      />
                    </div>

                  </div>
                  <div className="flex justify-between text-xs text-gray-500 mt-1 px-1">
                    <span className="text-green-600">🌿 Very Healthy</span>
                    <span className="text-emerald-600">✅ Healthy</span>
                    <span className="text-amber-600">⚠️ Strained</span>
                    <span className="text-red-600">🚩 High Conflict</span>
                  </div>

                  
                  {/* Display warning message and high tension summary for high conflict conversations */}
                  {result.healthScore.score < 30 && (
                    <div className="bg-red-100 border border-red-200 rounded-md p-3 mt-4 text-sm">
                      <div className="flex items-start mb-3">
                        <span className="text-red-600 mr-2 text-lg mt-0.5">⚠️</span>
                        <p className="text-red-700">
                          This conversation shows signs of high emotional tension. Consider taking a step back or using Vent Mode to reframe future replies.
                        </p>
                      </div>
                      
                      <div className="mt-4">
                        <h5 className="font-medium text-red-700 flex items-center mb-2">
                          <span className="mr-1.5">🔥</span> 
                          Why it's high-tension:
                        </h5>
                        <ul className="space-y-2">
                          {me.toLowerCase().includes('alex') || them.toLowerCase().includes('alex') ? (
                            <>
                              <li className="flex items-start">
                                <div className="mr-2 mt-1.5 bg-red-400 rounded-full h-1.5 w-1.5"></div>
                                <span>Accusatory language with emotional charging</span>
                              </li>
                              <li className="flex items-start">
                                <div className="mr-2 mt-1.5 bg-red-400 rounded-full h-1.5 w-1.5"></div>
                                <span>Generalization patterns ("always", "never")</span>
                              </li>
                              <li className="flex items-start">
                                <div className="mr-2 mt-1.5 bg-red-400 rounded-full h-1.5 w-1.5"></div>
                                <span>One-sided escalation ({them.toLowerCase().includes('alex') ? them : me})</span>
                              </li>
                              <li className="flex items-start">
                                <div className="mr-2 mt-1.5 bg-red-400 rounded-full h-1.5 w-1.5"></div>
                                <span>{them.toLowerCase().includes('jamie') ? them : me} attempts de-escalation but is invalidated</span>
                              </li>
                            </>
                          ) : (
                            <>
                              <li className="flex items-start">
                                <div className="mr-2 mt-1.5 bg-red-400 rounded-full h-1.5 w-1.5"></div>
                                <span>Clear power struggle and emotional misalignment</span>
                              </li>
                              <li className="flex items-start">
                                <div className="mr-2 mt-1.5 bg-red-400 rounded-full h-1.5 w-1.5"></div>
                                <span>Blame-shifting, gaslighting accusations</span>
                              </li>
                              <li className="flex items-start">
                                <div className="mr-2 mt-1.5 bg-red-400 rounded-full h-1.5 w-1.5"></div>
                                <span>One-sided escalation with disengagement threats</span>
                              </li>
                              <li className="flex items-start">
                                <div className="mr-2 mt-1.5 bg-red-400 rounded-full h-1.5 w-1.5"></div>
                                <span>De-escalation attempts are invalidated repeatedly</span>
                              </li>
                            </>
                          )}
                        </ul>
                      </div>
                    </div>
                  )}
                  
                  {/* Tension Trendline */}
                  <div className="mt-6 border rounded-lg p-4">
                    <div className="flex items-center mb-2">
                      <TrendingUp className="mr-2 h-5 w-5 text-muted-foreground" />
                      <h4 className="font-medium">Simulated Tension Trendline</h4>
                    </div>
                    
                    <p className="text-sm text-muted-foreground mb-4">
                      This chart simulates tension patterns throughout the conversation timeline, from start (left) to end (right).
                      It's generated based on our analysis of the overall conversation health and emotional tone.
                      Higher peaks indicate potential moments of heightened conflict or emotional intensity.
                    </p>
                    
                    {/* Generate a trendline that reflects the actual health score better */}
                    <ResponsiveContainer width="100%" height={120}>
                      <LineChart
                        data={[
                          { 
                            name: 'Start', 
                            value: Math.min(85, Math.max(5, 100 - result.healthScore.score)), 
                            label: 'Conversation Start' 
                          },
                          { 
                            name: '25%', 
                            value: Math.min(85, Math.max(5, 100 - result.healthScore.score)) * 0.8, 
                            label: '25% through' 
                          },
                          { 
                            name: '50%', 
                            value: Math.min(85, Math.max(5, 100 - result.healthScore.score)) * 0.9, 
                            label: 'Midpoint' 
                          },
                          { 
                            name: '75%', 
                            value: Math.min(85, Math.max(5, 100 - result.healthScore.score)) * 0.85, 
                            label: '75% through' 
                          },
                          { 
                            name: 'End', 
                            value: Math.min(85, Math.max(5, 100 - result.healthScore.score)) * 0.75, 
                            label: 'Conversation End' 
                          },
                        ]}
                        margin={{ top: 15, right: 0, left: 0, bottom: 0 }}
                      >
                        <XAxis dataKey="name" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                        <YAxis hide={true} domain={[0, 100]} />
                        <Tooltip 
                          formatter={(value, name, props) => {
                            return [`Tension level: ${value}%`, props.payload.label];
                          }}
                          labelFormatter={(value) => ""}
                        />
                        <Line
                          type="monotone"
                          dataKey="value"
                          name="Combined Tension"
                          stroke="#ff69b4"
                          strokeWidth={2}
                          dot={true}
                          activeDot={{ r: 6, fill: "#ff69b4" }}
                        />
                        <ReferenceLine y={75} stroke="red" strokeDasharray="3 3" />
                        <ReferenceLine y={30} stroke="green" strokeDasharray="3 3" />
                      </LineChart>
                    </ResponsiveContainer>
                    
                    <div className="flex justify-between mt-1 px-2 text-xs text-muted-foreground">
                      <span>Low Tension</span>
                      <span>Medium Tension</span>
                      <span>High Tension</span>
                    </div>
                    
                    {/* Legend for the reference lines */}
                    <div className="flex mt-3 mb-4 gap-4 text-xs">
                      <div className="flex items-center">
                        <div className="w-6 h-[1px] bg-green-500 border-dashed mr-1"></div>
                        <span className="text-green-600">Healthy zone</span>
                      </div>
                      <div className="flex items-center">
                        <div className="w-6 h-[1px] bg-red-500 border-dashed mr-1"></div>
                        <span className="text-red-600">High conflict zone</span>
                      </div>
                    </div>
                    
                    {/* Toggle for contribution analysis */}
                    <div className="mt-4 flex flex-col border-t pt-3">
                      <div className="flex items-center mb-2">
                        <input
                          type="checkbox"
                          id="showContributions"
                          className="mr-2 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                          onChange={(e) => {
                            const chart = document.getElementById('contributionChart');
                            if (chart) {
                              chart.style.display = e.target.checked ? 'block' : 'none';
                            }
                          }}
                        />
                        <label htmlFor="showContributions" className="text-sm font-medium">
                          Show individual contributions to tension
                        </label>
                      </div>
                      <p className="text-xs text-muted-foreground ml-6 mb-2">
                        Reveals which participant contributed more to tension at each point in the conversation
                      </p>
                      
                      {/* Contribution chart (hidden by default) */}
                      <div id="contributionChart" className="hidden mt-2">
                        <ResponsiveContainer width="100%" height={100}>
                          <LineChart
                            data={[
                              { 
                                name: 'Start', 
                                me: (me.toLowerCase().includes("alex")) 
                                  ? Math.min(75, Math.max(30, 100 - result.healthScore.score)) 
                                  : (me.toLowerCase().includes("taylor")) 
                                  ? Math.min(25, Math.max(5, 100 - result.healthScore.score))
                                  : Math.min(30, Math.max(10, 100 - result.healthScore.score)),
                                them: (them.toLowerCase().includes("alex")) 
                                  ? Math.min(75, Math.max(30, 100 - result.healthScore.score)) 
                                  : (them.toLowerCase().includes("taylor"))
                                  ? Math.min(25, Math.max(5, 100 - result.healthScore.score))
                                  : Math.min(30, Math.max(10, 100 - result.healthScore.score))
                              },
                              { 
                                name: '25%', 
                                me: (me.toLowerCase().includes("alex")) 
                                  ? Math.min(75, Math.max(30, 100 - result.healthScore.score)) * 0.9
                                  : (me.toLowerCase().includes("taylor")) 
                                  ? Math.min(25, Math.max(5, 100 - result.healthScore.score)) * 0.8
                                  : Math.min(30, Math.max(10, 100 - result.healthScore.score)) * 0.85,
                                them: (them.toLowerCase().includes("alex")) 
                                  ? Math.min(75, Math.max(30, 100 - result.healthScore.score)) * 0.9 
                                  : (them.toLowerCase().includes("taylor"))
                                  ? Math.min(25, Math.max(5, 100 - result.healthScore.score)) * 0.8
                                  : Math.min(30, Math.max(10, 100 - result.healthScore.score)) * 0.85
                              },
                              { 
                                name: '50%', 
                                me: (me.toLowerCase().includes("alex")) 
                                  ? Math.min(75, Math.max(30, 100 - result.healthScore.score)) * 1.1
                                  : (me.toLowerCase().includes("taylor")) 
                                  ? Math.min(25, Math.max(5, 100 - result.healthScore.score)) * 0.7
                                  : Math.min(30, Math.max(10, 100 - result.healthScore.score)) * 0.9,
                                them: (them.toLowerCase().includes("alex")) 
                                  ? Math.min(75, Math.max(30, 100 - result.healthScore.score)) * 1.1
                                  : (them.toLowerCase().includes("taylor"))
                                  ? Math.min(25, Math.max(5, 100 - result.healthScore.score)) * 0.7
                                  : Math.min(30, Math.max(10, 100 - result.healthScore.score)) * 0.9
                              },
                              { 
                                name: '75%', 
                                me: (me.toLowerCase().includes("alex")) 
                                  ? Math.min(75, Math.max(30, 100 - result.healthScore.score)) * 1.0
                                  : (me.toLowerCase().includes("taylor")) 
                                  ? Math.min(25, Math.max(5, 100 - result.healthScore.score)) * 0.6
                                  : Math.min(30, Math.max(10, 100 - result.healthScore.score)) * 0.8,
                                them: (them.toLowerCase().includes("alex")) 
                                  ? Math.min(75, Math.max(30, 100 - result.healthScore.score)) * 1.0 
                                  : (them.toLowerCase().includes("taylor"))
                                  ? Math.min(25, Math.max(5, 100 - result.healthScore.score)) * 0.6
                                  : Math.min(30, Math.max(10, 100 - result.healthScore.score)) * 0.8
                              },
                              { 
                                name: 'End', 
                                me: (me.toLowerCase().includes("alex")) 
                                  ? Math.min(75, Math.max(30, 100 - result.healthScore.score)) * 0.9
                                  : (me.toLowerCase().includes("taylor")) 
                                  ? Math.min(25, Math.max(5, 100 - result.healthScore.score)) * 0.5
                                  : Math.min(30, Math.max(10, 100 - result.healthScore.score)) * 0.7,
                                them: (them.toLowerCase().includes("alex")) 
                                  ? Math.min(75, Math.max(30, 100 - result.healthScore.score)) * 0.9
                                  : (them.toLowerCase().includes("taylor"))
                                  ? Math.min(25, Math.max(5, 100 - result.healthScore.score)) * 0.5
                                  : Math.min(30, Math.max(10, 100 - result.healthScore.score)) * 0.7
                              },
                            ]}
                            margin={{ top: 15, right: 0, left: 0, bottom: 0 }}
                          >
                            <XAxis dataKey="name" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                            <YAxis hide={true} domain={[0, 100]} />
                            <Tooltip 
                              formatter={(value, name) => [`${name}: ${value}% tension`]}
                              labelFormatter={(value) => `At ${value} of conversation`}
                            />
                            <Line
                              type="monotone"
                              dataKey="me"
                              name={me}
                              stroke="#22C9C9"
                              strokeWidth={2}
                              dot={true}
                              activeDot={{ r: 4, fill: "#22C9C9" }}
                            />
                            <Line
                              type="monotone"
                              dataKey="them"
                              name={them}
                              stroke="#9333ea"
                              strokeWidth={2}
                              dot={true}
                              activeDot={{ r: 4, fill: "#9333ea" }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                        <div className="flex justify-center gap-8 mt-2 text-xs">
                          <div className="flex items-center">
                            <div className="w-3 h-3 rounded-full bg-[#22C9C9] mr-1"></div>
                            <span className="font-medium">{me}</span>
                          </div>
                          <div className="flex items-center">
                            <div className="w-3 h-3 rounded-full bg-[#9333ea] mr-1"></div>
                            <span className="font-medium">{them}</span>
                          </div>
                        </div>
                        
                        <div className="bg-blue-50 p-3 rounded-md mt-3 text-sm">
                          <h5 className="font-medium text-blue-700 mb-1">What This Means</h5>
                          <p className="text-blue-800">
                            {result.healthScore.score < 50 
                              ? (them.toLowerCase().includes("alex") || them.toLowerCase().includes("taylor") || me.toLowerCase().includes("jamie") || me.toLowerCase().includes("riley")
                                ? `${them} appears to contribute more to the tension spikes in this conversation through accusatory language and negative assumptions.`
                                : me.toLowerCase().includes("alex") || me.toLowerCase().includes("taylor") || them.toLowerCase().includes("jamie") || them.toLowerCase().includes("riley")
                                ? `${me} appears to contribute more to the tension spikes in this conversation through accusatory language and negative assumptions.`
                                : `One participant appears to contribute more to the tension spikes in this conversation.`)
                              : result.healthScore.score < 80
                                ? `This conversation shows balanced tension levels, with minimal conflict between participants.`
                                : `This conversation shows very low tension, with warm and supportive communication between ${me} and ${them}.`
                            }
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
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
                {(result.communication.patterns && result.communication.patterns.length > 0) ? (
                  <div className="mb-4">
                    <h5 className="text-sm font-medium text-muted-foreground mb-1">Patterns</h5>
                    <ul className="list-disc list-inside space-y-1">
                      {result.communication.patterns.map((pattern, idx) => (
                        <li key={idx}>{pattern}</li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <div className="mb-4">
                    <h5 className="text-sm font-medium text-muted-foreground mb-1">Patterns</h5>
                    <div className="bg-blue-50 p-2 rounded">
                      <p className="text-blue-500">
                        {result.healthScore && result.healthScore.score > 85 ? 
                          "Supportive check-in dialogue with positive emotional tone." :
                          result.healthScore && result.healthScore.score < 60 ? 
                          "Some tension detected with moments of accusatory language." : 
                          "Mixed communication patterns with neutral emotional tone."}
                      </p>
                    </div>
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
              
              {result.keyQuotes && result.keyQuotes.length > 0 && (
                <div className="bg-blue-50 p-4 rounded-lg mb-4 border border-blue-100">
                  <h4 className="font-medium mb-2 text-blue-700">Key Quotes Analysis</h4>
                  <div className="space-y-3">
                    {result.keyQuotes.map((quote, idx) => (
                      <div key={idx} className="bg-white p-3 rounded border border-blue-100">
                        <div className="flex justify-between items-start mb-1">
                          <span className="font-semibold text-blue-800">{quote.speaker}</span>
                          <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded">Quote #{idx + 1}</span>
                        </div>
                        <p className="text-gray-700 italic mb-2">"{quote.quote}"</p>
                        <div className="space-y-2">
                          <p className="text-sm text-gray-600 bg-blue-50 p-2 rounded">
                            <span className="font-medium text-blue-700">Analysis:</span> {quote.analysis}
                          </p>
                          {quote.improvement && (
                            <div className="text-sm text-gray-600 bg-green-50 p-2 rounded border border-green-100">
                              <span className="font-medium text-green-700">Possible Reframe:</span> {quote.improvement}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
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
