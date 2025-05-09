import { useState, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info, Archive, FileText, AlertCircle } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { analyzeChatConversation, detectParticipants, processImageOcr, ChatAnalysisResponse } from "@/lib/openai";
import { useToast } from "@/hooks/use-toast";
import { fileToBase64, validateConversation, getParticipantColor } from "@/lib/utils";
import { getUserUsage } from "@/lib/openai";

export default function ChatAnalysis() {
  const [tabValue, setTabValue] = useState("paste");
  const [conversation, setConversation] = useState("");
  const [me, setMe] = useState("");
  const [them, setThem] = useState("");
  const [fileName, setFileName] = useState("");
  const [fileIsZip, setFileIsZip] = useState(false);
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
  const limit = usage?.limit || 1;
  const canUseFeature = usedAnalyses < limit;

  const analysisMutation = useMutation({
    mutationFn: analyzeChatConversation,
    onSuccess: (data) => {
      setErrorMessage(null);
      setResult(data);
      setShowResults(true);
    },
    onError: (error: any) => {
      setErrorMessage(error.message || "Could not analyze conversation");
      toast({
        title: "Analysis Failed",
        description: error.message || "Could not analyze conversation",
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
        description: "Could not detect names automatically",
        variant: "destructive",
      });
    },
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    try {
      setFileName(file.name);
      
      // First check if it's a text file
      if (file.type === "text/plain" || file.name.endsWith('.txt')) {
        setFileIsZip(false);
        const text = await file.text();
        setConversation(text);
        toast({
          title: "Text File Imported",
          description: `Successfully imported ${file.name}`,
        });
        return;
      }
      
      // Otherwise treat as ZIP
      setFileIsZip(true);
      const base64 = await fileToBase64(file);
      const response = await fetch('/api/extract-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ file: base64 }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to extract chat from ZIP');
      }
      
      const data = await response.json();
      setConversation(data.text);
      
      toast({
        title: "ZIP File Imported",
        description: `Successfully extracted WhatsApp chat from ${file.name}`,
      });
    } catch (err: any) {
      console.error("File upload error:", err);
      toast({
        title: "Import Failed",
        description: err.message || "Could not process file",
        variant: "destructive",
      });
    }
  };

  const handleAnalyze = () => {
    if (!conversation.trim()) {
      setErrorMessage("Please enter a conversation to analyze");
      return;
    }
    
    if (!me.trim() || !them.trim()) {
      if (conversation.trim()) {
        detectNamesMutation.mutate(conversation);
      } else {
        setErrorMessage("Please enter names of both participants");
      }
      return;
    }
    
    analysisMutation.mutate({ conversation, me, them, tier });
  };

  const handleDetectNames = () => {
    if (!conversation.trim()) {
      setErrorMessage("Please enter a conversation first");
      return;
    }
    
    detectNamesMutation.mutate(conversation);
  };

  return (
    <section className="container py-10">
      <Card>
        <CardContent className="p-6">
          <div className="mb-6">
            <h2 className="text-2xl font-bold mb-2">Chat Analysis</h2>
            <p className="text-muted-foreground">
              Upload or paste a conversation to analyze the emotional dynamics and communication patterns.
            </p>
            
            {/* Usage Meter */}
            <div className="mt-4 bg-muted p-4 rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">Analysis Usage</span>
                <span className="text-sm">{usedAnalyses} of {limit} used</span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full mb-1 overflow-hidden">
                <div 
                  style={{width: `${Math.min(100, (usedAnalyses / limit) * 100)}%`}}
                  className={`h-full ${usedAnalyses >= limit ? 'bg-red-500' : 'bg-primary'}`}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {canUseFeature 
                  ? `You have ${limit - usedAnalyses} analysis${limit - usedAnalyses === 1 ? '' : 'es'} remaining${tier === 'free' ? ' on your free plan' : ''}.` 
                  : "You've reached your limit. Upgrade for more analyses."}
              </p>
            </div>
          </div>
          
          {!showResults ? (
            <>
              {/* Error Message Display */}
              {errorMessage && (
                <Alert variant="destructive" className="mb-6">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {errorMessage}
                  </AlertDescription>
                </Alert>
              )}
              
              <Tabs value={tabValue} onValueChange={setTabValue} className="mb-6">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="paste">Paste Text</TabsTrigger>
                  <TabsTrigger value="upload">Upload File</TabsTrigger>
                </TabsList>
                <TabsContent value="paste" className="mt-4">
                  <Textarea 
                    placeholder="Paste your WhatsApp or other chat here..."
                    value={conversation}
                    onChange={(e) => setConversation(e.target.value)}
                    className="min-h-[200px]"
                  />
                </TabsContent>
                <TabsContent value="upload" className="mt-4">
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
                      <p className="text-sm text-blue-600 mb-6 max-w-md mx-auto">
                        Upload a WhatsApp chat export (.txt file or .zip archive). On WhatsApp, tap ⋮ on a chat, "More" → "Export chat" → "Without media"
                      </p>
                      
                      <Button 
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="bg-blue-500 hover:bg-blue-600"
                      >
                        Choose File
                      </Button>
                      
                      {fileName && (
                        <div className="mt-4 bg-blue-50 p-3 rounded">
                          <div className="flex items-center">
                            <FileText className="h-4 w-4 text-blue-500 mr-2" />
                            <span className="text-sm text-blue-800">{fileName}</span>
                          </div>
                          <p className="text-xs text-blue-600 mt-1">
                            {fileIsZip 
                              ? "ZIP file detected: we will extract the chat automatically."
                              : "Text file detected: directly using the file content."}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium mb-1">Your Name</label>
                  <div className="flex space-x-2">
                    <input
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      placeholder="Your name in the chat"
                      value={me}
                      onChange={(e) => setMe(e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Other Person's Name</label>
                  <div className="flex space-x-2">
                    <input
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      placeholder="Other person's name"
                      value={them}
                      onChange={(e) => setThem(e.target.value)}
                    />
                  </div>
                </div>
              </div>
              
              <div className="flex space-x-2 mb-4">
                <Button
                  variant="outline"
                  onClick={handleDetectNames}
                  disabled={!conversation.trim() || detectNamesMutation.isPending}
                >
                  {detectNamesMutation.isPending ? "Detecting..." : "Auto-Detect Names"}
                </Button>
              </div>
              
              <div className="flex justify-end">
                <Button
                  onClick={handleAnalyze}
                  disabled={!canUseFeature || !conversation.trim() || analysisMutation.isPending}
                >
                  {analysisMutation.isPending ? "Analyzing..." : "Analyze Chat"}
                </Button>
              </div>
              
              {!canUseFeature && (
                <Alert className="mt-4">
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    {tier === 'free' 
                      ? "You have reached your free tier limit of 1 chat analysis per month. Upgrade for more analyses."
                      : tier === 'personal'
                      ? "You have reached your personal plan limit of 10 chat analyses per month. Upgrade for unlimited analyses."
                      : "You have reached your plan limit. Please contact support if you need more analyses."}
                  </AlertDescription>
                </Alert>
              )}
            </>
          ) : (
            <div id="analysisResults" className="mt-8 slide-in">
              <h3 className="text-xl font-bold mb-4">Analysis Results</h3>
              
              {result && (
                <>
                  <div className="bg-muted p-4 rounded-lg mb-4">
                    <h4 className="font-medium mb-2">Overall Tone</h4>
                    <p className="text-lg mb-4">{result.toneAnalysis.overallTone}</p>
                    
                    {result.toneAnalysis.participantTones && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <h5 className="font-medium mb-2 text-sm uppercase tracking-wide text-muted-foreground">Participant Analysis</h5>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="p-3 rounded-md bg-cyan-50 border border-cyan-100">
                            <span className="text-cyan-700 font-medium">{me}</span>
                            <p className="text-cyan-800 mt-1">{result.toneAnalysis.participantTones[me]}</p>
                          </div>
                          <div className="p-3 rounded-md bg-pink-50 border border-pink-100">
                            <span className="text-pink-700 font-medium">{them}</span>
                            <p className="text-pink-800 mt-1">{result.toneAnalysis.participantTones[them]}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Enhanced Health Meter Section */}
                  {result.healthScore && (
                    <div className="bg-muted p-4 rounded-lg mb-4">
                      <h4 className="font-medium mb-2">Conversation Health</h4>
                      <div className="w-full">
                        <div className="relative pt-1">
                          <div className="flex mb-2 items-center justify-between">
                            <div>
                              <span className={`text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full ${
                                result.healthScore.score < 30 ? 'bg-red-200 text-red-700' :
                                result.healthScore.score < 50 ? 'bg-orange-200 text-orange-700' :
                                result.healthScore.score < 70 ? 'bg-yellow-200 text-yellow-700' :
                                result.healthScore.score < 90 ? 'bg-lime-200 text-lime-700' :
                                'bg-green-200 text-green-700'
                              }`}>
                                {result.healthScore.label}
                              </span>
                            </div>
                            <div className="text-right">
                              <span className="text-xs font-semibold inline-block text-blue-600">
                                {result.healthScore.score}/100
                              </span>
                            </div>
                          </div>
                          
                          {/* Custom health meter with segments */}
                          <div className="relative h-4 mb-4 overflow-hidden rounded-full bg-gray-200 flex">
                            <div className="absolute inset-0 flex w-full">
                              <div className="w-1/5 bg-red-500"></div>
                              <div className="w-1/5 bg-orange-500"></div>
                              <div className="w-1/5 bg-yellow-500"></div>
                              <div className="w-1/5 bg-lime-500"></div>
                              <div className="w-1/5 bg-green-500"></div>
                            </div>
                            
                            {/* Indicator */}
                            <div 
                              className="absolute h-6 w-3 bg-white border-2 border-gray-600 rounded-full transform -translate-y-1" 
                              style={{ left: `calc(${result.healthScore.score}% - 6px)` }}
                            ></div>
                          </div>
                          
                          {/* Labels */}
                          <div className="flex justify-between text-xs text-gray-600 px-1">
                            <div>Conflict</div>
                            <div>Tense</div>
                            <div>Neutral</div>
                            <div>Healthy</div>
                            <div>Very Healthy</div>
                          </div>
                          
                          {/* Health description */}
                          <div className="mt-3 bg-blue-50 p-3 rounded-md border border-blue-100">
                            <p className="text-sm text-blue-800">
                              {result.healthScore.score < 30 ? 
                                "This conversation shows significant conflict patterns and tension. Consider taking a step back before continuing." :
                                result.healthScore.score < 50 ?
                                "There's notable tension in this conversation. Try to address underlying issues before they escalate further." :
                                result.healthScore.score < 70 ?
                                "This conversation has a neutral tone with some supportive moments balanced by occasional tension." :
                                result.healthScore.score < 90 ?
                                "This is a healthy conversation with good communication patterns and minimal tension." :
                                "Excellent communication! This conversation shows strong mutual respect and healthy interaction patterns."
                              }
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Communication Insights Section */}
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
                  
                  {/* Key Quotes Section */}
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
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}