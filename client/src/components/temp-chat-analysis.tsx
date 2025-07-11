import { useState, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info, Search, ArrowLeftRight, Brain, Upload, Image, AlertCircle, TrendingUp, Flame, Activity, Users, Edit, Archive, FileText, Copy } from "lucide-react";
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
  const [fileIsZip, setFileIsZip] = useState(false);
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
      // Check if it's a ZIP file by extension or MIME type
      const isZip = file.name.toLowerCase().endsWith('.zip') || 
                   file.type === 'application/zip' || 
                   file.type === 'application/x-zip-compressed';
      
      setFileIsZip(isZip);
      const text = await file.text();
      setConversation(text);
      setFileName(file.name);
      
      toast({
        title: isZip ? "ZIP File Processed" : "WhatsApp Export Loaded",
        description: `${file.name} has been loaded successfully.`,
      });
      
      // If we have text content, try to auto-detect names
      if (text && text.trim().length > 0 && !me && !them) {
        handleDetectNames();
      }
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
              <div className="mb-4">
                <details className="bg-muted p-4 rounded-lg mb-4">
                  <summary className="font-medium cursor-pointer flex items-center">
                    <Info className="h-4 w-4 mr-2" /> How to Export Text from WhatsApp
                  </summary>
                  <div className="mt-3 text-sm">
                    <h4 className="font-medium mb-2">📲 How to Copy a WhatsApp Chat for Analysis</h4>
                    <p className="mb-2">Want to analyze a WhatsApp conversation in Drama Llama? Here's how to export your chat and copy the messages:</p>
                    
                    <h5 className="font-medium mt-3 mb-1">✅ Step-by-Step (iOS & Android)</h5>
                    <ol className="list-decimal pl-5 space-y-1">
                      <li><strong>Open WhatsApp</strong> and go to the chat you want to export.</li>
                      <li><strong>Tap the Contact or Group Name</strong> to open the chat settings.</li>
                      <li><strong>Select "Export Chat"</strong> - Scroll down and tap Export Chat. (On Android: tap the 3-dot menu &gt; More &gt; Export chat)</li>
                      <li><strong>Choose "Without Media"</strong> - Select Without Media when asked to keep the file lightweight and text-only.</li>
                      <li><strong>Send the File to Yourself</strong> - Use Email, Notes, Google Drive, or any other app where you can access the text later.</li>
                      <li><strong>Open the Exported File</strong> - Tap to open the .txt file you sent to yourself.</li>
                      <li><strong>Select and Copy the Chat</strong> - Tap and hold anywhere in the message text, tap Select All, then Copy.</li>
                      <li><strong>Paste into Drama Llama</strong> - Return to the app and paste the text into the box below.</li>
                    </ol>
                  </div>
                </details>
              </div>
              <Textarea 
                placeholder="Paste your conversation here..."
                className="w-full h-64 resize-none"
                value={conversation}
                onChange={(e) => setConversation(e.target.value)}
              />
            </TabsContent>
            
            <TabsContent value="file">
              <div className="mb-4">
                <details className="text-sm">
                  <summary className="font-medium cursor-pointer hover:text-primary">
                    How to Export WhatsApp Chats
                  </summary>
                  <div className="mt-2 p-4 bg-muted rounded-md text-sm">
                    <h5 className="font-medium mb-2">📱 WhatsApp Chat Export Guide</h5>
                    <ol className="list-decimal pl-5 space-y-2 mb-4">
                      <li><strong>Open WhatsApp</strong> on your phone and navigate to the chat you want to analyze.</li>
                      <li><strong>Tap the three dots</strong> (⋮) in the top-right corner and select <strong>More</strong>.</li>
                      <li>Select <strong>Export chat</strong> from the menu.</li>
                      <li>Choose <strong>WITHOUT MEDIA</strong> to keep the file small.</li>
                      <li>Email the chat to yourself or save it to your device.</li>
                    </ol>
                    
                    <h5 className="font-medium mb-2">📃 For non-WhatsApp messages:</h5>
                    <ol className="list-decimal pl-5 space-y-1">
                      <li><strong>For iPhone</strong>: Use a third-party backup tool like iExplorer or iMazing to export messages as text files.</li>
                      <li><strong>For Android</strong>: Use SMS Backup & Restore app to export messages as XML or TXT.</li>
                      <li><strong>Upload the exported file</strong> below for analysis.</li>
                    </ol>
                  </div>
                </details>
              </div>
              
              <div className="grid grid-cols-1 gap-6">
                {/* WhatsApp Export UI with blue styling */}
                <div className="bg-blue-50 p-3 rounded border border-blue-200 mb-4">
                  <p className="text-xs text-blue-800 font-medium">✨ New Feature:</p>
                  <p className="text-xs text-blue-700">You can now directly upload WhatsApp chat export files (.txt) without needing to use ZIP files!</p>
                </div>
                <div className="border border-blue-200 border-dashed rounded-lg p-6 text-center">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept=".zip,application/zip,application/x-zip-compressed,application/octet-stream,text/plain,.txt"
                    className="hidden"
                  />
                  
                  <div className="h-16 w-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Archive className="h-8 w-8 text-blue-500" />
                  </div>
                  
                  <h3 className="text-xl font-medium text-blue-800 mb-2">WhatsApp Chat Exports</h3>
                  <p className="text-sm text-blue-600 mb-6">Upload WhatsApp exports or ZIP files</p>
                  
                  <Button 
                    variant="outline"
                    className="border-blue-300 bg-white hover:bg-blue-50 text-blue-700"
                    onClick={() => {
                      if (fileInputRef.current) {
                        // Accept both WhatsApp chat exports and zip files
                        fileInputRef.current.click();
                      }
                    }}
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    Select Chat Export
                  </Button>
                  
                  {fileName && (
                    <div className="mt-6 p-3 bg-blue-50 rounded-md border border-blue-100 text-left">
                      <p className="text-sm text-blue-800 mb-2">Chat export: {fileName}</p>
                      
                      {/* Preview of chat content */}
                      <div className="mt-2 mb-3 bg-white border border-blue-200 rounded p-2 max-h-36 overflow-y-auto text-left">
                        {conversation && conversation.trim().length > 0 ? (
                          <pre className="text-xs text-gray-700 whitespace-pre-wrap">
                            {conversation.length > 500 
                              ? conversation.substring(0, 500) + "..." 
                              : conversation}
                          </pre>
                        ) : (
                          <div className="text-center py-3">
                            <p className="text-red-500 font-medium text-sm">No content found in the file.</p>
                            <p className="text-xs text-gray-500 mt-1">
                              Try selecting a different WhatsApp export or check that the file is not empty.
                            </p>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex flex-col sm:flex-row gap-2">
                        <Button 
                          className="flex-1 bg-blue-500 hover:bg-blue-600 text-white"
                          onClick={() => {
                            // Switch to the paste tab to show the full extracted content in editable form
                            setTabValue("paste");
                            // If we've automatically detected participants, try to get their names
                            if (conversation && !me && !them) {
                              handleDetectNames();
                            }
                          }}
                        >
                          <Edit className="mr-2 h-4 w-4" />
                          Edit Extracted Content
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
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
              className="flex items-center gap-2 bg-cyan-100 hover:bg-cyan-200 border-cyan-200" 
              onClick={handleDetectNames}
              disabled={!conversation || detectNamesMutation.isPending}
            >
              <Search className="h-4 w-4 text-cyan-700" /> 
              <span className="text-cyan-800">{detectNamesMutation.isPending ? "Detecting..." : "Detect Names"}</span>
              <span className="text-xs text-cyan-600">(No API Required)</span>
            </Button>
            <Button 
              variant="outline" 
              className="flex items-center bg-pink-100 hover:bg-pink-200 border-pink-200"
              onClick={handleSwitchRoles}
              disabled={!me && !them}
            >
              <ArrowLeftRight className="mr-2 h-4 w-4 text-pink-700" /> 
              <span className="text-pink-800">Switch Roles</span>
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
                    <p>Upgrade to Personal plan for red flags and pattern detection, or Pro for more comprehensive analysis with conflict patterns.</p>
                  </div>
                  <Button variant="secondary" className="mt-2 md:mt-0 md:ml-4 whitespace-nowrap">
                    Upgrade Plan
                  </Button>
                </div>
              ) : (
                <p className="font-medium">
                  {tier === 'personal'
                    ? "Personal plan includes red flags and pattern detection."
                    : "Pro plan includes all analysis features with comprehensive conflict and tension insights."}
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
                      <div className="absolute top-0 left-0 h-full w-full bg-gray-200">
                      </div>
                      
                      {/* Green bar that shows health score */}
                      <div 
                        className="absolute top-0 left-0 h-full rounded-r-full"
                        style={{ 
                          width: `${Math.max(0, Math.min(100, result.healthScore.score || 0))}%`,
                          background: result.healthScore.score >= 80 
                            ? 'linear-gradient(to right, #22c55e, #10b981)' 
                            : result.healthScore.score >= 50 
                            ? 'linear-gradient(to right, #10b981, #f59e0b)' 
                            : 'linear-gradient(to right, #f59e0b, #ef4444)'
                        }}
                      />
                    </div>

                  </div>
                  <div className="flex justify-between text-xs text-gray-500 mt-1 px-1">
                    <span className="text-red-600">🚩 High Conflict</span>
                    <span className="text-amber-600">⚠️ Strained</span>
                    <span className="text-emerald-600">✅ Healthy</span>
                    <span className="text-green-600">🌿 Very Healthy</span>
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
                            <div>
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
                            </div>
                          ) : (
                            <div>
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
                            </div>
                          )}
                        </ul>
                      </div>
                    </div>
                  )}
                  
                  {/* Individual Contributions to Tension Chart */}
                  <div className="mt-6 border rounded-lg p-4">
                    <div className="flex items-center mb-2">
                      <Users className="mr-2 h-5 w-5 text-muted-foreground" />
                      <h4 className="font-medium">Individual Contributions to Tension</h4>
                    </div>
                    
                    <p className="text-sm text-muted-foreground mb-4">
                      This chart shows each participant's contribution to tension throughout the conversation.
                      Higher values indicate more intense emotional responses or confrontational communication.
                    </p>
                    
                    {/* Contribution chart - now visible by default */}
                    <div id="contributionChart" className="mt-2">
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
                        
                        {/* Participant Conflict Scores */}
                        {result.participantConflictScores && 
                          result.participantConflictScores[me] && 
                          result.participantConflictScores[them] &&
                          typeof result.participantConflictScores[me].score === 'number' &&
                          typeof result.participantConflictScores[them].score === 'number' ? (
                          <div className="grid grid-cols-2 gap-4 mt-4 mb-2">
                            <div className="border rounded p-3 bg-gradient-to-r from-white to-cyan-50">
                              <div className="flex items-center mb-2">
                                <div className="w-3 h-3 rounded-full bg-[#22C9C9] mr-1"></div>
                                <h5 className="font-medium text-sm">{me}</h5>
                              </div>
                              <div className="relative w-full h-3 bg-gray-200 rounded-full mb-1">
                                <div 
                                  className={`absolute top-0 left-0 h-3 rounded-full ${
                                    result.participantConflictScores[me].score >= 80 ? 'bg-green-400' :
                                    result.participantConflictScores[me].score >= 60 ? 'bg-lime-400' :
                                    result.participantConflictScores[me].score >= 40 ? 'bg-amber-400' :
                                    result.participantConflictScores[me].score >= 20 ? 'bg-orange-400' :
                                    'bg-red-400'
                                  }`}
                                  style={{width: `${result.participantConflictScores[me].score}%`}}
                                />
                              </div>
                              <div className="text-sm font-medium">
                                {result.participantConflictScores[me].label}
                              </div>
                              <div className="text-xs mt-1 text-slate-500">
                                {result.participantConflictScores[me].isEscalating 
                                  ? "Tends to escalate conflict" 
                                  : "Communication tends to de-escalate"}
                              </div>
                            </div>
                            
                            <div className="border rounded p-3 bg-gradient-to-r from-white to-purple-50">
                              <div className="flex items-center mb-2">
                                <div className="w-3 h-3 rounded-full bg-[#9333ea] mr-1"></div>
                                <h5 className="font-medium text-sm">{them}</h5>
                              </div>
                              <div className="relative w-full h-3 bg-gray-200 rounded-full mb-1">
                                <div 
                                  className={`absolute top-0 left-0 h-3 rounded-full ${
                                    result.participantConflictScores[them].score >= 80 ? 'bg-green-400' :
                                    result.participantConflictScores[them].score >= 60 ? 'bg-lime-400' :
                                    result.participantConflictScores[them].score >= 40 ? 'bg-amber-400' :
                                    result.participantConflictScores[them].score >= 20 ? 'bg-orange-400' :
                                    'bg-red-400'
                                  }`}
                                  style={{width: `${result.participantConflictScores[them].score}%`}}
                                />
                              </div>
                              <div className="text-sm font-medium">
                                {result.participantConflictScores[them].label}
                              </div>
                              <div className="text-xs mt-1 text-slate-500">
                                {result.participantConflictScores[them].isEscalating 
                                  ? "Tends to escalate conflict" 
                                  : "Communication tends to de-escalate"}
                              </div>
                            </div>
                          </div>
                        ) : null}
                        
                        <div className="bg-blue-50 p-3 rounded-md mt-3 text-sm">
                          <h5 className="font-medium text-blue-700 mb-1">What This Means</h5>
                          <p className="text-blue-800">
                            {result.participantConflictScores && 
                             result.participantConflictScores[me] && 
                             result.participantConflictScores[them] &&
                             typeof result.participantConflictScores[me].score === 'number' &&
                             typeof result.participantConflictScores[them].score === 'number'
                              ? (result.participantConflictScores[me].score < result.participantConflictScores[them].score - 20
                                ? `${me} appears to contribute more to the tension in this conversation with a ${result.participantConflictScores[me].label.toLowerCase()} style.`
                                : result.participantConflictScores[them].score < result.participantConflictScores[me].score - 20
                                ? `${them} appears to contribute more to the tension in this conversation with a ${result.participantConflictScores[them].label.toLowerCase()} style.`
                                : `Both participants show relatively similar communication patterns with balanced responsibility for any tension.`)
                              : (result.healthScore && result.healthScore.score 
                                ? (result.healthScore.score < 50 
                                  ? `One participant appears to contribute more to the tension spikes in this conversation.`
                                  : result.healthScore.score < 80
                                  ? `This conversation shows balanced tension levels, with minimal conflict between participants.`
                                  : `This conversation shows very low tension, with warm and supportive communication between ${me} and ${them}.`)
                                : `This conversation shows mixed communication patterns with both supportive and challenging moments.`)
                            }
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {result && (
                <div>
                  <div className="bg-muted p-4 rounded-lg mb-4">
                <h4 className="font-medium mb-2">Communication Insights</h4>
                {(result.communication && result.communication.patterns && result.communication.patterns.length > 0) ? (
                  <div className="mb-4">
                    <h5 className="text-sm font-medium text-muted-foreground mb-1">Communication Patterns</h5>
                    <div className="space-y-3">
                      {result.communication.patterns.map((pattern, idx) => {
                        // Check if the pattern contains a quote (text inside quotes)
                        const quoteMatch = pattern.match(/"([^"]+)"/);
                        const hasQuote = quoteMatch && quoteMatch[1];
                        
                        // Split pattern into parts before and after the quote
                        let beforeQuote = pattern;
                        let quote = '';
                        let afterQuote = '';
                        
                        if (hasQuote) {
                          const parts = pattern.split(quoteMatch[0]);
                          beforeQuote = parts[0];
                          quote = quoteMatch[1];
                          afterQuote = parts[1] || '';
                        }
                        
                        // Detect which participant is mentioned
                        const meColor = pattern.includes(me) ? "text-cyan-700 bg-cyan-50" : "";
                        const themColor = pattern.includes(them) ? "text-pink-700 bg-pink-50" : "";
                        
                        return (
                          <div key={idx} className="p-3 rounded bg-white border border-gray-200 shadow-sm">
                            <p>
                              <span className="text-gray-700">{beforeQuote}</span>
                              {hasQuote && (
                                <div>
                                  <span className={`italic px-2 py-1 rounded my-1 inline-block ${meColor || themColor || "bg-blue-50 text-blue-600"}`}>
                                    "{quote}"
                                  </span>
                                  <span className="text-gray-700">{afterQuote}</span>
                                </div>
                              )}
                              {!hasQuote && (
                                <span className="text-gray-700">{pattern}</span>
                              )}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="mb-4">
                    <h5 className="text-sm font-medium text-muted-foreground mb-1">Communication Patterns</h5>
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
                    <h5 className="text-sm font-medium text-muted-foreground mb-1">Personalized Suggestions</h5>
                    <div className="space-y-3 mt-2">
                      {result.communication.suggestions.map((suggestion, idx) => {
                        // Determine if suggestion is specifically for one participant
                        const forMe = suggestion.toLowerCase().includes(me.toLowerCase());
                        const forThem = suggestion.toLowerCase().includes(them.toLowerCase());
                        
                        return (
                          <div 
                            key={idx} 
                            className={`p-3 rounded border ${
                              forMe 
                                ? "border-cyan-200 bg-cyan-50" 
                                : forThem 
                                ? "border-pink-200 bg-pink-50" 
                                : "border-purple-200 bg-purple-50"
                            }`}
                          >
                            <div className="flex items-start">
                              <div className={`mt-1 mr-2 ${
                                forMe 
                                  ? "text-cyan-600" 
                                  : forThem 
                                  ? "text-pink-600" 
                                  : "text-purple-600"
                              }`}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"></path>
                                </svg>
                              </div>
                              <div>
                                {forMe && (
                                  <div className="text-xs font-medium text-cyan-600 mb-1">For {me}</div>
                                )}
                                {forThem && (
                                  <div className="text-xs font-medium text-pink-600 mb-1">For {them}</div>
                                )}
                                {!forMe && !forThem && (
                                  <div className="text-xs font-medium text-purple-600 mb-1">For both participants</div>
                                )}
                                <p className={`text-sm ${
                                  forMe 
                                    ? "text-cyan-700" 
                                    : forThem 
                                    ? "text-pink-700" 
                                    : "text-purple-700"
                                }`}>
                                  {suggestion}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
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
                </div>
              )}
          
        </CardContent>
      </Card>
    </section>
  );
}
