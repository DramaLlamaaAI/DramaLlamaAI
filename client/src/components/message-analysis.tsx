import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Info, Glasses } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { analyzeMessage, MessageAnalysisResponse, getUserUsage } from "@/lib/openai";

export default function MessageAnalysis() {
  const [message, setMessage] = useState("");
  const [author, setAuthor] = useState<"me" | "them">("me");
  const [result, setResult] = useState<MessageAnalysisResponse | null>(null);
  const [charCount, setCharCount] = useState(0);
  
  const maxChars = 500;
  const { toast } = useToast();

  const { data: usage } = useQuery({
    queryKey: ['/api/user/usage'],
    queryFn: getUserUsage,
  });
  
  const usedAnalyses = usage?.used || 0;
  const limit = usage?.limit || 1;
  const canUseFeature = usedAnalyses < limit;

  const analysisMutation = useMutation({
    mutationFn: analyzeMessage,
    onSuccess: (data) => {
      setResult(data);
    },
    onError: (error) => {
      toast({
        title: "Analysis Failed",
        description: error.message || "Could not analyze message. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newMessage = e.target.value;
    if (newMessage.length <= maxChars) {
      setMessage(newMessage);
      setCharCount(newMessage.length);
    }
  };

  const handleAnalyze = () => {
    if (!canUseFeature) {
      toast({
        title: "Usage Limit Reached",
        description: `You've reached your monthly limit. Please upgrade your plan for more analyses.`,
        variant: "destructive",
      });
      return;
    }
    
    if (!message.trim()) {
      toast({
        title: "Empty Message",
        description: "Please enter a message to analyze.",
        variant: "destructive",
      });
      return;
    }
    
    analysisMutation.mutate({
      message,
      author
    });
  };

  return (
    <section id="messageAnalysis" className="mb-12">
      <Card>
        <CardContent className="p-6">
          <h2 className="text-2xl font-bold mb-4">One Message Analysis</h2>
          
          <div className="mb-6">
            <Textarea
              placeholder="Paste a single message to analyze (max 500 characters)..."
              className="w-full h-32 resize-none"
              value={message}
              onChange={handleMessageChange}
              maxLength={maxChars}
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>{charCount}/{maxChars} characters</span>
            </div>
          </div>
          
          <div className="mb-6">
            <div className="flex items-center mb-4">
              <span className="mr-4 text-foreground font-medium">Who wrote this?</span>
              <RadioGroup
                value={author}
                onValueChange={(value) => setAuthor(value as "me" | "them")}
                className="flex space-x-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="me" id="me" />
                  <Label htmlFor="me">Me</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="them" id="them" />
                  <Label htmlFor="them">Them</Label>
                </div>
              </RadioGroup>
            </div>
            
            <Button
              onClick={handleAnalyze}
              disabled={analysisMutation.isPending || message.length === 0 || !canUseFeature}
              className="flex items-center"
            >
              <Glasses className="mr-2 h-4 w-4" />
              {analysisMutation.isPending ? "Analyzing..." : "Analyze Tone & Intent"}
            </Button>
          </div>
          
          {result && (
            <div className="bg-muted p-4 rounded-lg mb-6 slide-in">
              <h3 className="font-medium mb-3">Analysis Results</h3>
              
              <div className="mb-4">
                <h4 className="text-sm font-medium text-muted-foreground">Tone</h4>
                <p className="text-lg">{result.tone}</p>
              </div>
              
              <div className="mb-4">
                <h4 className="text-sm font-medium text-muted-foreground">Possible Intent</h4>
                <ul className="list-disc list-inside">
                  {result.intent.map((intent, idx) => (
                    <li key={idx}>{intent}</li>
                  ))}
                </ul>
              </div>
              
              {result.suggestedReply && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">Suggested Reply</h4>
                  <p className="p-2 bg-background rounded border border-border mt-1">
                    {result.suggestedReply}
                  </p>
                </div>
              )}
            </div>
          )}
          
          <Alert variant="default">
            <Info className="h-4 w-4" />
            <AlertDescription>
              Single-message analysis may lack context. Interpret thoughtfully.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </section>
  );
}
