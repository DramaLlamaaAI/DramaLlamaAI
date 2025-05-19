import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { detectGroupParticipants } from "@/lib/openai";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface WhatsAppGroupParserProps {
  conversation: string;
  onParticipantsDetected: (participants: string[]) => void;
}

export default function WhatsAppGroupParser({ 
  conversation, 
  onParticipantsDetected 
}: WhatsAppGroupParserProps) {
  const [isDetecting, setIsDetecting] = useState(false);
  const [participants, setParticipants] = useState<string[]>([]);
  const { toast } = useToast();

  const handleDetectParticipants = async () => {
    if (!conversation.trim()) {
      toast({
        title: "Empty Conversation",
        description: "Please paste or upload a WhatsApp group conversation first.",
        variant: "destructive",
      });
      return;
    }

    setIsDetecting(true);
    try {
      // Use the regex-based detection for WhatsApp group chats
      const detectedParticipants = await detectGroupParticipants(conversation);
      setParticipants(detectedParticipants);
      onParticipantsDetected(detectedParticipants);
      
      toast({
        title: "Group Participants Detected",
        description: `Found ${detectedParticipants.length} participants in the WhatsApp group chat.`,
      });
    } catch (error: any) {
      toast({
        title: "Detection Failed",
        description: error.message || "Could not detect group participants. Make sure this is a WhatsApp group chat export.",
        variant: "destructive",
      });
    } finally {
      setIsDetecting(false);
    }
  };

  return (
    <Card className="mb-4">
      <CardContent className="pt-6">
        <div className="flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">WhatsApp Group Chat Participants</h3>
            <Button 
              onClick={handleDetectParticipants} 
              disabled={isDetecting || !conversation.trim()}
            >
              {isDetecting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Detecting...
                </>
              ) : "Detect Participants"}
            </Button>
          </div>
          
          {participants.length > 0 && (
            <div className="mt-2">
              <p className="text-sm text-muted-foreground mb-2">
                Found {participants.length} participants:
              </p>
              <ScrollArea className="h-24 w-full">
                <div className="flex flex-wrap gap-2">
                  {participants.map((participant, index) => (
                    <Badge key={index} variant="outline" className="py-1">
                      {participant}
                    </Badge>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}