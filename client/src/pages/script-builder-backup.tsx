import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2, Edit3, Copy, CheckCircle, AlertCircle, Heart, Shield, Save, BookOpen, Trash2, Calendar, Clock, MessageCircle, Plus, Sparkles, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import Header from "@/components/header";
import Footer from "@/components/footer";
import { Helmet } from "react-helmet-async";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const scriptBuilderSchema = z.object({
  situation: z.string().min(10, "Please describe the situation in more detail"),
  message: z.string().min(5, "Please enter what you want to say"),
});

type ScriptBuilderForm = z.infer<typeof scriptBuilderSchema>;

interface ConversationMessage {
  id: number;
  scriptId: number;
  messageIndex: number;
  yourMessage: string;
  chosenTone: 'firm' | 'neutral' | 'empathic';
  partnerReply?: string | null;
  followUpSuggestions?: any | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ScriptResponse {
  firm: string;
  neutral: string;
  empathic: string;
  situationAnalysis: string;
}

interface SavedScript {
  id: number;
  title: string;
  situation: string;
  originalMessage: string;
  firmScript: string;
  neutralScript: string;
  empathicScript: string;
  situationAnalysis: string;
  chosenTone: 'firm' | 'neutral' | 'empathic' | null;
  status: 'saved' | 'sent' | 'replied' | 'resolved';
  createdAt: string;
  updatedAt: string;
  receivedReply: string | null;
  followUpSuggestions: {
    firm?: string;
    neutral?: string;
    empathic?: string;
  } | null;
}

export default function ScriptBuilder() {
  const [isLoading, setIsLoading] = useState(false);
  const [scripts, setScripts] = useState<ScriptResponse | null>(null);
  const [copiedScript, setCopiedScript] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [saveTitle, setSaveTitle] = useState("");
  const [selectedScript, setSelectedScript] = useState<SavedScript | null>(null);
  const [replyDialogOpen, setReplyDialogOpen] = useState(false);
  const [partnerReply, setPartnerReply] = useState("");
  const [isUpdatingScript, setIsUpdatingScript] = useState(false);
  const [generatingFollowUp, setGeneratingFollowUp] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch saved scripts
  const { data: savedScripts = [], isLoading: scriptsLoading } = useQuery<SavedScript[]>({
    queryKey: ['/api/scripts'],
    enabled: !!user,
  });

  // Delete script mutation
  const deleteScriptMutation = useMutation({
    mutationFn: async (scriptId: number) => {
      const response = await apiRequest('DELETE', `/api/scripts/${scriptId}`);
      if (!response.ok) throw new Error('Failed to delete script');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/scripts'] });
      toast({
        title: "Script deleted",
        description: "Script has been successfully deleted",
      });
    },
    onError: () => {
      toast({
        title: "Delete failed",
        description: "Failed to delete script. Please try again.",
        variant: "destructive",
      });
    },
  });

  const form = useForm<ScriptBuilderForm>({
    resolver: zodResolver(scriptBuilderSchema),
    defaultValues: {
      situation: "",
      message: "",
    },
  });

  const onSubmit = async (data: ScriptBuilderForm) => {
    setIsLoading(true);
    try {
      const response = await apiRequest('POST', '/api/script-builder', data);
      
      if (!response.ok) {
        const errorData = await response.json();
        
        // Handle tier restriction
        if (errorData.upgradeRequired) {
          toast({
            title: "Upgrade Required",
            description: errorData.message,
            variant: "destructive",
          });
          return;
        }
        
        throw new Error(errorData.message || 'Failed to generate scripts');
      }
      
      const result = await response.json();
      setScripts(result);
      
      toast({
        title: "Scripts Generated",
        description: "Your conversation scripts are ready! Choose the tone that fits best.",
      });
    } catch (error: any) {
      console.error('Script generation error:', error);
      toast({
        title: "Generation Failed",
        description: error.message || "Failed to generate scripts. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = async (text: string, scriptType: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedScript(scriptType);
      toast({
        title: "Copied to Clipboard",
        description: `${scriptType} script copied successfully!`,
      });
      
      // Reset copied state after 2 seconds
      setTimeout(() => setCopiedScript(null), 2000);
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Could not copy to clipboard. Please select and copy manually.",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    form.reset();
    setScripts(null);
    setCopiedScript(null);
  };

  const saveScript = async () => {
    if (!scripts || !saveTitle.trim()) return;

    setIsSaving(true);
    try {
      const formData = form.getValues();
      await apiRequest("POST", "/api/scripts/save", {
        title: saveTitle.trim(),
        situation: formData.situation,
        originalMessage: formData.message,
        firmScript: scripts.firm,
        neutralScript: scripts.neutral,
        empathicScript: scripts.empathic,
        situationAnalysis: scripts.situationAnalysis,
      });

      queryClient.invalidateQueries({ queryKey: ['/api/scripts'] });

      toast({
        title: "Script saved",
        description: "Your script has been saved successfully",
      });

      setSaveDialogOpen(false);
      setSaveTitle("");
    } catch (error) {
      console.error("Error saving script:", error);
      toast({
        title: "Save failed",
        description: "Failed to save script. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const markScriptAsUsed = async (scriptId: number, chosenTone: 'firm' | 'neutral' | 'empathic') => {
    try {
      setIsUpdatingScript(true);
      await apiRequest("PUT", `/api/scripts/${scriptId}`, {
        chosenTone,
        status: 'sent'
      });

      queryClient.invalidateQueries({ queryKey: ['/api/scripts'] });

      toast({
        title: "Script marked as sent",
        description: `Marked ${chosenTone} response as the one you used`,
      });
    } catch (error) {
      toast({
        title: "Update failed",
        description: "Failed to update script status",
        variant: "destructive",
      });
    } finally {
      setIsUpdatingScript(false);
    }
  };

  const addPartnerReply = async () => {
    if (!selectedScript || !partnerReply.trim()) return;

    setIsUpdatingScript(true);
    try {
      await apiRequest("PUT", `/api/scripts/${selectedScript.id}`, {
        receivedReply: partnerReply.trim(),
        status: 'replied'
      });

      queryClient.invalidateQueries({ queryKey: ['/api/scripts'] });

      toast({
        title: "Reply added",
        description: "Partner's reply has been recorded",
      });

      setReplyDialogOpen(false);
      setPartnerReply("");
      setSelectedScript(null);
    } catch (error) {
      toast({
        title: "Update failed",
        description: "Failed to add partner's reply",
        variant: "destructive",
      });
    } finally {
      setIsUpdatingScript(false);
    }
  };

  const generateFollowUpSuggestions = async (script: SavedScript) => {
    if (!script.receivedReply || !script.chosenTone) return;

    setGeneratingFollowUp(true);
    try {
      const response = await apiRequest("POST", "/api/scripts/follow-up", {
        scriptId: script.id,
        originalSituation: script.situation,
        yourMessage: script.chosenTone === 'firm' ? script.firmScript : 
                     script.chosenTone === 'neutral' ? script.neutralScript : 
                     script.empathicScript,
        partnerReply: script.receivedReply,
        previousTone: script.chosenTone
      });

      const result = await response.json();

      await apiRequest("PUT", `/api/scripts/${script.id}`, {
        followUpSuggestions: result
      });

      queryClient.invalidateQueries({ queryKey: ['/api/scripts'] });

      toast({
        title: "Follow-up suggestions generated",
        description: "New response options have been created based on their reply",
      });
    } catch (error) {
      toast({
        title: "Generation failed",
        description: "Failed to generate follow-up suggestions",
        variant: "destructive",
      });
    } finally {
      setGeneratingFollowUp(false);
    }
  };

  const saveFollowUpResponse = async (script: SavedScript, tone: 'firm' | 'neutral' | 'empathic', message: string) => {
    if (!script.followUpSuggestions) return;

    setIsUpdatingScript(true);
    try {
      // Get the next message index (count existing conversation messages + 1)
      const conversationResponse = await apiRequest("GET", `/api/scripts/${script.id}/conversation`);
      const existingMessages = await conversationResponse.json();
      const messageIndex = existingMessages.length + 1;

      // Save the conversation message
      await apiRequest("POST", `/api/scripts/${script.id}/conversation`, {
        yourMessage: message,
        chosenTone: tone,
        messageIndex,
        followUpSuggestions: null, // Will be generated when partner replies
        isActive: true
      });

      // Update script status
      await apiRequest("PUT", `/api/scripts/${script.id}`, {
        status: 'sent'
      });

      queryClient.invalidateQueries({ queryKey: ['/api/scripts'] });

      toast({
        title: "Response saved",
        description: `Your ${tone} response has been saved and tracked`,
      });

      // Open dialog to add partner's reply
      setSelectedScript(script);
      setReplyDialogOpen(true);
      
    } catch (error) {
      toast({
        title: "Save failed",
        description: "Failed to save follow-up response",
        variant: "destructive",
      });
    } finally {
      setIsUpdatingScript(false);
    }
  };

function ConversationHistory({ scriptId }: { scriptId: number }) {
  const { data: conversationMessages, isLoading } = useQuery<ConversationMessage[]>({
    queryKey: ['/api/scripts', scriptId, 'conversation'],
    queryFn: () => apiRequest('GET', `/api/scripts/${scriptId}/conversation`).then(res => res.json()),
    enabled: scriptId > 0
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
        <span className="ml-2 text-sm text-gray-500">Loading conversation...</span>
      </div>
    );
  }

  if (!conversationMessages || conversationMessages.length === 0) {
    return (
      <div className="text-sm text-gray-500 text-center py-4">
        No follow-up conversation messages yet
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {conversationMessages.map((message, index) => (
        <div key={message.id} className="border-l-2 border-gray-200 pl-4">
          <div className="text-xs text-gray-500 mb-1">
            Message {message.messageIndex} • {new Date(message.createdAt).toLocaleDateString()}
          </div>
          
          <div className="space-y-2">
            <div className="bg-blue-50 border border-blue-200 rounded p-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-medium text-blue-800">Your Message</span>
                <Badge variant="secondary" className={`text-xs ${
                  message.chosenTone === 'firm' ? 'bg-red-100 text-red-800' :
                  message.chosenTone === 'neutral' ? 'bg-blue-100 text-blue-800' :
                  'bg-green-100 text-green-800'
                }`}>
                  {message.chosenTone}
                </Badge>
              </div>
              <p className="text-sm text-blue-800">{message.yourMessage}</p>
            </div>

            {message.partnerReply && (
              <div className="bg-gray-50 border border-gray-200 rounded p-3">
                <span className="text-xs font-medium text-gray-700 block mb-1">Their Reply</span>
                <p className="text-sm text-gray-700">{message.partnerReply}</p>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
        <title>Script Builder - Drama Llama AI</title>
        <meta name="description" content="Generate tone-adjusted scripts for difficult conversations. Get firm, neutral, and empathic response options powered by AI." />
      </Helmet>

      <Header />
      
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Edit3 className="h-8 w-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">Script Builder</h1>
            <Badge variant="secondary" className="ml-2">Personal+</Badge>
          </div>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Prepare calm, assertive responses for emotionally charged conversations. 
            Get AI-generated scripts in three different tones to help you communicate effectively.
          </p>
        </div>

        <Tabs defaultValue="create" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="create">Create Scripts</TabsTrigger>
            <TabsTrigger value="saved">Saved Scripts ({(savedScripts as SavedScript[]).length})</TabsTrigger>
          </TabsList>
          
          <TabsContent value="create" className="space-y-6">

        {/* Tier Restriction Check */}
        {user && user.tier === 'free' && (
          <Card className="mb-8 border-amber-200 bg-amber-50">
            <CardContent className="flex items-center justify-between p-6">
              <div className="flex items-center gap-3">
                <Shield className="h-6 w-6 text-amber-600" />
                <div>
                  <h3 className="font-semibold text-amber-900">Personal Tier Required</h3>
                  <p className="text-amber-700">Script Builder is available for Personal tier and higher subscribers.</p>
                </div>
              </div>
              <Link href="/subscription">
                <Button className="bg-amber-600 hover:bg-amber-700 text-white">
                  Upgrade Now
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-8 lg:grid-cols-2">
          {/* Input Form */}
          <Card className="h-fit">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Edit3 className="h-5 w-5 text-blue-600" />
                Describe Your Situation
              </CardTitle>
              <CardDescription>
                Tell us about the conversation you need help with and what you want to communicate.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="situation"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Situation Context</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Describe the situation... e.g., 'I need to address my partner about their constant lateness' or 'I want to set boundaries with a demanding colleague'"
                            className="min-h-[100px] resize-none"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="message"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>What You Want to Say</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="What's your main message... e.g., 'I feel disrespected when you're always late' or 'I need you to respect my work hours'"
                            className="min-h-[100px] resize-none"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex gap-3">
                    <Button 
                      type="submit" 
                      disabled={isLoading}
                      className="flex-1"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Generating Scripts...
                        </>
                      ) : (
                        <>
                          <Edit3 className="mr-2 h-4 w-4" />
                          Generate Scripts
                        </>
                      )}
                    </Button>
                    
                    {scripts && (
                      <Button 
                        type="button" 
                        variant="outline"
                        onClick={resetForm}
                      >
                        Start Over
                      </Button>
                    )}
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>

          {/* Results */}
          <div className="space-y-6">
            {scripts ? (
              <>
                {/* Situation Analysis */}
                {scripts.situationAnalysis && (
                  <Card className="border-amber-200 bg-amber-50">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-amber-800">
                        <AlertCircle className="h-5 w-5" />
                        Situation Insights
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-amber-700 leading-relaxed">{scripts.situationAnalysis}</p>
                    </CardContent>
                  </Card>
                )}

                {/* Script Options */}
                <div className="space-y-4">
                  <h3 className="text-xl font-semibold text-gray-900">Choose Your Tone</h3>
                  
                  {/* Firm Script */}
                  <Card className="border-red-200 bg-red-50">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Shield className="h-5 w-5 text-red-600" />
                          <CardTitle className="text-red-800">Firm & Direct</CardTitle>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyToClipboard(scripts.firm, 'Firm')}
                          className="border-red-300 hover:bg-red-100"
                        >
                          {copiedScript === 'Firm' ? (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                      <CardDescription className="text-red-700">
                        Clear boundaries with assertive language
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-red-800 leading-relaxed whitespace-pre-wrap">{scripts.firm}</p>
                    </CardContent>
                  </Card>

                  {/* Neutral Script */}
                  <Card className="border-blue-200 bg-blue-50">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Edit3 className="h-5 w-5 text-blue-600" />
                          <CardTitle className="text-blue-800">Neutral & Balanced</CardTitle>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyToClipboard(scripts.neutral, 'Neutral')}
                          className="border-blue-300 hover:bg-blue-100"
                        >
                          {copiedScript === 'Neutral' ? (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                      <CardDescription className="text-blue-700">
                        Professional and objective approach
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-blue-800 leading-relaxed whitespace-pre-wrap">{scripts.neutral}</p>
                    </CardContent>
                  </Card>

                  {/* Empathic Script */}
                  <Card className="border-green-200 bg-green-50">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Heart className="h-5 w-5 text-green-600" />
                          <CardTitle className="text-green-800">Empathic & Understanding</CardTitle>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyToClipboard(scripts.empathic, 'Empathic')}
                          className="border-green-300 hover:bg-green-100"
                        >
                          {copiedScript === 'Empathic' ? (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                      <CardDescription className="text-green-700">
                        Compassionate while maintaining your position
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-green-800 leading-relaxed whitespace-pre-wrap">{scripts.empathic}</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Save Scripts Section */}
                <Card className="border-purple-200 bg-purple-50">
                  <CardContent className="flex items-center justify-between p-6">
                    <div className="flex items-center gap-3">
                      <BookOpen className="h-6 w-6 text-purple-600" />
                      <div>
                        <h3 className="font-semibold text-purple-900">Save These Scripts</h3>
                        <p className="text-purple-700 text-sm">Save for later and track responses you receive</p>
                      </div>
                    </div>
                    <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
                      <DialogTrigger asChild>
                        <Button className="bg-purple-600 hover:bg-purple-700 text-white">
                          <Save className="h-4 w-4 mr-2" />
                          Save Scripts
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Save Your Scripts</DialogTitle>
                          <DialogDescription>
                            Give your scripts a memorable title so you can find them later
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="title">Script Title</Label>
                            <Input
                              id="title"
                              placeholder="e.g., Discussion with roommate about boundaries"
                              value={saveTitle}
                              onChange={(e) => setSaveTitle(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && saveTitle.trim()) {
                                  saveScript();
                                }
                              }}
                            />
                          </div>
                          <div className="flex gap-3">
                            <Button 
                              variant="outline" 
                              onClick={() => setSaveDialogOpen(false)}
                              className="flex-1"
                            >
                              Cancel
                            </Button>
                            <Button 
                              onClick={saveScript}
                              disabled={!saveTitle.trim() || isSaving}
                              className="flex-1"
                            >
                              {isSaving ? (
                                <>
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  Saving...
                                </>
                              ) : (
                                <>
                                  <Save className="h-4 w-4 mr-2" />
                                  Save
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card className="border-dashed border-gray-300">
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <Edit3 className="h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Ready to Build Your Script</h3>
                  <p className="text-gray-600 max-w-md">
                    Fill out the form to get personalized conversation scripts in three different tones.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Tips Section */}
        <Card className="mt-12 border-purple-200 bg-purple-50">
          <CardHeader>
            <CardTitle className="text-purple-800">Tips for Effective Communication</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-purple-700">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-semibold mb-2">Before the Conversation:</h4>
                <ul className="space-y-1 text-sm">
                  <li>• Choose a calm moment to talk</li>
                  <li>• Practice your chosen script</li>
                  <li>• Set clear intentions</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-2">During the Conversation:</h4>
                <ul className="space-y-1 text-sm">
                  <li>• Stay calm and focused</li>
                  <li>• Listen actively to responses</li>
                  <li>• Be prepared to adapt</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
          </TabsContent>

          <TabsContent value="saved" className="space-y-6">
            {scriptsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                <span className="ml-2 text-gray-600">Loading saved scripts...</span>
              </div>
            ) : (savedScripts as SavedScript[]).length === 0 ? (
              <Card className="border-dashed border-gray-300">
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <BookOpen className="h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Saved Scripts</h3>
                  <p className="text-gray-600 max-w-md">
                    You haven't saved any scripts yet. Create and save scripts in the "Create Scripts" tab to see them here.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {(savedScripts as SavedScript[]).map((script: SavedScript) => (
                  <Card key={script.id} className="border-l-4 border-l-blue-500">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg">{script.title}</CardTitle>
                          <CardDescription className="mt-1">
                            <div className="flex items-center gap-4 text-sm text-gray-500">
                              <span className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                {new Date(script.createdAt).toLocaleDateString()}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="h-4 w-4" />
                                {new Date(script.updatedAt).toLocaleTimeString()}
                              </span>
                            </div>
                          </CardDescription>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteScriptMutation.mutate(script.id)}
                          disabled={deleteScriptMutation.isPending}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">Situation</h4>
                        <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded">{script.situation}</p>
                      </div>
                      
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">Original Message</h4>
                        <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded">{script.originalMessage}</p>
                      </div>

                      <div className="grid gap-3">
                        <div className={`border rounded p-3 ${script.chosenTone === 'firm' ? 'border-red-400 bg-red-100' : 'border-red-200 bg-red-50'}`}>
                          <div className="flex items-center gap-2 mb-2">
                            <Shield className="h-4 w-4 text-red-600" />
                            <span className="font-medium text-red-800">Firm & Direct</span>
                            {script.chosenTone === 'firm' && (
                              <Badge variant="secondary" className="ml-2 bg-green-100 text-green-800">Used</Badge>
                            )}
                            <div className="ml-auto flex gap-1">
                              {script.status === 'saved' && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => markScriptAsUsed(script.id, 'firm')}
                                  disabled={isUpdatingScript}
                                  className="text-xs px-2 py-1 h-auto bg-red-200 hover:bg-red-300 text-red-800"
                                >
                                  Mark as Used
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => copyToClipboard(script.firmScript, 'Firm')}
                                className="border-red-300 hover:bg-red-100"
                              >
                                {copiedScript === 'Firm' ? (
                                  <CheckCircle className="h-4 w-4 text-green-600" />
                                ) : (
                                  <Copy className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          </div>
                          <p className="text-sm text-red-800 whitespace-pre-wrap">{script.firmScript}</p>
                        </div>

                        <div className={`border rounded p-3 ${script.chosenTone === 'neutral' ? 'border-blue-400 bg-blue-100' : 'border-blue-200 bg-blue-50'}`}>
                          <div className="flex items-center gap-2 mb-2">
                            <Edit3 className="h-4 w-4 text-blue-600" />
                            <span className="font-medium text-blue-800">Neutral & Balanced</span>
                            {script.chosenTone === 'neutral' && (
                              <Badge variant="secondary" className="ml-2 bg-green-100 text-green-800">Used</Badge>
                            )}
                            <div className="ml-auto flex gap-1">
                              {script.status === 'saved' && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => markScriptAsUsed(script.id, 'neutral')}
                                  disabled={isUpdatingScript}
                                  className="text-xs px-2 py-1 h-auto bg-blue-200 hover:bg-blue-300 text-blue-800"
                                >
                                  Mark as Used
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => copyToClipboard(script.neutralScript, 'Neutral')}
                                className="border-blue-300 hover:bg-blue-100"
                              >
                                {copiedScript === 'Neutral' ? (
                                  <CheckCircle className="h-4 w-4 text-green-600" />
                                ) : (
                                  <Copy className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          </div>
                          <p className="text-sm text-blue-800 whitespace-pre-wrap">{script.neutralScript}</p>
                        </div>

                        <div className={`border rounded p-3 ${script.chosenTone === 'empathic' ? 'border-green-400 bg-green-100' : 'border-green-200 bg-green-50'}`}>
                          <div className="flex items-center gap-2 mb-2">
                            <Heart className="h-4 w-4 text-green-600" />
                            <span className="font-medium text-green-800">Empathic & Understanding</span>
                            {script.chosenTone === 'empathic' && (
                              <Badge variant="secondary" className="ml-2 bg-green-100 text-green-800">Used</Badge>
                            )}
                            <div className="ml-auto flex gap-1">
                              {script.status === 'saved' && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => markScriptAsUsed(script.id, 'empathic')}
                                  disabled={isUpdatingScript}
                                  className="text-xs px-2 py-1 h-auto bg-green-200 hover:bg-green-300 text-green-800"
                                >
                                  Mark as Used
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => copyToClipboard(script.empathicScript, 'Empathic')}
                                className="border-green-300 hover:bg-green-100"
                              >
                                {copiedScript === 'Empathic' ? (
                                  <CheckCircle className="h-4 w-4 text-green-600" />
                                ) : (
                                  <Copy className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          </div>
                          <p className="text-sm text-green-800 whitespace-pre-wrap">{script.empathicScript}</p>
                        </div>
                      </div>

                      {/* Conversation Tracking Section */}
                      {script.chosenTone && (
                        <div className="mt-6 border-t pt-4">
                          <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                            <MessageCircle className="h-4 w-4" />
                            Conversation Progress
                          </h4>
                          
                          {script.receivedReply ? (
                            <div className="space-y-4">
                              <div className="bg-gray-50 p-3 rounded">
                                <h5 className="font-medium text-gray-800 mb-2">Their Reply:</h5>
                                <p className="text-sm text-gray-700 whitespace-pre-wrap">{script.receivedReply}</p>
                              </div>
                              
                              {script.followUpSuggestions ? (
                                <div className="space-y-3">
                                  <h5 className="font-medium text-gray-800">Follow-up Options:</h5>
                                  <div className="grid gap-2">
                                    {script.followUpSuggestions?.firm && (
                                      <div className="border border-red-200 bg-red-50 rounded p-2">
                                        <span className="text-xs font-medium text-red-800 mb-1 block">Firm Response:</span>
                                        <p className="text-sm text-red-800">{script.followUpSuggestions.firm}</p>
                                        <div className="flex gap-2 mt-2">
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => copyToClipboard(script.followUpSuggestions?.firm || '', 'Follow-up Firm')}
                                            className="text-xs"
                                          >
                                            <Copy className="h-3 w-3 mr-1" /> Copy
                                          </Button>
                                          <Button
                                            size="sm"
                                            onClick={() => saveFollowUpResponse(script, 'firm', script.followUpSuggestions?.firm || '')}
                                            className="text-xs bg-red-600 hover:bg-red-700 text-white"
                                          >
                                            <Check className="h-3 w-3 mr-1" /> Mark as Used
                                          </Button>
                                        </div>
                                      </div>
                                    )}
                                    {script.followUpSuggestions?.neutral && (
                                      <div className="border border-blue-200 bg-blue-50 rounded p-2">
                                        <span className="text-xs font-medium text-blue-800 mb-1 block">Neutral Response:</span>
                                        <p className="text-sm text-blue-800">{script.followUpSuggestions.neutral}</p>
                                        <div className="flex gap-2 mt-2">
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => copyToClipboard(script.followUpSuggestions?.neutral || '', 'Follow-up Neutral')}
                                            className="text-xs"
                                          >
                                            <Copy className="h-3 w-3 mr-1" /> Copy
                                          </Button>
                                          <Button
                                            size="sm"
                                            onClick={() => saveFollowUpResponse(script, 'neutral', script.followUpSuggestions?.neutral || '')}
                                            className="text-xs bg-blue-600 hover:bg-blue-700 text-white"
                                          >
                                            <Check className="h-3 w-3 mr-1" /> Mark as Used
                                          </Button>
                                        </div>
                                      </div>
                                    )}
                                    {script.followUpSuggestions?.empathic && (
                                      <div className="border border-green-200 bg-green-50 rounded p-2">
                                        <span className="text-xs font-medium text-green-800 mb-1 block">Empathic Response:</span>
                                        <p className="text-sm text-green-800">{script.followUpSuggestions.empathic}</p>
                                        <div className="flex gap-2 mt-2">
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => copyToClipboard(script.followUpSuggestions?.empathic || '', 'Follow-up Empathic')}
                                            className="text-xs"
                                          >
                                            <Copy className="h-3 w-3 mr-1" /> Copy
                                          </Button>
                                          <Button
                                            size="sm"
                                            onClick={() => saveFollowUpResponse(script, 'empathic', script.followUpSuggestions?.empathic || '')}
                                            className="text-xs bg-green-600 hover:bg-green-700 text-white"
                                          >
                                            <Check className="h-3 w-3 mr-1" /> Mark as Used
                                          </Button>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ) : (
                                <Button
                                  onClick={() => generateFollowUpSuggestions(script)}
                                  disabled={generatingFollowUp}
                                  className="bg-purple-600 hover:bg-purple-700 text-white"
                                >
                                  {generatingFollowUp ? (
                                    <>
                                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                      Generating Follow-ups...
                                    </>
                                  ) : (
                                    <>
                                      <Sparkles className="h-4 w-4 mr-2" />
                                      Get Follow-up Suggestions
                                    </>
                                  )}
                                </Button>
                              )}
                            </div>
                          ) : (
                            <Button
                              onClick={() => {
                                setSelectedScript(script);
                                setReplyDialogOpen(true);
                              }}
                              variant="outline"
                              className="border-purple-300 text-purple-700 hover:bg-purple-50"
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              Add Their Reply
                            </Button>
                          )}

                          {/* Conversation History Section */}
                          {script.receivedReply && (
                            <div className="mt-6 p-4 border-t border-gray-200">
                              <h5 className="font-medium text-gray-800 mb-3 flex items-center gap-2">
                                <MessageCircle className="h-4 w-4" />
                                Conversation History
                              </h5>
                              <ConversationHistory scriptId={script.id} />
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>

      {/* Partner Reply Dialog */}
      <Dialog open={replyDialogOpen} onOpenChange={setReplyDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Partner's Reply</DialogTitle>
            <DialogDescription>
              Record what they said in response to help generate follow-up suggestions
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="reply">Their Response</Label>
              <Textarea
                id="reply"
                placeholder="What did they say back to you?"
                value={partnerReply}
                onChange={(e) => setPartnerReply(e.target.value)}
                className="min-h-[100px]"
              />
            </div>
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                onClick={() => {
                  setReplyDialogOpen(false);
                  setPartnerReply("");
                  setSelectedScript(null);
                }}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button 
                onClick={addPartnerReply}
                disabled={!partnerReply.trim() || isUpdatingScript}
                className="flex-1"
              >
                {isUpdatingScript ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Adding...
                  </>
                ) : (
                  "Add Reply"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Footer />
    </>
  );
}