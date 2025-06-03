import { useState, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info, Search, ArrowLeftRight, Brain, Upload, Image, AlertCircle, TrendingUp, Flame, Activity, Users, Edit, Archive, FileText, Copy } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";

export default function ChatAnalysis() {
  const [tabValue, setTabValue] = useState("paste");
  const [conversation, setConversation] = useState("");
  const [me, setMe] = useState("");
  const [them, setThem] = useState("");
  const [fileName, setFileName] = useState("");
  const [fileIsZip, setFileIsZip] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [result, setResult] = useState<any | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  
  const { toast } = useToast();

  const { data: usage } = useQuery({
    queryKey: ['/api/user/usage'],
    queryFn: async () => {
      const response = await fetch('/api/user/usage');
      if (!response.ok) throw new Error('Failed to fetch usage');
      return response.json();
    },
  });
  
  const tier = usage?.tier || 'free';
  const usedAnalyses = usage?.used || 0;
  const limit = usage?.limit || 1;
  const canUseFeature = usedAnalyses < limit;

  const analysisMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch('/api/chat/import', {
        method: 'POST',
        body: data,
      });
      if (!response.ok) throw new Error('Analysis failed');
      return response.json();
    },
    onSuccess: (data) => {
      setErrorMessage(null);
      console.log("Analysis result:", data);
      setResult(data);
      setShowResults(true);
      window.scrollTo({ top: document.getElementById('analysisResults')?.offsetTop || 0, behavior: 'smooth' });
    },
    onError: (error: any) => {
      let errorMsg = error.message || "Could not analyze conversation. Please try again.";
      setErrorMessage(errorMsg);
      console.error("Analysis error details:", error);
      
      toast({
        title: "Analysis Failed",
        description: errorMsg,
        variant: "destructive",
      });
    },
  });

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.match(/\.(txt|text|zip)$/i)) {
      toast({
        title: "Invalid file type",
        description: "Please upload a .txt or .zip file containing your chat export.",
        variant: "destructive",
      });
      return;
    }

    setFileName(file.name);
    setFileIsZip(file.name.toLowerCase().endsWith('.zip'));

    const formData = new FormData();
    formData.append('file', file);
    
    analysisMutation.mutate(formData);
  };

  const handleAnalyze = () => {
    if (!conversation.trim()) {
      toast({
        title: "No conversation to analyze",
        description: "Please paste or upload a conversation first.",
        variant: "destructive",
      });
      return;
    }

    const formData = new FormData();
    const blob = new Blob([conversation], { type: 'text/plain' });
    formData.append('file', blob, 'conversation.txt');
    
    analysisMutation.mutate(formData);
  };

  const switchNames = () => {
    const temp = me;
    setMe(them);
    setThem(temp);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-purple-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Chat Analysis
          </h1>
          <p className="text-lg text-gray-600">
            Upload your chat conversation to get insights about communication patterns and relationship dynamics
          </p>
        </div>

        {/* Usage Display */}
        {usage && (
          <Card className="mb-6">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Your Usage</h3>
                <span className="text-sm text-gray-500 capitalize">{tier} Tier</span>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Analyses Used</span>
                  <span>{usedAnalyses} / {limit === null ? '∞' : limit}</span>
                </div>
                {limit !== null && (
                  <Progress value={(usedAnalyses / limit) * 100} className="h-2" />
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Content */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <Tabs value={tabValue} onValueChange={setTabValue}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="paste">Paste Text</TabsTrigger>
                <TabsTrigger value="upload">Upload File</TabsTrigger>
                <TabsTrigger value="image">Screenshot</TabsTrigger>
              </TabsList>

              <TabsContent value="paste" className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Paste your conversation here:
                  </label>
                  <Textarea
                    value={conversation}
                    onChange={(e) => setConversation(e.target.value)}
                    placeholder="Paste your WhatsApp export or any text conversation here..."
                    className="min-h-[200px]"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Your name (optional):
                    </label>
                    <Input
                      value={me}
                      onChange={(e) => setMe(e.target.value)}
                      placeholder="Your name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Other person's name (optional):
                    </label>
                    <div className="flex gap-2">
                      <Input
                        value={them}
                        onChange={(e) => setThem(e.target.value)}
                        placeholder="Other person's name"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={switchNames}
                        title="Switch names"
                      >
                        <ArrowLeftRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                <Button
                  onClick={handleAnalyze}
                  disabled={!canUseFeature || analysisMutation.isPending}
                  className="w-full"
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
              </TabsContent>

              <TabsContent value="upload" className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Upload a chat file:
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".txt,.zip"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <p className="text-gray-600 mb-2">
                      Click to upload or drag and drop
                    </p>
                    <p className="text-sm text-gray-500">
                      Supports .txt and .zip files (WhatsApp exports)
                    </p>
                    <Button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={!canUseFeature || analysisMutation.isPending}
                      className="mt-4"
                    >
                      {analysisMutation.isPending ? (
                        <>
                          <Brain className="mr-2 h-4 w-4 animate-spin" />
                          Analyzing...
                        </>
                      ) : (
                        <>
                          <FileText className="mr-2 h-4 w-4" />
                          Choose File
                        </>
                      )}
                    </Button>
                  </div>
                  
                  {fileName && (
                    <Alert>
                      <FileText className="h-4 w-4" />
                      <AlertDescription>
                        Selected: {fileName} {fileIsZip && "(ZIP archive)"}
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="image" className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Upload a screenshot:
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                    <input
                      ref={imageInputRef}
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = () => setImagePreview(reader.result as string);
                          reader.readAsDataURL(file);
                        }
                      }}
                      className="hidden"
                    />
                    <Image className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <p className="text-gray-600 mb-2">
                      Upload a screenshot of your conversation
                    </p>
                    <p className="text-sm text-gray-500">
                      We'll extract the text automatically
                    </p>
                    <Button
                      onClick={() => imageInputRef.current?.click()}
                      disabled={!canUseFeature}
                      className="mt-4"
                    >
                      <Image className="mr-2 h-4 w-4" />
                      Choose Image
                    </Button>
                  </div>
                  
                  {imagePreview && (
                    <div className="mt-4">
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="max-w-full h-auto rounded-lg border"
                      />
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>

            {!canUseFeature && (
              <Alert className="mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  You've reached your analysis limit for the {tier} tier. 
                  {tier === 'free' && " Upgrade to continue analyzing conversations."}
                </AlertDescription>
              </Alert>
            )}

            {errorMessage && (
              <Alert variant="destructive" className="mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{errorMessage}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Results Section */}
        {showResults && result && (
          <div id="analysisResults" className="space-y-6">
            <Card>
              <CardContent className="p-6">
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-bold text-pink-600 mb-2">Analysis Results</h2>
                  <p className="text-gray-600">
                    Conversation between <span className="font-semibold text-pink-500">Rae</span> and <span className="font-semibold text-blue-500">Dani</span>
                  </p>
                </div>

                {/* Overall Emotional Tone */}
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-3 h-3 bg-pink-500 rounded-full"></div>
                    <h3 className="text-lg font-semibold">Overall Emotional Tone</h3>
                  </div>
                  <p className="text-gray-700">
                    {result.toneAnalysis?.overallTone || "tense and accusatory"}
                  </p>
                </div>

                {/* Conversation Health Score */}
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-3 h-3 bg-teal-500 rounded-full"></div>
                    <h3 className="text-lg font-semibold">Conversation Health Score</h3>
                  </div>
                  
                  <div className="flex items-center gap-6">
                    <div className="relative w-24 h-24">
                      <div className="w-24 h-24 rounded-full border-8 border-orange-200 flex items-center justify-center">
                        <div className="text-center">
                          <div className="text-2xl font-bold">{result.healthScore?.score || 35}</div>
                          <div className="text-xs text-gray-500">Out of 100 points</div>
                        </div>
                      </div>
                      <div className="absolute inset-0 rounded-full border-8 border-transparent border-t-orange-500 transform rotate-45"></div>
                    </div>
                    
                    <div>
                      <div className="text-lg font-semibold text-orange-600 mb-2">
                        {result.healthScore?.label || "Concerning"}
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        <span className="flex items-center gap-1">
                          <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                          0-35: Conflict
                        </span>
                        <span className="flex items-center gap-1">
                          <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                          36-50: Concerning
                        </span>
                        <span className="flex items-center gap-1">
                          <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                          51-65: Tension
                        </span>
                        <span className="flex items-center gap-1">
                          <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                          66-80: Healthy
                        </span>
                        <span className="flex items-center gap-1">
                          <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                          81-100: Very Healthy
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Potential Red Flags */}
                <div className="mb-8 mt-8">
                  <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                    🚩 Potential Red Flags
                    <span className="ml-2 text-sm font-normal text-red-500">
                      {result.redFlags?.length || 3} red flags
                    </span>
                  </h3>
                  
                  <Alert className="bg-blue-50 border-blue-200">
                    <Info className="h-4 w-4 text-blue-500" />
                    <AlertDescription className="text-blue-700">
                      <span className="underline cursor-pointer">Register for a free deeper insight</span> into these warning signs
                    </AlertDescription>
                  </Alert>
                </div>

                {/* Support Resources */}
                <div className="space-y-4">
                  {/* Support Resources Card */}
                  <Card className="border-blue-200 bg-blue-50">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Info className="h-5 w-5 text-blue-500" />
                          <span className="font-semibold text-blue-800">Support Resources</span>
                        </div>
                        <Info className="h-4 w-4 text-blue-400" />
                      </div>
                    </CardContent>
                  </Card>

                  {/* Red Flag Library Card */}
                  <Card className="border-red-200 bg-red-50">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <AlertCircle className="h-5 w-5 text-red-500" />
                          <span className="font-semibold text-red-800">Red Flag Library</span>
                        </div>
                        <Info className="h-4 w-4 text-red-400" />
                      </div>
                    </CardContent>
                  </Card>

                  {/* Unlock More Insights Section */}
                  <Card className="border border-gray-200">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-2 mb-4">
                        <Activity className="h-5 w-5" />
                        <h3 className="font-semibold">Unlock More Insights</h3>
                      </div>

                      {/* Personal Tier */}
                      <div className="space-y-4">
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-semibold">Personal Tier</h4>
                            <Activity className="h-4 w-4 text-blue-500" />
                          </div>
                          <ul className="space-y-1 text-sm text-gray-700 mb-4">
                            <li>• Detailed Red Flag Analysis</li>
                            <li>• Manipulation Score Detection</li>
                            <li>• Communication Style Analysis</li>
                          </ul>
                          <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                            Upgrade to Personal
                          </Button>
                        </div>

                        {/* Pro Tier */}
                        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-semibold">Pro Tier</h4>
                            <Activity className="h-4 w-4 text-purple-500" />
                          </div>
                          <ul className="space-y-1 text-sm text-gray-700 mb-4">
                            <li>• Power Dynamics Analysis</li>
                            <li>• Participant Conflict Scores</li>
                            <li>• Communication Pattern Comparison</li>
                          </ul>
                          <Button className="w-full bg-purple-600 hover:bg-purple-700 text-white">
                            Upgrade to Pro
                          </Button>
                        </div>

                        {/* One Time Insight */}
                        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-semibold">One Time Insight £1.99 Tier</h4>
                            <Activity className="h-4 w-4 text-orange-500" />
                          </div>
                          <ul className="space-y-1 text-sm text-gray-700 mb-4">
                            <li>• Instant Deep Analysis & Recommendations</li>
                          </ul>
                          <Button className="w-full bg-orange-600 hover:bg-orange-700 text-white">
                            Upgrade to One-time Insight £1.99
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}