import { useState, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info, Archive, FileText, AlertCircle, Calendar } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { analyzeChatConversation, detectParticipants, processImageOcr, ChatAnalysisResponse } from "@/lib/openai";
import { useToast } from "@/hooks/use-toast";
import { fileToBase64, validateConversation, getParticipantColor } from "@/lib/utils";
import { getUserUsage } from "@/lib/openai";
import { format } from "date-fns";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cleanPatternForDisplay, cleanCommunicationPatterns } from "@/lib/analysis-utils";
import { CommunicationStyles } from "@/components/communication-styles";
import { RedFlags } from "@/components/red-flags";
import { AccountabilityMeters } from "@/components/accountability-meters";
import { BehavioralPatterns } from "@/components/behavioral-patterns-filtered";
import { EmotionTracking } from "@/components/emotion-tracking";
import { PersonalizedSuggestions } from "@/components/personalized-suggestions";
import { TensionContributions } from "@/components/tension-contributions";
import { HealthScoreDisplay } from "@/components/health-score-display";
import { AdvancedTrendLines } from "@/components/advanced-trend-lines";
import { EvasionPowerDynamics } from "@/components/evasion-power-dynamics";
import { EmotionalShiftsTimeline } from "@/components/emotional-shifts-timeline";
import { SelfReflection } from "@/components/self-reflection";

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
  const [enableDateFilter, setEnableDateFilter] = useState<boolean>(false);
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  
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
    
    // Create request with date filtering if enabled
    const request = { 
      conversation, 
      me, 
      them, 
      tier,
      // Include date filtering options if enabled
      dateFilter: enableDateFilter ? {
        startDate: startDate ? startDate.toISOString() : undefined,
        endDate: endDate ? endDate.toISOString() : undefined
      } : undefined
    };
    
    analysisMutation.mutate(request);
  };

  const handleDetectNames = () => {
    if (!conversation.trim()) {
      setErrorMessage("Please enter a conversation first");
      return;
    }
    
    detectNamesMutation.mutate(conversation);
  };
  
  // Function to switch the detected names if they're incorrect
  const handleSwitchRoles = () => {
    const tempMe = me;
    setMe(them);
    setThem(tempMe);
    
    toast({
      title: "Names Switched",
      description: `Switched names: You are now ${them}, they are ${tempMe}`,
    });
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
                
                <Button
                  variant="outline"
                  onClick={handleSwitchRoles}
                  disabled={!me || !them}
                >
                  Switch Names
                </Button>
              </div>
              
              {/* Date Filtering Section */}
              <div className="mb-6 border border-blue-100 bg-blue-50 rounded-lg p-4">
                <div className="flex items-center mb-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="date-filter"
                      checked={enableDateFilter}
                      onCheckedChange={setEnableDateFilter}
                    />
                    <Label htmlFor="date-filter" className="text-blue-800 font-medium">
                      Focus on Recent Messages
                    </Label>
                  </div>
                  <div className="ml-auto">
                    <span className="text-xs text-blue-700 bg-blue-100 py-1 px-2 rounded-full">✨ New</span>
                  </div>
                </div>
                
                {enableDateFilter && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="from-date" className="block text-sm mb-2 text-blue-800">
                        From Date (Include messages after this date)
                      </Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            id="from-date"
                            variant="outline"
                            className={`w-full justify-start text-left font-normal ${!startDate ? "text-muted-foreground" : ""}`}
                          >
                            <Calendar className="mr-2 h-4 w-4" />
                            {startDate ? format(startDate, "PPP") : "Select start date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <CalendarComponent
                            mode="single"
                            selected={startDate}
                            onSelect={setStartDate}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      {startDate && (
                        <Button 
                          variant="ghost" 
                          onClick={() => setStartDate(undefined)}
                          className="mt-1 h-auto p-0 text-xs text-blue-600 hover:text-blue-800"
                        >
                          Clear date
                        </Button>
                      )}
                    </div>
                    
                    <div>
                      <Label htmlFor="to-date" className="block text-sm mb-2 text-blue-800">
                        To Date (Optional - limit to messages before this date)
                      </Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            id="to-date"
                            variant="outline"
                            className={`w-full justify-start text-left font-normal ${!endDate ? "text-muted-foreground" : ""}`}
                          >
                            <Calendar className="mr-2 h-4 w-4" />
                            {endDate ? format(endDate, "PPP") : "Select end date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <CalendarComponent
                            mode="single"
                            selected={endDate}
                            onSelect={setEndDate}
                            initialFocus
                            disabled={(date) => startDate ? date < startDate : false}
                          />
                        </PopoverContent>
                      </Popover>
                      {endDate && (
                        <Button 
                          variant="ghost" 
                          onClick={() => setEndDate(undefined)}
                          className="mt-1 h-auto p-0 text-xs text-blue-600 hover:text-blue-800"
                        >
                          Clear date
                        </Button>
                      )}
                    </div>
                  </div>
                )}
                
                {enableDateFilter && (
                  <div className="mt-3 text-sm text-blue-800">
                    <p>The AI will focus on analyzing messages {startDate ? `from ${format(startDate, "PPP")}` : ""} 
                    {endDate ? ` through ${format(endDate, "PPP")}` : startDate ? " to the present" : ""}.
                    This helps focus on recent and relevant conversations, especially in long chat histories.</p>
                  </div>
                )}
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
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold">Analysis Results</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSwitchRoles}
                  disabled={!me || !them}
                >
                  Switch Names
                </Button>
              </div>
              
              {result && (
                <>
                  <div className="bg-muted p-4 rounded-lg mb-4">
                    <h4 className="font-medium mb-2">Overall Tone</h4>
                    <div className="mb-4">
                      <p className="text-lg font-medium mb-1">{result.toneAnalysis.overallTone.split('.')[0]}</p>
                      <p className="text-base text-gray-700">
                        {result.toneAnalysis.overallTone.includes('.') ? 
                          result.toneAnalysis.overallTone.substring(result.toneAnalysis.overallTone.indexOf('.')+1).trim() : 
                          "This analysis provides insights into the communication dynamics between participants."}
                      </p>
                    </div>
                    
                    {result.toneAnalysis.participantTones && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <h5 className="font-medium mb-2 text-sm uppercase tracking-wide text-muted-foreground">Participant Analysis</h5>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="p-3 rounded-md" style={{ backgroundColor: 'rgba(34, 201, 201, 0.1)', border: '1px solid rgba(34, 201, 201, 0.3)' }}>
                            <span style={{ color: '#22C9C9' }} className="font-medium">{me}</span>
                            <p style={{ color: 'rgba(34, 201, 201, 0.9)' }} className="mt-1">{result.toneAnalysis.participantTones[me]}</p>
                          </div>
                          <div className="p-3 rounded-md" style={{ backgroundColor: 'rgba(255, 105, 180, 0.1)', border: '1px solid rgba(255, 105, 180, 0.3)' }}>
                            <span style={{ color: '#FF69B4' }} className="font-medium">{them}</span>
                            <p style={{ color: 'rgba(255, 105, 180, 0.9)' }} className="mt-1">{result.toneAnalysis.participantTones[them]}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Health Score Display - using our new component */}
                  <HealthScoreDisplay 
                    healthScore={result.healthScore}
                    me={me}
                    them={them}
                    tier={tier}
                  />
                  
                  {/* Tension Contributions Section - only show if present */}
                  {result.tensionContributions && Object.keys(result.tensionContributions).length > 0 && (
                    <div className="bg-muted p-4 rounded-lg mb-4">
                      <h4 className="font-medium mb-2">Individual Contributions to Tension</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {Object.keys(result.tensionContributions).map((participant) => (
                          <div 
                            key={participant}
                            className="p-3 rounded-md"
                            style={{ 
                              backgroundColor: participant === me 
                                ? 'rgba(34, 201, 201, 0.1)' 
                                : 'rgba(255, 105, 180, 0.1)',
                              border: participant === me 
                                ? '1px solid rgba(34, 201, 201, 0.3)' 
                                : '1px solid rgba(255, 105, 180, 0.3)'
                            }}
                          >
                            <span 
                              className="font-medium"
                              style={{ 
                                color: participant === me ? '#22C9C9' : '#FF69B4'
                              }}
                            >
                              {participant}
                            </span>
                            <ul className="mt-2 space-y-1">
                              {result.tensionContributions && result.tensionContributions[participant] && 
                                result.tensionContributions[participant].map((item, idx) => (
                                  <li 
                                    key={idx}
                                    className="text-sm flex items-start"
                                    style={{ 
                                      color: participant === me 
                                        ? 'rgba(34, 201, 201, 0.9)' 
                                        : 'rgba(255, 105, 180, 0.9)'
                                    }}
                                  >
                                    <span className="mr-2 mt-1">•</span>
                                    <span>{item}</span>
                                  </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                      
                      {/* What This Means section */}
                      {result.tensionMeaning && (
                        <div className="bg-blue-50 p-3 rounded-md mt-4 text-sm border border-blue-100">
                          <h5 className="font-medium text-blue-700 mb-1">What This Means</h5>
                          <p className="text-blue-800">{result.tensionMeaning}</p>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Communication Insights Section */}
                  <div className="bg-muted p-4 rounded-lg mb-4">
                    <h4 className="font-medium mb-2">Communication Insights</h4>
                    {(result.communication && result.communication.patterns && result.communication.patterns.length > 0) ? (
                      <div className="mb-4">
                        <h5 className="text-sm font-medium text-muted-foreground mb-1">Communication Patterns</h5>
                        <div className="space-y-3">
                          {/* Simple solution to show each pattern once */}
                          {Array.from(new Set(result.communication.patterns)).map((pattern, idx) => (
                            <div key={idx} className="p-3 rounded bg-white border border-gray-200 shadow-sm">
                              <p><span className="text-gray-700">{pattern}</span></p>
                            </div>
                          ))}
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
                                className="p-3 rounded border"
                                style={{
                                  backgroundColor: forMe 
                                    ? 'rgba(34, 201, 201, 0.1)'
                                    : forThem 
                                      ? 'rgba(255, 105, 180, 0.1)'
                                      : 'rgba(147, 51, 234, 0.1)',
                                  borderColor: forMe 
                                    ? 'rgba(34, 201, 201, 0.3)'
                                    : forThem 
                                      ? 'rgba(255, 105, 180, 0.3)'
                                      : 'rgba(147, 51, 234, 0.3)'
                                }}
                              >
                                <div className="flex items-start">
                                  <div className="mt-1 mr-2" style={{
                                    color: forMe 
                                      ? '#22C9C9'
                                      : forThem 
                                        ? '#FF69B4'
                                        : '#9333EA'
                                  }}>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"></path>
                                    </svg>
                                  </div>
                                  <div>
                                    {forMe && (
                                      <div className="text-xs font-medium mb-1" style={{ color: '#22C9C9' }}>For {me}</div>
                                    )}
                                    {forThem && (
                                      <div className="text-xs font-medium mb-1" style={{ color: '#FF69B4' }}>For {them}</div>
                                    )}
                                    {!forMe && !forThem && (
                                      <div className="text-xs font-medium mb-1" style={{ color: '#9333EA' }}>For both participants</div>
                                    )}
                                    <p className="text-sm" style={{
                                      color: forMe 
                                        ? 'rgba(34, 201, 201, 0.9)'
                                        : forThem 
                                          ? 'rgba(255, 105, 180, 0.9)'
                                          : 'rgba(147, 51, 234, 0.9)'
                                    }}>
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
                  
                  {/* Key Quotes Section - Pro Tier Only */}
                  {result.keyQuotes && result.keyQuotes.length > 0 && (tier === 'pro' || tier === 'instant') && (
                    <div className="bg-blue-50 p-4 rounded-lg mb-4 border border-blue-100">
                      <h4 className="font-medium mb-2 text-blue-700">Key Quotes Analysis</h4>
                      <div className="space-y-3">
                        {result.keyQuotes.map((quote, idx) => {
                          // Determine which participant's quote
                          const isMeQuote = quote.speaker === me;
                          const isThemQuote = quote.speaker === them;
                          
                          // Set color based on speaker
                          const speakerColor = isMeQuote 
                            ? '#22C9C9' 
                            : isThemQuote 
                              ? '#FF69B4' 
                              : '#3B82F6';
                          
                          // Set background color based on speaker
                          const bgColor = isMeQuote 
                            ? 'rgba(34, 201, 201, 0.1)' 
                            : isThemQuote 
                              ? 'rgba(255, 105, 180, 0.1)' 
                              : 'rgba(59, 130, 246, 0.1)';
                          
                          // Set border color based on speaker
                          const borderColor = isMeQuote 
                            ? 'rgba(34, 201, 201, 0.3)' 
                            : isThemQuote 
                              ? 'rgba(255, 105, 180, 0.3)' 
                              : 'rgba(59, 130, 246, 0.3)';
                              
                          return (
                            <div 
                              key={idx} 
                              className="bg-white p-3 rounded border" 
                              style={{ borderColor }}
                            >
                              <div className="flex justify-between items-start mb-1">
                                <span 
                                  className="font-semibold" 
                                  style={{ color: speakerColor }}
                                >
                                  {quote.speaker}
                                </span>
                                <span 
                                  className="text-xs px-2 py-1 rounded"
                                  style={{ backgroundColor: bgColor, color: speakerColor }}
                                >
                                  Quote #{idx + 1}
                                </span>
                              </div>
                              <p 
                                className="italic mb-2"
                                style={{ color: 'rgba(75, 85, 99, 0.9)' }}
                              >
                                "{quote.quote}"
                              </p>
                              <div className="space-y-2">
                                <p 
                                  className="text-sm p-2 rounded"
                                  style={{ backgroundColor: bgColor, color: 'rgba(75, 85, 99, 0.9)' }}
                                >
                                  <span 
                                    className="font-medium"
                                    style={{ color: speakerColor }}
                                  >
                                    Analysis:
                                  </span> {quote.analysis}
                                </p>
                                {quote.improvement && (
                                  <div 
                                    className="text-sm p-2 rounded border"
                                    style={{ 
                                      backgroundColor: 'rgba(34, 197, 94, 0.1)', 
                                      borderColor: 'rgba(34, 197, 94, 0.3)',
                                      color: 'rgba(75, 85, 99, 0.9)'
                                    }}
                                  >
                                    <span 
                                      className="font-medium"
                                      style={{ color: 'rgba(34, 197, 94, 0.9)' }}
                                    >
                                      Possible Reframe:
                                    </span> {quote.improvement}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  
                  {/* Removed duplicate Health Score Display */}
                  
                  {/* Emotion Tracking Per Participant (Personal+ Tier) */}
                  <EmotionTracking
                    me={me}
                    them={them}
                    tier={tier}
                    emotionalState={result.toneAnalysis.emotionalState}
                    participantTones={result.toneAnalysis.participantTones}
                  />
                  
                  {/* Red Flags Detection (Personal+ Tier) */}
                  <RedFlags 
                    redFlags={result.redFlags} 
                    tier={tier}
                    conversation={conversation} 
                  />
                  
                  {/* Communication Styles Breakdown (Personal+ Tier) */}
                  <CommunicationStyles 
                    me={me} 
                    them={them} 
                    participantConflictScores={result.participantConflictScores}
                    overallTone={result.toneAnalysis?.overallTone} 
                  />
                  
                  {/* Tension Contributions (Personal+ Tier) */}
                  <TensionContributions
                    me={me}
                    them={them}
                    tier={tier}
                    tensionContributions={result.tensionContributions}
                  />
                  
                  {/* Personalized Suggestions (Pro Tier Only) */}
                  {(tier === 'pro' || tier === 'instant') && (
                    <PersonalizedSuggestions
                      me={me}
                      them={them}
                      tier={tier}
                      suggestions={result.communication?.suggestions}
                    />
                  )}
                  
                  {/* Self-Reflection Section removed as requested */}
                  
                  {/* Behavioral Patterns Detection (Pro+ Tier) */}
                  <BehavioralPatterns 
                    tier={tier} 
                    conversation={conversation}
                    dynamics={result.communication?.dynamics}
                    me={me}
                    them={them}
                  />
                  
                  {/* Pro-tier Advanced Features */}
                  <AdvancedTrendLines 
                    tier={tier} 
                    conversation={conversation} 
                  />
                  
                  <EvasionPowerDynamics 
                    tier={tier} 
                    me={me} 
                    them={them} 
                    conversation={conversation}
                  />
                  
                  <EmotionalShiftsTimeline
                    tier={tier}
                    me={me}
                    them={them}
                    conversation={conversation}
                    emotionalState={result.toneAnalysis.emotionalState}
                  />
                  
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