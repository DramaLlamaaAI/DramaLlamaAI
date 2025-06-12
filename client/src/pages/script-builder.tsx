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
import { Loader2, Edit3, Copy, CheckCircle, AlertCircle, Heart, Shield, Save, BookOpen } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import Header from "@/components/header";
import Footer from "@/components/footer";
import { Helmet } from "react-helmet-async";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const scriptBuilderSchema = z.object({
  situation: z.string().min(10, "Please describe the situation in more detail"),
  message: z.string().min(5, "Please enter what you want to say"),
});

type ScriptBuilderForm = z.infer<typeof scriptBuilderSchema>;

interface ScriptResponse {
  firm: string;
  neutral: string;
  empathic: string;
  situationAnalysis: string;
}

export default function ScriptBuilder() {
  const [isLoading, setIsLoading] = useState(false);
  const [scripts, setScripts] = useState<ScriptResponse | null>(null);
  const [copiedScript, setCopiedScript] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [saveTitle, setSaveTitle] = useState("");
  const { toast } = useToast();
  const { user } = useAuth();

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
      await apiRequest("/api/scripts/save", "POST", {
        title: saveTitle.trim(),
        situation: formData.situation,
        originalMessage: formData.message,
        firmScript: scripts.firm,
        neutralScript: scripts.neutral,
        empathicScript: scripts.empathic,
        situationAnalysis: scripts.situationAnalysis,
      });

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
      </main>

      <Footer />
    </>
  );
}