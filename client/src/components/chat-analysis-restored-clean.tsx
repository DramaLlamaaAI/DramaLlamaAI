import { useState, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info, Brain, Upload, AlertCircle, FileText } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import ResultsDispatcher from "./results/results-dispatcher";

export default function ChatAnalysis() {
  const [tabValue, setTabValue] = useState("upload");
  const [fileName, setFileName] = useState("");
  const [fileIsZip, setFileIsZip] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
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
  const limit = usage?.limit !== undefined ? usage.limit : 1;
  const canUseFeature = limit === null || usedAnalyses < limit;

  const analysisMutation = useMutation({
    mutationFn: async (data: any) => {
      // Import device ID for anonymous users
      const { getDeviceId } = await import('@/lib/device-id');
      const deviceId = getDeviceId();
      
      const response = await fetch('/api/chat/import', {
        method: 'POST',
        headers: {
          'x-device-id': deviceId,
        },
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
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="upload">Upload File</TabsTrigger>
                <TabsTrigger value="image">Screenshot</TabsTrigger>
              </TabsList>

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
                      Supports .txt files (WhatsApp exports)
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
                    
                    {/* Help and Advisory messages */}
                    <div className="mt-4 space-y-3">
                      <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                        <div className="flex items-start gap-2">
                          <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                          <div className="text-sm text-blue-800">
                            <strong>Analysis Note:</strong> Only the most recent 3 months of messages are analyzed for optimal relevance and performance. For analysis of longer conversations, please contact{' '}
                            <a href="mailto:support@dramallama.ai" className="underline hover:text-blue-900">
                              support@dramallama.ai
                            </a>
                          </div>
                        </div>
                      </div>
                      
                      <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                        <div className="flex items-start gap-2">
                          <Info className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                          <div className="text-sm text-green-800">
                            <strong>Need Help?</strong> Follow our step-by-step{' '}
                            <a href="/whatsapp-guide" className="underline hover:text-green-900 font-medium">
                              WhatsApp Export Guide
                            </a>
                            {' '}to learn how to export and upload your chat files.<br />
                            
                            <div className="mt-4 p-4 bg-white rounded-lg border border-green-200">
                              <h4 className="font-medium text-green-800 mb-2">📹 Video Tutorial</h4>
                              <video 
                                controls 
                                className="w-full max-w-md rounded-lg shadow-sm"
                                style={{ maxHeight: '250px' }}
                              >
                                <source src="/attached_assets/Tutorial.mov" type="video/quicktime" />
                                <source src="/attached_assets/Tutorial.mov" type="video/mp4" />
                                Your browser does not support the video tag.
                              </video>
                            </div>
                            
                            If you need additional 1:1 support, please contact us on{' '}
                            <a href="https://www.facebook.com/DramaLlamaAI" target="_blank" rel="noopener noreferrer" className="underline hover:text-green-900 font-medium">
                              Facebook.com/DramaLlamaAI
                            </a>
                            , and one of our team will assist you personally.
                          </div>
                        </div>
                      </div>
                    </div>
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
                  <div className="border-2 border-dashed border-yellow-300 bg-yellow-50 rounded-lg p-8 text-center">
                    <AlertCircle className="mx-auto h-16 w-16 text-yellow-500 mb-4" />
                    <h3 className="text-lg font-semibold text-yellow-800 mb-2">
                      Coming Soon
                    </h3>
                    <p className="text-yellow-700 mb-4">
                      Screenshot analysis is currently under development and will be available in a future update.
                    </p>
                    <p className="text-sm text-yellow-600">
                      In the meantime, please use the paste or upload options to analyze your conversations.
                    </p>
                  </div>
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
            <ResultsDispatcher 
              result={result} 
              me={result.participants?.me || "You"} 
              them={result.participants?.them || "Them"} 
              tier={tier}
            />
          </div>
        )}
      </div>
    </div>
  );
}