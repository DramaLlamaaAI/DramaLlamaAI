import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Edit, Upload, Image, Brain, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import ScreenshotTab from "@/components/screenshot-tab";

export default function ChatAnalysisClean() {
  // Mock canUseFeature for now - replace with actual user tier logic
  const canUseFeature = true;
  const [tabValue, setTabValue] = useState("paste");
  const [conversation, setConversation] = useState("");
  const [me, setMe] = useState("");
  const [them, setThem] = useState("");
  const [conversationType, setConversationType] = useState<"two_person" | "group_chat">("two_person");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleAnalysis = async () => {
    if (!conversation || !me || !them) {
      toast({
        title: "Missing Information",
        description: "Please provide the conversation text and participant names.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Simulate analysis - replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast({
        title: "Analysis Complete",
        description: "Your conversation has been analyzed successfully!",
      });
    } catch (error) {
      toast({
        title: "Analysis Failed",
        description: "Something went wrong during analysis. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="w-full max-w-4xl mx-auto p-6">
      <Card>
        <CardContent className="p-6">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Chat Analysis</h2>
            <p className="text-gray-600">
              Analyze your conversations to gain insights into communication patterns and emotional dynamics
            </p>
          </div>

          <Tabs value={tabValue} onValueChange={setTabValue} className="mt-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="paste">
                <Edit className="h-4 w-4 mr-2" />
                Paste Text
              </TabsTrigger>
              <TabsTrigger value="upload">
                <Upload className="h-4 w-4 mr-2" />
                Upload File
              </TabsTrigger>
              <TabsTrigger value="screenshot">
                <Image className="h-4 w-4 mr-2" />
                Screenshot
              </TabsTrigger>
              <TabsTrigger value="whatsapp">
                <Upload className="h-4 w-4 mr-2" />
                WhatsApp
              </TabsTrigger>
            </TabsList>

            <TabsContent value="paste" className="mt-4">
              <div className="space-y-4">
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2">Conversation Type:</label>
                  <Select value={conversationType} onValueChange={(value: "two_person" | "group_chat") => setConversationType(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="two_person">Two-Person Conversation</SelectItem>
                      <SelectItem value="group_chat">Group Chat</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="me" className="block mb-2 font-medium">Your Name (Me)</Label>
                    <Input
                      id="me"
                      placeholder="Enter your name"
                      value={me}
                      onChange={(e) => setMe(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="them" className="block mb-2 font-medium">
                      {conversationType === "group_chat" ? "Other Participant Names (comma-separated)" : "Their Name"}
                    </Label>
                    <Input
                      id="them"
                      placeholder={conversationType === "group_chat" ? "Alice, Bob, Charlie" : "Enter their name"}
                      value={them}
                      onChange={(e) => setThem(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="conversation" className="block mb-2 font-medium">Conversation Text</Label>
                  <Textarea
                    id="conversation"
                    placeholder="Paste your conversation here..."
                    value={conversation}
                    onChange={(e) => setConversation(e.target.value)}
                    className="min-h-[200px]"
                  />
                </div>

                <Button
                  onClick={handleAnalysis}
                  disabled={!canUseFeature || isSubmitting || !conversation || !me || !them}
                  className="w-full bg-teal-500 hover:bg-teal-600"
                  data-analyze-button
                >
                  {isSubmitting ? (
                    <>
                      <div className="h-4 w-4 mr-2 animate-spin rounded-full border-t-2 border-gray-500"></div>
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Brain className="h-4 w-4 mr-2" />
                      {canUseFeature ? 'Analyze Chat' : 'Usage Limit Reached'}
                    </>
                  )}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="upload" className="mt-4">
              <div className="space-y-4">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <Upload className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-lg font-medium text-gray-900 mb-2">Upload Conversation File</p>
                  <p className="text-gray-600 mb-4">
                    Upload a text file containing your conversation
                  </p>
                  <input
                    type="file"
                    accept=".txt,.doc,.docx"
                    className="hidden"
                    id="file-upload"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          const text = event.target?.result as string;
                          setConversation(text);
                          setTabValue("paste"); // Switch to paste tab to show the loaded content
                        };
                        reader.readAsText(file);
                      }
                    }}
                  />
                  <label
                    htmlFor="file-upload"
                    className="cursor-pointer bg-teal-500 hover:bg-teal-600 text-white px-4 py-2 rounded-md inline-flex items-center"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Choose File
                  </label>
                </div>
                
                <div className="text-sm text-gray-600">
                  <p className="font-medium mb-2">Supported formats:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Text files (.txt)</li>
                    <li>Word documents (.doc, .docx)</li>
                    <li>Plain text conversations</li>
                  </ul>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="screenshot" className="mt-4">
              <ScreenshotTab 
                canUseFeature={canUseFeature}
                onAnalyze={(conversation, me, them) => {
                  setConversation(conversation);
                  setMe(me);
                  setThem(them);
                  setTabValue("paste");
                  setTimeout(() => {
                    const analyzeButton = document.querySelector('[data-analyze-button]') as HTMLButtonElement;
                    if (analyzeButton) {
                      analyzeButton.click();
                    }
                  }, 100);
                }}
              />
            </TabsContent>

            <TabsContent value="whatsapp" className="mt-4">
              <div className="text-center py-8">
                <Upload className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-500">WhatsApp export feature coming soon!</p>
              </div>
            </TabsContent>
          </Tabs>

          {!canUseFeature && (
            <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start space-x-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
              <div>
                <p className="text-amber-800 font-medium">Usage Limit Reached</p>
                <p className="text-amber-700 text-sm">
                  You've reached your monthly analysis limit. Upgrade your plan to continue analyzing conversations.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}