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
import { Loader2, Edit3, Copy, CheckCircle, AlertCircle, Heart, Shield, Save, BookOpen, Trash2, Calendar, Clock, MessageCircle, MessageSquare, Plus, Sparkles, Check } from "lucide-react";
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
  const [replyText, setReplyText] = useState("");
  const [isUpdatingScript, setIsUpdatingScript] = useState(false);
  const [generatingFollowUp, setGeneratingFollowUp] = useState(false);
  const [expandedScript, setExpandedScript] = useState<number | null>(null);
  const [myNewMessage, setMyNewMessage] = useState("");
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
    // Check if user is authenticated
    if (!user) {
      toast({
        title: "Registration Required",
        description: (
          <div className="space-y-2">
            <p>The Boundary Builder is for registered users only.</p>
            <p className="text-sm font-medium">🎉 FREE for registered users for a limited time!</p>
            <Link href="/auth" className="text-blue-600 hover:text-blue-800 underline font-medium">
              Click here to register →
            </Link>
          </div>
        ),
        variant: "destructive",
      });
      return;
    }

    // Check if user has access (beta tier or higher)
    if (user.tier === 'free') {
      toast({
        title: "Beta Tier Required",
        description: (
          <div className="space-y-2">
            <p>The Boundary Builder requires Beta Tier access.</p>
            <p className="text-sm font-medium">🎉 FREE Beta Tier upgrade available for registered users!</p>
            <p className="text-sm text-gray-600">Contact support for your free Beta Tier upgrade.</p>
          </div>
        ),
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await apiRequest("POST", "/api/script-builder", {
        situation: data.situation,
        message: data.message,
      });

      if (!response.ok) {
        throw new Error("Failed to generate scripts");
      }

      const result = await response.json();
      setScripts(result);

      toast({
        title: "Scripts generated successfully!",
        description: "Review the three different approaches and choose what works best.",
      });
    } catch (error) {
      toast({
        title: "Generation failed",
        description: "Failed to generate scripts. Please try again.",
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
      setTimeout(() => setCopiedScript(null), 2000);
      
      toast({
        title: "Copied to clipboard",
        description: `${scriptType} script copied successfully`,
      });
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "Failed to copy to clipboard",
        variant: "destructive",
      });
    }
  };

  const saveScript = async () => {
    if (!scripts || !saveTitle.trim()) return;

    setIsSaving(true);
    try {
      await apiRequest("POST", "/api/scripts/save", {
        title: saveTitle.trim(),
        situation: form.getValues('situation'),
        originalMessage: form.getValues('message'),
        firmScript: scripts.firm,
        neutralScript: scripts.neutral,
        empathicScript: scripts.empathic,
        situationAnalysis: scripts.situationAnalysis,
      });

      queryClient.invalidateQueries({ queryKey: ['/api/scripts'] });

      toast({
        title: "Script saved successfully!",
        description: "You can find it in your saved scripts tab",
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

  const addPartnerReply = async (scriptId?: number) => {
    // If called with scriptId, use inline reply; otherwise use dialog
    const targetScript = scriptId ? savedScripts.find(s => s.id === scriptId) : selectedScript;
    const replyMessage = scriptId ? replyText : partnerReply;
    
    if (!targetScript || !replyMessage.trim()) return;

    setIsUpdatingScript(true);
    try {
      await apiRequest("PUT", `/api/scripts/${targetScript.id}`, {
        receivedReply: replyMessage.trim(),
        status: 'replied'
      });

      // Generate follow-up suggestions automatically
      const response = await apiRequest("POST", "/api/scripts/follow-up", {
        scriptId: targetScript.id,
        originalSituation: targetScript.situation,
        yourMessage: targetScript.chosenTone === 'firm' ? targetScript.firmScript : 
                     targetScript.chosenTone === 'neutral' ? targetScript.neutralScript : 
                     targetScript.empathicScript,
        partnerReply: replyMessage.trim(),
        previousTone: targetScript.chosenTone
      });

      if (response.ok) {
        const followUpData = await response.json();
        await apiRequest("PUT", `/api/scripts/${targetScript.id}`, {
          followUpSuggestions: followUpData
        });
      }

      queryClient.invalidateQueries({ queryKey: ['/api/scripts'] });

      toast({
        title: "Reply added & follow-ups generated",
        description: "Partner's reply recorded and follow-up suggestions are ready",
      });

      if (scriptId) {
        setReplyText("");
      } else {
        setReplyDialogOpen(false);
        setPartnerReply("");
        setSelectedScript(null);
      }
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
      const conversationResponse = await apiRequest("GET", `/api/scripts/${script.id}/conversation`);
      const existingMessages = await conversationResponse.json();
      const messageIndex = existingMessages.length + 1;

      await apiRequest("POST", `/api/scripts/${script.id}/conversation`, {
        yourMessage: message,
        chosenTone: tone,
        messageIndex,
        followUpSuggestions: null,
        isActive: true
      });

      await apiRequest("PUT", `/api/scripts/${script.id}`, {
        status: 'sent'
      });

      queryClient.invalidateQueries({ queryKey: ['/api/scripts'] });

      toast({
        title: "Response saved",
        description: `Your ${tone} response has been saved and tracked`,
      });

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

  return (
    <>
      <Helmet>
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
            <TabsTrigger value="saved">Saved Scripts ({savedScripts.length})</TabsTrigger>
          </TabsList>
          
          <TabsContent value="create" className="space-y-6">
            {user?.tier === 'free' && (
              <Card className="border-amber-200 bg-amber-50">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-amber-600 mt-1" />
                    <div className="flex-1">
                      <h4 className="font-medium text-amber-900 mb-1">Free Tier Limitation</h4>
                      <p className="text-sm text-amber-800 mb-3">
                        You have access to basic script generation. Upgrade to Personal+ for unlimited scripts, 
                        conversation tracking, and advanced features.
                      </p>
                      <Link href="/pricing">
                        <Button className="bg-amber-600 hover:bg-amber-700 text-white">
                          Upgrade Now
                        </Button>
                      </Link>
                    </div>
                  </div>
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
                  {/* Registration Notice for Anonymous Users */}
                  {!user && (
                    <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                      <div className="flex items-start space-x-3">
                        <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
                        <div>
                          <h4 className="font-medium text-amber-800">Registration Required</h4>
                          <p className="text-sm text-amber-700 mt-1">
                            The Boundary Builder is for registered users only. 
                            <span className="font-medium"> Free for registered users for a limited time!</span>
                          </p>
                          <Link href="/auth" className="inline-flex items-center mt-2 text-sm font-medium text-amber-800 hover:text-amber-900">
                            Register now to start building better conversations →
                          </Link>
                        </div>
                      </div>
                    </div>
                  )}
                  
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
                            <div className="flex flex-wrap gap-2 mt-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => form.setValue('situation', 'My partner has been staying out late and sleeping all day, which is affecting our family responsibilities and leaving me to handle everything alone.')}
                                className="text-xs"
                              >
                                Late nights & family duties
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => form.setValue('situation', 'My colleague constantly interrupts me in meetings and dismisses my ideas, making me feel unheard and undermining my confidence at work.')}
                                className="text-xs"
                              >
                                Workplace interruptions
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => form.setValue('situation', 'My friend always cancels plans last minute or shows up very late, and I feel like my time is not being respected.')}
                                className="text-xs"
                              >
                                Friend reliability issues
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => form.setValue('situation', 'My roommate leaves messes in common areas and never cleans up after themselves, creating tension in our living situation.')}
                                className="text-xs"
                              >
                                Roommate cleanliness
                              </Button>
                            </div>
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
                            <div className="flex flex-wrap gap-2 mt-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => form.setValue('message', 'I need us to work together as a team when it comes to our family responsibilities. When you\'re sleeping all day, it leaves me handling everything alone and that\'s not sustainable.')}
                                className="text-xs"
                              >
                                Family teamwork needed
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => form.setValue('message', 'I would appreciate if you could let me finish my thoughts in meetings before jumping in. I have valuable contributions to make and would like the space to share them.')}
                                className="text-xs"
                              >
                                Request meeting respect
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => form.setValue('message', 'I value our friendship, but I need you to respect my time by sticking to our plans or giving me proper notice if something changes. It affects my whole day when plans fall through last minute.')}
                                className="text-xs"
                              >
                                Time respect needed
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => form.setValue('message', 'I need us to agree on keeping common areas clean. When dishes and messes pile up, it affects both of us and creates unnecessary stress in our living space.')}
                                className="text-xs"
                              >
                                Shared space standards
                              </Button>
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <Button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Generating Scripts...
                          </>
                        ) : (
                          <>
                            <Edit3 className="h-4 w-4 mr-2" />
                            Generate Scripts
                          </>
                        )}
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>

              {/* Generated Scripts */}
              <div className="space-y-6">
                {scripts && (
                  <>
                    {/* Analysis Card */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-purple-700">
                          <BookOpen className="h-5 w-5" />
                          Situation Analysis
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-gray-700 leading-relaxed">{scripts.situationAnalysis}</p>
                      </CardContent>
                    </Card>

                    {/* Scripts Cards */}
                    <div className="space-y-4">
                      {/* Firm Response */}
                      <Card className="border-red-200 bg-red-50">
                        <CardHeader className="pb-3">
                          <CardTitle className="flex items-center gap-2 text-red-800">
                            <Shield className="h-5 w-5" />
                            Firm Response
                            <Badge variant="secondary" className="bg-red-100 text-red-800">Direct</Badge>
                          </CardTitle>
                          <CardDescription className="text-red-700">
                            Assertive and clear boundaries
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <p className="text-red-800 leading-relaxed">{scripts.firm}</p>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => copyToClipboard(scripts.firm, 'Firm')}
                              className="border-red-300 text-red-700 hover:bg-red-100"
                            >
                              {copiedScript === 'Firm' ? (
                                <CheckCircle className="h-4 w-4 mr-1" />
                              ) : (
                                <Copy className="h-4 w-4 mr-1" />
                              )}
                              {copiedScript === 'Firm' ? 'Copied!' : 'Copy'}
                            </Button>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Neutral Response */}
                      <Card className="border-blue-200 bg-blue-50">
                        <CardHeader className="pb-3">
                          <CardTitle className="flex items-center gap-2 text-blue-800">
                            <Edit3 className="h-5 w-5" />
                            Neutral Response
                            <Badge variant="secondary" className="bg-blue-100 text-blue-800">Balanced</Badge>
                          </CardTitle>
                          <CardDescription className="text-blue-700">
                            Professional and diplomatic
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <p className="text-blue-800 leading-relaxed">{scripts.neutral}</p>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => copyToClipboard(scripts.neutral, 'Neutral')}
                              className="border-blue-300 text-blue-700 hover:bg-blue-100"
                            >
                              {copiedScript === 'Neutral' ? (
                                <CheckCircle className="h-4 w-4 mr-1" />
                              ) : (
                                <Copy className="h-4 w-4 mr-1" />
                              )}
                              {copiedScript === 'Neutral' ? 'Copied!' : 'Copy'}
                            </Button>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Empathic Response */}
                      <Card className="border-green-200 bg-green-50">
                        <CardHeader className="pb-3">
                          <CardTitle className="flex items-center gap-2 text-green-800">
                            <Heart className="h-5 w-5" />
                            Empathic Response
                            <Badge variant="secondary" className="bg-green-100 text-green-800">Caring</Badge>
                          </CardTitle>
                          <CardDescription className="text-green-700">
                            Understanding and gentle
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <p className="text-green-800 leading-relaxed">{scripts.empathic}</p>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => copyToClipboard(scripts.empathic, 'Empathic')}
                              className="border-green-300 text-green-700 hover:bg-green-100"
                            >
                              {copiedScript === 'Empathic' ? (
                                <CheckCircle className="h-4 w-4 mr-1" />
                              ) : (
                                <Copy className="h-4 w-4 mr-1" />
                              )}
                              {copiedScript === 'Empathic' ? 'Copied!' : 'Copy'}
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Save Button */}
                    <Card className="border-purple-200 bg-purple-50">
                      <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                          <Save className="h-5 w-5 text-purple-600" />
                          <div className="flex-1">
                            <h4 className="font-medium text-purple-900">Save for Later</h4>
                            <p className="text-sm text-purple-700">
                              Save these scripts to track your conversation progress
                            </p>
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
                                <DialogTitle>Save Script</DialogTitle>
                                <DialogDescription>
                                  Give your script collection a memorable name
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div>
                                  <Label htmlFor="title">Script Title</Label>
                                  <Input
                                    id="title"
                                    placeholder="e.g., 'Partner Lateness Discussion'"
                                    value={saveTitle}
                                    onChange={(e) => setSaveTitle(e.target.value)}
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
                                      "Save Script"
                                    )}
                                  </Button>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </CardContent>
                    </Card>
                  </>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="saved" className="space-y-6">
            {scriptsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                <span className="ml-2 text-gray-500">Loading saved scripts...</span>
              </div>
            ) : savedScripts.length === 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center py-8">
                    <BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <h3 className="font-medium text-gray-700 mb-2">No saved scripts yet</h3>
                    <p className="text-gray-500 mb-4">
                      Create and save your first script to track conversation progress
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {savedScripts.map((script) => (
                  <Card key={script.id} className="relative">
                    <CardHeader 
                      className="cursor-pointer hover:bg-gray-50 transition-colors"
                      onClick={() => setExpandedScript(expandedScript === script.id ? null : script.id)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="flex items-center gap-2">
                            {expandedScript === script.id ? (
                              <MessageSquare className="h-4 w-4 text-blue-600" />
                            ) : (
                              <Calendar className="h-4 w-4 text-gray-500" />
                            )}
                            {script.title}
                            <Badge 
                              variant={script.status === 'resolved' ? 'default' : 'secondary'}
                              className={
                                script.status === 'saved' ? 'bg-gray-100 text-gray-800' :
                                script.status === 'sent' ? 'bg-blue-100 text-blue-800' :
                                script.status === 'replied' ? 'bg-purple-100 text-purple-800' :
                                'bg-green-100 text-green-800'
                              }
                            >
                              {script.status}
                            </Badge>
                          </CardTitle>
                          <CardDescription className="flex items-center gap-4 mt-1">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {new Date(script.createdAt).toLocaleDateString()}
                            </span>
                            {script.chosenTone && (
                              <span className="flex items-center gap-1">
                                <MessageCircle className="h-3 w-3" />
                                Used: {script.chosenTone}
                              </span>
                            )}
                            <span className="text-xs text-gray-500">
                              {expandedScript === script.id ? 'Click to collapse' : 'Click to expand'}
                            </span>
                          </CardDescription>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteScriptMutation.mutate(script.id);
                          }}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    
                    {expandedScript === script.id && (
                    <CardContent>
                      <div className="space-y-4">
                        <div>
                          <h5 className="font-medium text-gray-800 mb-2">Situation:</h5>
                          <p className="text-sm text-gray-700">{script.situation}</p>
                        </div>

                        <div>
                          <h5 className="font-medium text-gray-800 mb-2">Your Message:</h5>
                          <p className="text-sm text-gray-700">{script.originalMessage}</p>
                        </div>

                        {/* Show all three options only if none has been chosen yet */}
                        {!script.chosenTone ? (
                          <div className="grid gap-3 md:grid-cols-3">
                            <div className="border border-red-200 bg-red-50 rounded p-3">
                              <span className="text-xs font-medium text-red-800 mb-1 block">Firm:</span>
                              <p className="text-sm text-red-800 mb-2">{script.firmScript}</p>
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => copyToClipboard(script.firmScript, 'Firm')}
                                  className="text-xs h-7"
                                >
                                  <Copy className="h-3 w-3 mr-1" /> Copy
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() => markScriptAsUsed(script.id, 'firm')}
                                  disabled={isUpdatingScript}
                                  className="text-xs h-7 bg-red-600 hover:bg-red-700 text-white"
                                >
                                  <Check className="h-3 w-3 mr-1" /> Use This
                                </Button>
                              </div>
                            </div>

                            <div className="border border-blue-200 bg-blue-50 rounded p-3">
                              <span className="text-xs font-medium text-blue-800 mb-1 block">Neutral:</span>
                              <p className="text-sm text-blue-800 mb-2">{script.neutralScript}</p>
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => copyToClipboard(script.neutralScript, 'Neutral')}
                                  className="text-xs h-7"
                                >
                                  <Copy className="h-3 w-3 mr-1" /> Copy
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() => markScriptAsUsed(script.id, 'neutral')}
                                  disabled={isUpdatingScript}
                                  className="text-xs h-7 bg-blue-600 hover:bg-blue-700 text-white"
                                >
                                  <Check className="h-3 w-3 mr-1" /> Use This
                                </Button>
                              </div>
                            </div>

                            <div className="border border-green-200 bg-green-50 rounded p-3">
                              <span className="text-xs font-medium text-green-800 mb-1 block">Empathic:</span>
                              <p className="text-sm text-green-800 mb-2">{script.empathicScript}</p>
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => copyToClipboard(script.empathicScript, 'Empathic')}
                                  className="text-xs h-7"
                                >
                                  <Copy className="h-3 w-3 mr-1" /> Copy
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() => markScriptAsUsed(script.id, 'empathic')}
                                  disabled={isUpdatingScript}
                                  className="text-xs h-7 bg-green-600 hover:bg-green-700 text-white"
                                >
                                  <Check className="h-3 w-3 mr-1" /> Use This
                                </Button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          /* Show conversation flow for used scripts */
                          <div className="space-y-4">
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                              <div className="flex items-center justify-between mb-2">
                                <h5 className="font-medium text-blue-800">You sent ({script.chosenTone}):</h5>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => copyToClipboard(
                                    script.chosenTone === 'firm' ? script.firmScript :
                                    script.chosenTone === 'neutral' ? script.neutralScript : 
                                    script.empathicScript, 
                                    'Used Script'
                                  )}
                                  className="text-xs"
                                >
                                  <Copy className="h-3 w-3 mr-1" /> Copy
                                </Button>
                              </div>
                              <p className="text-sm text-blue-700">
                                {script.chosenTone === 'firm' ? script.firmScript :
                                 script.chosenTone === 'neutral' ? script.neutralScript : 
                                 script.empathicScript}
                              </p>
                            </div>

                            {/* Conversation continuation interface */}
                            <div className="space-y-3">
                              <h5 className="font-medium text-gray-800">Continue Conversation:</h5>
                              
                              {/* Show their reply if exists */}
                              {script.receivedReply && (
                                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                                  <h6 className="font-medium text-gray-700 mb-2">They replied:</h6>
                                  <p className="text-sm text-gray-600">{script.receivedReply}</p>
                                </div>
                              )}

                              {/* Show follow-up suggestions if available */}
                              {script.receivedReply && script.followUpSuggestions && (
                                <div className="space-y-3">
                                  <h6 className="font-medium text-purple-700">Recommended Follow-up Responses:</h6>
                                  
                                  {script.followUpSuggestions.firm && (
                                    <div className="border border-red-200 bg-red-50 rounded-lg p-3">
                                      <span className="text-xs font-medium text-red-800 mb-1 block">Firm Response:</span>
                                      <p className="text-sm text-red-800 mb-2">{script.followUpSuggestions.firm}</p>
                                      <div className="flex gap-2">
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

                                  {script.followUpSuggestions.neutral && (
                                    <div className="border border-blue-200 bg-blue-50 rounded-lg p-3">
                                      <span className="text-xs font-medium text-blue-800 mb-1 block">Neutral Response:</span>
                                      <p className="text-sm text-blue-800 mb-2">{script.followUpSuggestions.neutral}</p>
                                      <div className="flex gap-2">
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

                                  {script.followUpSuggestions.empathic && (
                                    <div className="border border-green-200 bg-green-50 rounded-lg p-3">
                                      <span className="text-xs font-medium text-green-800 mb-1 block">Empathic Response:</span>
                                      <p className="text-sm text-green-800 mb-2">{script.followUpSuggestions.empathic}</p>
                                      <div className="flex gap-2">
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
                              )}

                              {/* Add their reply section */}
                              {!script.receivedReply && (
                                <div className="border border-gray-200 rounded-lg p-4">
                                  <h6 className="font-medium text-gray-700 mb-2">Add their response:</h6>
                                  <div className="space-y-2">
                                    <Textarea
                                      placeholder="What did they say back? This will help generate follow-up responses..."
                                      value={replyText}
                                      onChange={(e) => setReplyText(e.target.value)}
                                      className="min-h-[60px] resize-none text-sm"
                                    />
                                    <Button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        addPartnerReply(script.id);
                                      }}
                                      disabled={!replyText.trim() || isUpdatingScript}
                                      size="sm"
                                      className="bg-gray-600 hover:bg-gray-700 text-white"
                                    >
                                      {isUpdatingScript ? (
                                        <>
                                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                          Adding...
                                        </>
                                      ) : (
                                        <>
                                          <Plus className="h-3 w-3 mr-1" />
                                          Add Response & Generate Follow-ups
                                        </>
                                      )}
                                    </Button>
                                  </div>
                                </div>
                              )}

                              {/* Add your new message section */}
                              <div className="border border-blue-200 rounded-lg p-4">
                                <h6 className="font-medium text-blue-700 mb-2">Add your follow-up message:</h6>
                                <div className="space-y-2">
                                  <Textarea
                                    placeholder="Want to say something else? Add your message here..."
                                    value={myNewMessage}
                                    onChange={(e) => setMyNewMessage(e.target.value)}
                                    className="min-h-[60px] resize-none text-sm"
                                  />
                                  <Button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      // Handle adding user's new message
                                    }}
                                    disabled={!myNewMessage.trim()}
                                    size="sm"
                                    className="bg-blue-600 hover:bg-blue-700 text-white"
                                  >
                                    <Plus className="h-3 w-3 mr-1" />
                                    Add My Message
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                    )}
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
                onClick={(e) => {
                  e.preventDefault();
                  addPartnerReply();
                }}
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