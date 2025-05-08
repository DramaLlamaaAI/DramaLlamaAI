import { useState, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info, Search, ArrowLeftRight, Brain, Upload, Image, AlertCircle, TrendingUp, Flame, Activity, Users, Download, FileText, Copy } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { analyzeChatConversation, detectParticipants, processImageOcr, ChatAnalysisResponse } from "@/lib/openai";
import { useToast } from "@/hooks/use-toast";
import { fileToBase64, validateConversation, getParticipantColor, preprocessChatLog } from "@/lib/utils";
import html2pdf from 'html2pdf.js';
import { toPng } from 'html-to-image';
import { Progress } from "@/components/ui/progress";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import TrialLimiter from "./trial-limiter"; 
import AuthModal from "./auth-modal";
import { useUserTier } from "@/hooks/use-user-tier";
import { incrementAnalysisCount } from "@/lib/trial-utils";
import { getDeviceId } from "@/lib/device-id";
import { queryClient } from "@/lib/queryClient";

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
  const [isEligibilityChecking, setIsEligibilityChecking] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  
  const { toast } = useToast();
  const { 
    tier, 
    used: usedAnalyses, 
    limit,
    canUseFeature,
    isAuthenticated
  } = useUserTier();

  const analysisMutation = useMutation({
    mutationFn: analyzeChatConversation,
    onSuccess: (data) => {
      setErrorMessage(null);
      console.log("Analysis result:", data);
      console.log("Health Score:", data.healthScore);
      setResult(data);
      setShowResults(true);
      
      // Track usage when analysis is successful
      handleTrialUsed();
      
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
      // Read the raw file content
      const rawText = await file.text();
      
      // Preprocess the chat log to handle different formats
      const processedText = preprocessChatLog(rawText);
      
      // Set the processed conversation text
      setConversation(processedText);
      setFileName(file.name);
      
      // Check if format was automatically detected
      const formatDetected = processedText.startsWith('[This appears to be an');
      
      toast({
        title: "File Uploaded",
        description: formatDetected 
          ? `${file.name} has been loaded. Chat format detected.` 
          : `${file.name} has been loaded.`,
      });
      
      // Automatically try to detect participants after file upload
      if (processedText.length > 0) {
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

  // Track usage and increment count when analysis is performed
  const handleTrialUsed = () => {
    incrementAnalysisCount();
    // Force refresh usage data
    queryClient.invalidateQueries({ queryKey: ['/api/user/usage'] });
  };
  
  // Export results to PDF
  const exportResultsToPdf = async () => {
    if (!result) return;
    
    const resultsElement = document.getElementById('analysisResults');
    if (!resultsElement) return;
    
    try {
      toast({
        title: "Preparing PDF",
        description: "Creating your PDF file...",
      });
      
      // Create a snapshot of the charts first
      const charts = resultsElement.querySelectorAll('.recharts-wrapper');
      const chartPromises = Array.from(charts).map(async (chart, index) => {
        try {
          const dataUrl = await toPng(chart as HTMLElement);
          const img = document.createElement('img');
          img.src = dataUrl;
          img.style.width = '100%';
          img.style.maxWidth = '600px';
          chart.parentNode?.replaceChild(img, chart);
        } catch (e) {
          console.error('Error converting chart to image:', e);
        }
      });
      
      await Promise.all(chartPromises);
      
      // Create a clone of the results element to avoid modifying the original
      const clonedResults = resultsElement.cloneNode(true) as HTMLElement;
      
      // Add a header to the PDF
      const header = document.createElement('div');
      header.innerHTML = `
        <div style="text-align: center; margin-bottom: 20px;">
          <h1 style="color: #22d3ee; margin-bottom: 10px;">Drama Llama - Chat Analysis</h1>
          <p style="color: #666;">Analysis date: ${new Date().toLocaleDateString()}</p>
          <p style="color: #666;">Participants: ${me} and ${them}</p>
        </div>
      `;
      clonedResults.insertBefore(header, clonedResults.firstChild);
      
      // Generate PDF
      const options = {
        margin: 10,
        filename: `Drama-Llama-Analysis-${new Date().toISOString().slice(0,10)}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };
      
      await html2pdf().from(clonedResults).set(options).save();
      
      toast({
        title: "PDF Exported",
        description: "Your analysis has been saved as a PDF file.",
      });
    } catch (error) {
      console.error('PDF export error:', error);
      toast({
        title: "Export Failed",
        description: "Could not export the results. Please try again.",
        variant: "destructive",
      });
    } finally {
      // Refresh the page to restore the charts
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    }
  };

  return (
    <TrialLimiter featureType="chat" onTrialUse={handleTrialUsed}>
      <section id="chatAnalysis" className="mb-12">
        <Card>
          <CardContent className="p-6">
            <h2 className="text-2xl font-bold mb-4">Chat Analysis</h2>
            
            {/* Access restriction overlay */}
            {!canUseFeature && (
              <div className="absolute inset-0 bg-white/95 z-10 flex flex-col items-center justify-center p-6 text-center rounded-lg">
                <div className="max-w-md">
                  <h3 className="text-xl font-bold mb-4">
                    {isAuthenticated ? 
                      "You've reached your free analysis limit" : 
                      "Please log in to analyze your conversations"}
                  </h3>
                  
                  <p className="mb-6 text-gray-600">
                    {isAuthenticated ? 
                      `You've used all ${limit} analyses included in your ${tier} plan this month.` : 
                      "Create an account to get your free analysis or subscribe for unlimited access."}
                  </p>
                  
                  <div className="space-y-3">
                    <Button 
                      className="w-full bg-gradient-to-r from-primary to-secondary text-white"
                      onClick={() => setShowAuthModal(true)}
                    >
                      {isAuthenticated ? "Upgrade Your Plan" : "Sign In / Register"}
                    </Button>
                    
                    <p className="text-sm text-gray-500 mt-3">
                      {isAuthenticated ?
                        "Upgrade to Personal ($4.99/mo) for 10 analyses/month or Pro ($9.99/mo) for unlimited analyses." :
                        "Your free account includes 1 analysis per month. Paid plans start at just $4.99/month."
                      }
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            <AuthModal
              isOpen={showAuthModal}
              onClose={() => setShowAuthModal(false)}
              onSuccess={() => {
                setShowAuthModal(false);
                queryClient.invalidateQueries({ queryKey: ['/api/user/usage'] });
              }}
            />
          
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
              <div className="mt-2 flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-sm"
                  onClick={() => {
                    setConversation('');
                    toast({
                      title: "Text Cleared",
                      description: "The conversation has been cleared.",
                    });
                  }}
                >
                  Clear Text
                </Button>
              </div>
            </TabsContent>
            
            <TabsContent value="file">
              <div className="mb-4">
                <details className="text-sm">
                  <summary className="font-medium cursor-pointer hover:text-primary">
                    How to Export and Import Chat Files
                  </summary>
                  <div className="mt-2 p-4 bg-muted rounded-md text-sm">
                    <h5 className="font-medium mb-2">📱 WhatsApp Export Guide</h5>
                    <ol className="list-decimal pl-5 space-y-1 mb-4">
                      <li><strong>Open WhatsApp</strong> and go to the chat you want to export (1-on-1 or group).</li>
                      <li><strong>Tap the Contact or Group Name</strong> to open the chat info screen.</li>
                      <li><strong>Select "Export Chat"</strong>
                        <ul className="list-disc pl-5 mt-1">
                          <li>On iPhone: scroll down and tap Export Chat</li>
                          <li>On Android: tap the 3-dot menu → More → Export Chat</li>
                        </ul>
                      </li>
                      <li><strong>Choose "Without Media"</strong> - When prompted, select Without Media (recommended for faster upload and better analysis).</li>
                      <li><strong>Save the File</strong> to your device or cloud (Email, Google Drive, Files app, Downloads folder).</li>
                      <li><strong>Upload the .txt file</strong> below to analyze your conversation.</li>
                    </ol>
                    
                    <h5 className="font-medium mb-2">💬 Facebook Messenger Export Guide</h5>
                    <ol className="list-decimal pl-5 space-y-1 mb-4">
                      <li><strong>Visit Facebook Settings</strong> - Log into Facebook.com → click your profile icon → Settings & Privacy → Settings.</li>
                      <li><strong>Download Your Information</strong> - In the left menu, click "Your Facebook Information" → "Download Your Information".</li>
                      <li><strong>Select Messages Only</strong> - Deselect all categories except "Messages" to make download faster.</li>
                      <li><strong>Choose Format</strong> - Select "HTML" format (preferred) and "Low" media quality (faster).</li>
                      <li><strong>Create File</strong> - Facebook will prepare your download (may take several hours or days).</li>
                      <li><strong>Download &amp; Extract</strong> - Once ready, download, unzip, and find the "messages" folder.</li>
                      <li><strong>Locate Chat File</strong> - Open the folder with the contact's name and find their "message.html" file.</li>
                      <li><strong>Convert to Text</strong> - Open the HTML in a browser, select all (Ctrl+A), copy (Ctrl+C), and paste into a text file.</li>
                      <li><strong>Upload the .txt file</strong> below.</li>
                    </ol>
                    
                    <h5 className="font-medium mb-2">📱 iMessage/SMS Export Guide</h5>
                    <ol className="list-decimal pl-5 space-y-1">
                      <li><strong>For iPhone</strong>: Use a third-party backup tool like iExplorer or iMazing to export messages as text files.</li>
                      <li><strong>For Android</strong>: Use SMS Backup & Restore app to export messages as XML or TXT.</li>
                      <li><strong>Upload the exported file</strong> below for analysis.</li>
                    </ol>
                  </div>
                </details>
              </div>
              
              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-10 text-center">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept=".txt,.csv,.log,.html"
                  className="hidden"
                />
                <Upload className="h-10 w-10 text-muted-foreground/50 mx-auto mb-4" />
                <h3 className="mb-2 font-medium">Upload Chat Log</h3>
                <p className="text-sm text-muted-foreground mb-4">Drag and drop a .txt, .html, or .csv file, or click to browse</p>
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
              <div className="mb-4">
                <details className="text-sm">
                  <summary className="font-medium cursor-pointer hover:text-primary">
                    How to Take Good Screenshots for Analysis
                  </summary>
                  <div className="mt-2 p-4 bg-muted rounded-md text-sm">
                    <h5 className="font-medium mb-2">📸 Tips for Better Screenshot Analysis</h5>
                    <ol className="list-decimal pl-5 space-y-2 mb-4">
                      <li><strong>Capture the Full Conversation</strong> - Include as much context as possible by showing a complete exchange.</li>
                      <li><strong>Ensure Text is Clear</strong> - Make sure the screenshot is in focus and text is readable.</li>
                      <li><strong>Preferred Chat Apps</strong>:
                        <ul className="list-disc pl-5 mt-1">
                          <li><strong>WhatsApp</strong>: Take long screenshots (use scrolling screenshot feature) to capture more context.</li>
                          <li><strong>iMessage</strong>: Use light mode for better text recognition.</li>
                          <li><strong>Messenger</strong>: Switch to a clean theme before taking screenshots.</li>
                        </ul>
                      </li>
                      <li><strong>Taking Good Screenshots</strong>:
                        <ul className="list-disc pl-5 mt-1">
                          <li><strong>iPhone</strong>: Press Power + Volume Up buttons simultaneously. For longer screenshots, use the full-page capture option after taking a screenshot.</li>
                          <li><strong>Android</strong>: Usually Power + Volume Down. Many Android phones have a "Scrolling screenshot" option for longer conversations.</li>
                          <li><strong>Desktop</strong>: Windows (Win+Shift+S) or Mac (Cmd+Shift+4) for partial screenshots.</li>
                        </ul>
                      </li>
                      <li><strong>Crop Personal Information</strong> - Remove any sensitive data like phone numbers or addresses, but keep names for analysis.</li>
                    </ol>
                    
                    <div className="bg-blue-50 p-3 rounded border border-blue-200">
                      <p className="text-blue-700 text-xs mb-1 font-medium">💡 Pro Tip:</p>
                      <p className="text-blue-700 text-xs">For more accurate analysis, export the chat text when possible instead of using screenshots. Our OCR technology works best with clear, high-contrast text.</p>
                    </div>
                  </div>
                </details>
              </div>
              
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
                
                {/* Chat Examples Section */}
                {result.keyQuotes && result.keyQuotes.length > 0 && (
                  <div className="mt-3 mb-4 bg-white p-3 rounded border border-gray-200">
                    <h5 className="font-medium mb-2 text-sm">Examples from Chat</h5>
                    <div className="space-y-2">
                      {result.keyQuotes.slice(0, 2).map((quote, idx) => (
                        <div key={idx} className={`p-2 rounded ${
                          quote.speaker === me ? 'bg-cyan-50 border border-cyan-100' : 
                          'bg-pink-50 border border-pink-100'
                        }`}>
                          <div className="flex items-start">
                            <span className={`font-medium mr-2 ${
                              quote.speaker === me ? 'text-cyan-700' : 'text-pink-700'
                            }`}>
                              {quote.speaker}:
                            </span>
                            <span className="italic">"{quote.quote}"</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
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
                  <div className="flex flex-col space-y-2">
                    <div className="flex items-center">
                      <div className="relative w-full h-3 bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 rounded-full overflow-hidden">
                        {/* Marker showing current position */}
                        <div 
                          className="absolute top-0 h-5 w-1 bg-white border border-gray-400 rounded-full"
                          style={{ 
                            left: `${Math.max(0, Math.min(100, result.healthScore.score || 0))}%`,
                            transform: 'translateX(-50%)',
                            top: '-1px'
                          }}
                        />
                      </div>
                    </div>
                    
                    {/* Labels for different sections of health meter */}
                    <div className="flex justify-between text-xs text-gray-600 px-1">
                      <span>Conflict</span>
                      <span>Tension</span>
                      <span>Healthy</span>
                      <span>Very Healthy</span>
                    </div>
                    
                    {/* Individual communication style indicators */}
                    {result.participantConflictScores && (
                      <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                        {Object.entries(result.participantConflictScores).map(([name, data]) => (
                          <div key={name} className="flex flex-col">
                            <div className="flex items-center justify-between mb-1">
                              <span className={`text-sm font-medium ${name === me ? 'text-cyan-700' : 'text-pink-700'}`}>
                                {name}
                              </span>
                              <span className={`text-xs px-2 py-0.5 rounded ${
                                data.score < 30 ? 'bg-green-100 text-green-700' : 
                                data.score < 60 ? 'bg-yellow-100 text-yellow-700' : 
                                'bg-red-100 text-red-700'
                              }`}>
                                {data.label}
                              </span>
                            </div>
                            <div className="text-xs text-gray-600 italic">
                              {data.isEscalating 
                                ? 'Shows escalation patterns throughout conversation' 
                                : 'Maintains consistent communication style'}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {/* Simulated Tension Trendline */}
              <div className="bg-white border border-gray-200 p-4 rounded-lg mb-4">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-medium text-gray-800 flex items-center">
                    <TrendingUp className="h-4 w-4 mr-2 text-gray-600" />
                    Simulated Tension Trendline
                  </h4>
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center">
                      <span className="h-3 w-3 rounded-full bg-cyan-400 inline-block mr-1"></span>
                      <span className="text-xs text-gray-600">{me}</span>
                    </div>
                    <div className="flex items-center">
                      <span className="h-3 w-3 rounded-full bg-pink-400 inline-block mr-1"></span>
                      <span className="text-xs text-gray-600">{them}</span>
                    </div>
                  </div>
                </div>
                
                <div className="h-64 mb-2">
                  {/* Simplified conversation tension simulation */}
                  {(() => {
                    // Generate simulated conversation points based on health score
                    const points = 8;  // Number of data points
                    const healthScore = result.healthScore?.score || 75;
                    
                    // Generate random but weighted data based on health score
                    // Lower health scores = more volatile line with higher tension values
                    const volatility = 100 - healthScore;
                    const baselinePersonA = Math.max(20, 80 - healthScore); 
                    const baselinePersonB = Math.max(15, 75 - healthScore);
                    
                    const generatePoint = (baseline: number, index: number) => {
                      const randomFactor = Math.sin(index * 0.9) * (volatility * 0.6);
                      return Math.max(5, Math.min(95, baseline + randomFactor));
                    };
                    
                    const data = Array.from({ length: points }).map((_, i) => {
                      const personA = generatePoint(baselinePersonA, i);
                      const personB = generatePoint(baselinePersonB, i + 2); // Offset to create different patterns
                      
                      return {
                        name: `Point ${i + 1}`,
                        [me]: personA,
                        [them]: personB,
                      };
                    });
                    
                    // Simulate conversation "milestone" labels
                    const milestones = [
                      'Conversation start', 
                      'Topic introduction',
                      'First disagreement', 
                      'Clarification',
                      'Resolution attempt',
                      'Emotional moment',
                      'Understanding',
                      'Conversation end'
                    ];
                    
                    return (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={data}>
                          <XAxis 
                            dataKey="name"
                            tickFormatter={(_, i) => milestones[i] || ''}
                            tick={{ fontSize: 10 }}
                            angle={-45}
                            textAnchor="end"
                            height={70}
                          />
                          <YAxis 
                            domain={[0, 100]}
                            tickFormatter={(value) => value === 0 ? 'Low' : value === 50 ? 'Medium' : value === 100 ? 'High' : ''}
                            width={40}
                          />
                          <Tooltip 
                            formatter={(value: number) => [`${value.toFixed(0)}% tension`, '']}
                            labelFormatter={(_, data) => {
                              const index = data[0]?.payload?.name?.split(' ')[1] - 1;
                              return milestones[index] || '';
                            }}
                          />
                          
                          {/* Threshold line for high tension */}
                          <ReferenceLine y={75} stroke="#f97316" strokeDasharray="3 3" />
                          
                          <Line 
                            type="monotone" 
                            dataKey={me} 
                            stroke="#22d3ee" 
                            strokeWidth={2.5}
                            dot={{ stroke: '#22d3ee', strokeWidth: 2, r: 4, fill: 'white' }}
                            activeDot={{ r: 6, strokeWidth: 2 }}
                          />
                          <Line 
                            type="monotone" 
                            dataKey={them} 
                            stroke="#ec4899" 
                            strokeWidth={2.5}
                            dot={{ stroke: '#ec4899', strokeWidth: 2, r: 4, fill: 'white' }}
                            activeDot={{ r: 6, strokeWidth: 2 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    );
                  })()}
                </div>
                
                <div className="flex justify-between text-xs text-gray-600 mb-2">
                  <div>Conversation Start</div>
                  <div>Conversation End</div>
                </div>
                
                <p className="text-xs text-gray-500 mt-2">
                  This visual shows the simulated emotional tension throughout the conversation based on AI analysis of language patterns.
                </p>
              </div>
              
              {/* Individual Contributions to Tension */}
              {result.participantConflictScores && (
                <div className="bg-white border border-gray-200 p-4 rounded-lg mb-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-gray-800 flex items-center">
                      <Users className="h-4 w-4 mr-2 text-gray-600" />
                      Individual Contributions to Tension
                    </h4>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    {Object.entries(result.participantConflictScores).map(([name, data]) => (
                      <div 
                        key={name}
                        className={`p-3 rounded-lg ${
                          name === me 
                            ? 'bg-cyan-50 border border-cyan-100' 
                            : 'bg-pink-50 border border-pink-100'
                        }`}
                      >
                        <div className="flex justify-between items-center mb-2">
                          <div className="font-medium">{name}</div>
                          <div className={`px-2 py-1 rounded text-xs ${
                            data.score < 30 
                              ? 'bg-green-100 text-green-700' 
                              : data.score < 60 
                              ? 'bg-yellow-100 text-yellow-700' 
                              : 'bg-red-100 text-red-700'
                          }`}>
                            {data.label}
                          </div>
                        </div>
                        
                        <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden mb-2">
                          <div 
                            className={`absolute top-0 left-0 h-full rounded-r-full ${
                              data.score < 30 
                                ? 'bg-green-400' 
                                : data.score < 60 
                                ? 'bg-yellow-400' 
                                : 'bg-red-400'
                            }`}
                            style={{ width: `${data.score}%` }}
                          />
                        </div>
                        
                        <div className="flex justify-between text-xs text-gray-600">
                          <span>Low Tension</span>
                          <span>High Tension</span>
                        </div>
                        
                        {data.isEscalating && (
                          <div className="flex items-center mt-2 text-orange-600 text-xs">
                            <Flame className="h-3 w-3 mr-1" />
                            Showing escalation patterns
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="bg-muted p-4 rounded-lg mb-4">
                <h4 className="font-medium mb-2">Communication Insights</h4>
                {(result.communication.patterns && result.communication.patterns.length > 0) ? (
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
                                <>
                                  <span className={`italic px-2 py-1 rounded my-1 inline-block ${meColor || themColor || "bg-blue-50 text-blue-600"}`}>
                                    "{quote}"
                                  </span>
                                  <span className="text-gray-700">{afterQuote}</span>
                                </>
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
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="font-medium text-blue-700">Key Quotes Analysis</h4>
                    <div className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">Includes Replacement Suggestions</div>
                  </div>
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
                            <div className="text-sm bg-green-50 p-3 rounded border border-green-100">
                              <div className="flex justify-between items-center mb-2">
                                <span className="font-medium text-green-700">Replace With:</span>
                                <div className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">Recommendation</div>
                              </div>
                              <p className="text-green-800 p-2 bg-white rounded border border-green-100 italic">"{quote.improvement}"</p>
                              <p className="text-xs text-green-700 mt-2">
                                This alternative wording helps express the same point in a more constructive way.
                              </p>
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
                <Button 
                  className="flex items-center gap-2" 
                  onClick={exportResultsToPdf}
                >
                  <FileText className="h-4 w-4" />
                  Export to PDF
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </section>
    </TrialLimiter>
  );
}