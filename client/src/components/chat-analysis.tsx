import { useState, useRef, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info, Archive, FileText, AlertCircle, Calendar, Download } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { analyzeChatConversation, detectParticipants, processImageOcr, ChatAnalysisResponse } from "@/lib/openai";
import { useToast } from "@/hooks/use-toast";
import { fileToBase64, validateConversation, getParticipantColor } from "@/lib/utils";
import { getUserUsage } from "@/lib/openai";
import { format } from "date-fns";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import BackHomeButton from "@/components/back-home-button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useLocation } from "wouter";
import { cleanPatternForDisplay, cleanCommunicationPatterns } from "@/lib/analysis-utils";
import CommunicationPatterns from "@/components/communication-patterns";
import HealthScoreDisplay from "@/components/health-score-display";
import RedFlags from "@/components/red-flags";
import ParticipantEmotions from "@/components/participant-emotions";
import SupportHelpLinesLink from "@/components/support-helplines-link";
import EmotionalState from "@/components/emotional-state";
import KeyQuotes from "@/components/key-quotes";
import ParticipantChips from "@/components/participant-chips";
import TensionContributions from "@/components/tension-contributions";
import TensionMeaning from "@/components/tension-meaning";
import PsychologicalProfile from "@/components/psychological-profile";
import PersonalizedSuggestions from "@/components/personalized-suggestions";
import FreeTierAnalysis from "@/components/free-tier-analysis";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toBlob } from "html-to-image";
import { Separator } from "@/components/ui/separator";

export default function ChatAnalysis() {
  const [tabValue, setTabValue] = useState("paste");
  const [conversation, setConversation] = useState("");
  const [me, setMe] = useState("");
  const [them, setThem] = useState("");
  const [useStartDate, setUseStartDate] = useState(false);
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [result, setResult] = useState<ChatAnalysisResponse | null>(null);
  const [tierLevel, setTierLevel] = useState("free");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDetectingParticipants, setIsDetectingParticipants] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);
  const [location] = useLocation();
  const { toast } = useToast();
  
  // Parse URL search parameters
  const getSearchParams = () => {
    return new URLSearchParams(window.location.search);
  };
  
  useEffect(() => {
    const searchParams = getSearchParams();
    if (searchParams.get('tier')) {
      setTierLevel(searchParams.get('tier') || 'free');
    } else if (localStorage.getItem('userTier')) {
      setTierLevel(localStorage.getItem('userTier') || 'free');
    }
  }, [location]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    if (files[0].type === 'image/jpeg' || files[0].type === 'image/png') {
      setSelectedFile(files[0]);
      return;
    }
    
    try {
      // Handle .txt file
      if (files[0].type === 'text/plain') {
        const text = await files[0].text();
        setConversation(text);
        setTabValue("paste");
        return;
      }
      
      // Handle .zip file containing WhatsApp chat export
      if (files[0].type === 'application/zip' || files[0].type === 'application/x-zip-compressed') {
        setSelectedFile(files[0]);
        return;
      }
    } catch (error) {
      console.error("Error processing file:", error);
      toast({
        title: "Error",
        description: "Could not process file. Please try a different one.",
        variant: "destructive",
      });
    }
  };

  const processOCRMutation = useMutation({
    mutationFn: async (image: string) => {
      const response = await fetch('/api/analyze/ocr', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ image }),
      });
      
      if (!response.ok) {
        throw new Error('OCR processing failed');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      setConversation(data.text);
      setTabValue("paste");
      setSelectedFile(null);
    },
    onError: (error) => {
      toast({
        title: "OCR Processing Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleImageProcess = async () => {
    if (!selectedFile) return;
    
    try {
      const base64 = await fileToBase64(selectedFile);
      const base64Data = base64.split(',')[1]; // Extract the base64 data
      processOCRMutation.mutate(base64Data);
    } catch (error) {
      console.error("Error converting image:", error);
      toast({
        title: "Error",
        description: "Could not process image. Please try a different one.",
        variant: "destructive",
      });
    }
  };

  const participantDetectionMutation = useMutation({
    mutationFn: async (conversationText: string) => {
      const response = await fetch('/api/analyze/detect-names', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ conversation: conversationText }),
      });
      
      if (!response.ok) {
        throw new Error('Participant detection failed');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      setMe(data.me);
      setThem(data.them);
      setIsDetectingParticipants(false);
    },
    onError: () => {
      toast({
        title: "Participant Detection Failed",
        description: "Could not detect participant names. Please enter them manually.",
        variant: "destructive",
      });
      setIsDetectingParticipants(false);
    },
  });

  const handleDetectParticipants = () => {
    if (!conversation) {
      toast({
        title: "No Conversation",
        description: "Please enter or upload a conversation first.",
        variant: "destructive",
      });
      return;
    }
    
    setIsDetectingParticipants(true);
    participantDetectionMutation.mutate(conversation);
  };

  const switchNames = () => {
    const tempMe = me;
    setMe(them);
    setThem(tempMe);
  };

  const analysisMutation = useMutation({
    mutationFn: async () => {
      // Prepare the request
      const requestBody: any = {
        conversation,
        me,
        them,
      };

      // Only include date filters if they're being used
      if (useStartDate) {
        requestBody.startDate = startDate;
        requestBody.endDate = endDate;
      }
      
      // Add tier for server-side filtering
      requestBody.tier = tierLevel;

      // Add developer mode headers if specified
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      
      const searchParams = getSearchParams();
      if (searchParams.get('dev') === 'true') {
        headers['X-Developer-Mode'] = 'true';
      }
      
      // Add tier override if specified
      if (searchParams.get('devTier')) {
        headers['X-Developer-Tier'] = searchParams.get('devTier') || '';
      }
      
      const response = await fetch('/api/analyze/chat', {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Analysis failed');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      setResult(data);
      setIsSubmitting(false);
      
      // Scroll to results
      if (resultsRef.current) {
        window.scrollTo({
          top: resultsRef.current.offsetTop - 20,
          behavior: 'smooth'
        });
      }
    },
    onError: (error) => {
      setIsSubmitting(false);
      toast({
        title: "Analysis Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Export as formal branded document with text copying - supports tier-specific content
  const exportToPdf = async () => {
    if (!result) {
      toast({
        title: "Export Failed",
        description: "Could not create document. Please try again.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      setIsExporting(true);
      
      // Import our enhanced PDF export function from export-document-generator
      const { exportToPdf } = await import('@/components/export-document-generator');
      
      // Get the current tier - from URL, localStorage or default to 'free'
      const searchParams = getSearchParams();
      const currentTier = searchParams.get('tier') || localStorage.getItem('userTier') || 'free';
      
      // Call the PDF export function with the tier parameter
      exportToPdf(result, me, them, toast, currentTier);
    } catch (error) {
      console.error("Export error:", error);
      toast({
        title: "Export Failed",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  // Extremely simplified screenshot feature for mobile compatibility
  const exportAsImage = async () => {
    if (!resultsRef.current || !result) {
      toast({
        title: "Screenshot Failed",
        description: "Could not capture screenshot. Please try again.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      setIsExporting(true);
      
      const blob = await toBlob(resultsRef.current);
      if (!blob) throw new Error("Failed to create image");
      
      // Create download link
      const link = document.createElement("a");
      link.download = `drama-llama-analysis-${format(new Date(), "yyyy-MM-dd")}.png`;
      link.href = URL.createObjectURL(blob);
      link.click();
      
      toast({
        title: "Screenshot Captured",
        description: "Your analysis has been saved as an image.",
      });
    } catch (error) {
      console.error("Screenshot error:", error);
      toast({
        title: "Screenshot Failed",
        description: "Could not capture screenshot. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  // Check for sufficient data before submitting
  const handleSubmit = () => {
    // Validation
    if (!validateConversation(conversation)) {
      toast({
        title: "Invalid Conversation",
        description: "Please enter a longer conversation with more interaction.",
        variant: "destructive",
      });
      return;
    }
    
    if (!me) {
      toast({
        title: "Missing Information",
        description: "Please enter your name.",
        variant: "destructive",
      });
      return;
    }
    
    if (!them) {
      toast({
        title: "Missing Information",
        description: "Please enter the other person's name.",
        variant: "destructive",
      });
      return;
    }
    
    if (me === them) {
      toast({
        title: "Invalid Names",
        description: "Your name and the other person's name must be different.",
        variant: "destructive",
      });
      return;
    }
    
    // Date validation if date filter is enabled
    if (useStartDate) {
      if (!startDate) {
        toast({
          title: "Missing Start Date",
          description: "Please select a start date for the date filter.",
          variant: "destructive",
        });
        return;
      }
    }
    
    setIsSubmitting(true);
    analysisMutation.mutate();
  };

  const { data: usageData } = useQuery({
    queryKey: ['/api/user/usage'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/user/usage');
        if (!response.ok) return { used: 0, limit: 1, tier: 'free' };
        return await response.json();
      } catch (error) {
        console.error("Error fetching usage:", error);
        return { used: 0, limit: 1, tier: 'free' };
      }
    },
    refetchOnWindowFocus: false,
  });

  const getUsageMessage = () => {
    if (!usageData) return "Loading usage information...";
    
    const { used, limit, tier } = usageData;
    const remaining = Math.max(0, limit - used);
    
    return `You have ${remaining} analysis${remaining === 1 ? '' : 'es'} remaining this month (${used}/${limit} used).`;
  };

  return (
    <div className="container mx-auto pb-10 pt-4">
      <BackHomeButton />
      <h1 className="text-3xl font-bold text-center mb-3">Chat Analysis</h1>
      <p className="text-center mb-6 text-muted-foreground">
        Analyze the emotional dynamics of a conversation
      </p>
      
      <div className="flex flex-col md:flex-row gap-4 mb-4">
        <Card className="w-full md:w-2/3">
          <CardContent className="pt-6">
            <Tabs value={tabValue} onValueChange={setTabValue} className="w-full">
              <TabsList className="w-full mb-4">
                <TabsTrigger value="paste" className="w-full">
                  <FileText className="mr-2 h-4 w-4" />
                  Paste Text
                </TabsTrigger>
                <TabsTrigger value="upload" className="w-full">
                  <Archive className="mr-2 h-4 w-4" />
                  Upload File
                </TabsTrigger>
                {getSearchParams().get('dev') === 'true' && (
                  <TabsTrigger value="debug" className="w-full">
                    <AlertCircle className="mr-2 h-4 w-4" />
                    Debug
                  </TabsTrigger>
                )}
              </TabsList>
              
              <TabsContent value="paste" className="space-y-4">
                <div>
                  <Textarea
                    placeholder="Paste your conversation here..."
                    className="min-h-[200px] font-mono text-sm"
                    value={conversation}
                    onChange={(e) => setConversation(e.target.value)}
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Switch 
                    id="date-filter" 
                    checked={useStartDate}
                    onCheckedChange={setUseStartDate}
                  />
                  <Label htmlFor="date-filter">Filter by date</Label>
                </div>
                
                {useStartDate && (
                  <div className="flex flex-wrap gap-4">
                    <div>
                      <Label htmlFor="start-date">Start Date</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className="w-full justify-start text-left font-normal mt-2"
                          >
                            <Calendar className="mr-2 h-4 w-4" />
                            {startDate ? format(startDate, "PPP") : "Select start date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <CalendarComponent
                            mode="single"
                            selected={startDate}
                            onSelect={setStartDate}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    
                    <div>
                      <Label htmlFor="end-date">End Date (Optional)</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className="w-full justify-start text-left font-normal mt-2"
                          >
                            <Calendar className="mr-2 h-4 w-4" />
                            {endDate ? format(endDate, "PPP") : "Select end date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <CalendarComponent
                            mode="single"
                            selected={endDate}
                            onSelect={setEndDate}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="upload" className="space-y-4">
                <div className="grid gap-4 py-4">
                  <div className="flex flex-col space-y-3">
                    <Label htmlFor="file">Upload Chat File</Label>
                    <input
                      type="file"
                      id="file"
                      className="rounded-md border border-input p-2"
                      accept=".txt,.zip,.png,.jpg,.jpeg"
                      onChange={handleFileChange}
                    />
                  </div>
                  
                  {selectedFile && selectedFile.type.includes('image') && (
                    <div className="flex flex-col space-y-2">
                      <p className="text-sm">
                        Selected image: {selectedFile.name}
                      </p>
                      <Button onClick={handleImageProcess} disabled={processOCRMutation.isPending}>
                        {processOCRMutation.isPending ? "Processing..." : "Extract Text from Image"}
                      </Button>
                    </div>
                  )}
                  
                  <div className="text-sm text-muted-foreground">
                    <p>Supported formats:</p>
                    <ul className="list-disc pl-5 mt-1">
                      <li>Text files (.txt)</li>
                      <li>WhatsApp chat exports (.zip)</li>
                      <li>Screenshot or image of conversation (.png, .jpg)</li>
                    </ul>
                  </div>
                </div>
              </TabsContent>
              
              {getSearchParams().get('dev') === 'true' && (
                <TabsContent value="debug" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="tierOverride">Override Tier</Label>
                      <select 
                        id="tierOverride" 
                        className="w-full p-2 border rounded-md"
                        value={tierLevel}
                        onChange={(e) => setTierLevel(e.target.value)}
                      >
                        <option value="free">Free</option>
                        <option value="personal">Personal</option>
                        <option value="pro">Pro</option>
                        <option value="instant">Instant Deep Dive</option>
                      </select>
                    </div>
                  </div>
                </TabsContent>
              )}
            </Tabs>
          </CardContent>
        </Card>
        
        <Card className="w-full md:w-1/3">
          <CardContent className="pt-6 space-y-4">
            <div>
              <h3 className="text-lg font-medium mb-2">Participant Names</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="me">You</Label>
                  <input 
                    id="me" 
                    className="w-full p-2 border rounded-md mt-1"
                    value={me}
                    onChange={(e) => setMe(e.target.value)}
                    placeholder="Your name"
                  />
                </div>
                <div>
                  <Label htmlFor="them">Other Person</Label>
                  <input 
                    id="them" 
                    className="w-full p-2 border rounded-md mt-1"
                    value={them}
                    onChange={(e) => setThem(e.target.value)}
                    placeholder="Their name"
                  />
                </div>
              </div>
              
              <div className="flex justify-between mt-4">
                <Button 
                  variant="outline" 
                  onClick={handleDetectParticipants} 
                  disabled={isDetectingParticipants || !conversation}
                  size="sm"
                >
                  {isDetectingParticipants ? "Detecting..." : "Auto-Detect Names"}
                </Button>
                
                <Button 
                  variant="outline" 
                  onClick={switchNames} 
                  disabled={!me || !them}
                  size="sm"
                >
                  Switch Names
                </Button>
              </div>
            </div>
            
            <div className="pt-4">
              <h3 className="text-lg font-medium mb-2">Submit Analysis</h3>
              
              <div className="text-sm text-muted-foreground mb-4">
                <Info className="inline-block mr-1 h-4 w-4" />
                {usageData ? getUsageMessage() : "Loading usage information..."}
              </div>
              
              <Button 
                className="w-full" 
                onClick={handleSubmit} 
                disabled={isSubmitting || !conversation || !me || !them || (useStartDate && !startDate)}
              >
                {isSubmitting ? "Analyzing..." : "Analyze Conversation"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {result && (
        <div ref={resultsRef} className="mt-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <h2 className="text-2xl font-bold">Analysis Results</h2>
                
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={exportToPdf}
                    disabled={isExporting}
                    size="sm"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    {isExporting ? "Exporting..." : "Export as PDF"}
                  </Button>
                  
                  <Button
                    variant="outline"
                    onClick={exportAsImage}
                    disabled={isExporting}
                    size="sm"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    {isExporting ? "Exporting..." : "Save as Image"}
                  </Button>
                </div>
              </div>
              
              <ParticipantChips 
                me={me} 
                them={them} 
                participantTones={result.toneAnalysis.participantTones} 
              />
              
              <ScrollArea className="rounded-md border p-4 mt-6 max-h-[800px]">
                <div className="space-y-6">
                  {tierLevel === 'free' ? (
                    <FreeTierAnalysis 
                      result={result} 
                      me={me} 
                      them={them} 
                    />
                  ) : (
                    <>
                      <div>
                        <h3 className="text-xl font-semibold mb-2">Overall Tone</h3>
                        <p className="text-lg">{result.toneAnalysis.overallTone}</p>
                      </div>
                      
                      <Separator />
                      
                      <HealthScoreDisplay 
                        healthScore={result.healthScore} 
                        tier={tierLevel}
                        me={me}
                        them={them}
                      />
                      
                      <Separator />
                      
                      <EmotionalState 
                        emotions={result.toneAnalysis.emotionalState} 
                      />
                      
                      <Separator />
                      
                      <RedFlags 
                        redFlags={result.redFlags || []} 
                        tier={tierLevel} 
                        overallTone={result.toneAnalysis.overallTone}
                      />
                      
                      <Separator />
                      
                      <CommunicationPatterns 
                        patterns={result.communication.patterns || []} 
                        suggestions={result.communication.suggestions} 
                      />
                      
                      {result.participantConflictScores && (
                        <>
                          <Separator />
                          <ParticipantEmotions 
                            participantScores={result.participantConflictScores} 
                            me={me} 
                            them={them} 
                          />
                        </>
                      )}
                      
                      {result.keyQuotes && result.keyQuotes.length > 0 && (
                        <>
                          <Separator />
                          <KeyQuotes 
                            quotes={result.keyQuotes} 
                            tier={tierLevel}
                          />
                        </>
                      )}
                      
                      {(tierLevel === 'pro' || tierLevel === 'instant') && (
                        <>
                          {result.tensionContributions && (
                            <>
                              <Separator />
                              <TensionContributions
                                tensionContributions={result.tensionContributions}
                                me={me}
                                them={them}
                                tier={tierLevel}
                              />
                            </>
                          )}
                          
                          {result.tensionMeaning && (
                            <>
                              <Separator />
                              <TensionMeaning tensionMeaning={result.tensionMeaning} />
                            </>
                          )}
                          
                          <Separator />
                          <PsychologicalProfile 
                            result={result} 
                            me={me} 
                            them={them}
                          />
                          
                          <Separator />
                          <PersonalizedSuggestions 
                            result={result}
                            me={me}
                            them={them}
                            tier={tierLevel}
                          />
                        </>
                      )}
                    </>
                  )}
                  
                  <SupportHelpLinesLink 
                    variant="secondary" 
                    size="default"
                  />
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}