import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Heart } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ventMessage, VentModeResponse, getUserUsage } from "@/lib/openai";
import { useToast } from "@/hooks/use-toast";

export default function VentMode() {
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<VentModeResponse | null>(null);
  
  const { toast } = useToast();

  const { data: usage } = useQuery({
    queryKey: ['/api/user/usage'],
    queryFn: getUserUsage,
  });
  
  const usedAnalyses = usage?.used || 0;
  const limit = usage?.limit || 1;
  const canUseFeature = usedAnalyses < limit;

  const ventMutation = useMutation({
    mutationFn: ventMessage,
    onSuccess: (data) => {
      setResult(data);
    },
    onError: (error) => {
      toast({
        title: "De-escalation Failed",
        description: error.message || "Could not process your message. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleVent = () => {
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
        description: "Please enter a message to de-escalate.",
        variant: "destructive",
      });
      return;
    }
    
    ventMutation.mutate({ message });
  };

  return (
    <section id="ventMode" className="mb-12">
      <Card>
        <CardContent className="p-6">
          <h2 className="text-2xl font-bold mb-4">Vent Mode</h2>
          
          <p className="mb-6 text-muted-foreground">
            Type the emotional message you want to send, and we'll help you rewrite it in a calmer, more effective way while preserving your intent.
          </p>
          
          <div className="mb-6">
            <Textarea
              placeholder="Type your emotional message here..."
              className="w-full h-32 resize-none"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>
          
          <div className="mb-6">
            <div className="relative inline-block">
              <Button
                onClick={handleVent}
                disabled={ventMutation.isPending || message.length === 0 || !canUseFeature}
                variant="default"
                className="bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-all flex items-center pr-12 shadow-md rounded-lg"
              >
                <Heart className="mr-2 h-4 w-4" />
                {ventMutation.isPending ? "De-escalating..." : "De-escalate Message"}
                <span className="absolute -top-2 -right-2 bg-green-500 text-white text-xs px-2 py-0.5 rounded-full font-bold shadow-lg border border-white">
                  FREE
                </span>
              </Button>
            </div>
          </div>
          
          {result && (
            <div className="rounded-lg border border-border p-4 mb-6 bg-muted slide-in">
              <h3 className="font-medium mb-2 text-foreground">Calmer Version</h3>
              <p className="bg-background p-3 rounded border border-border mb-4">
                {result.rewritten}
              </p>
              
              <h4 className="text-sm font-medium text-muted-foreground mb-1">Why This Works Better</h4>
              <p className="text-sm text-muted-foreground">
                {result.explanation}
              </p>
            </div>
          )}
          
          <Alert className="bg-gradient-to-r from-primary/10 to-accent/15 border border-accent/30 rounded-lg shadow-sm">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-r from-primary to-accent p-2 rounded-full">
                <Heart className="h-4 w-4 text-white" />
              </div>
              <AlertDescription className="text-accent-foreground font-medium">
                Vent Mode helps transform emotional reactions into constructive communication.
              </AlertDescription>
            </div>
          </Alert>
        </CardContent>
      </Card>
    </section>
  );
}
