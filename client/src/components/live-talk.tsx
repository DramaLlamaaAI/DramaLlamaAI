import { useState, useRef, useEffect } from "react";
import { Mic, MicOff, Loader2, Play, Square, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { useUserTier } from "@/hooks/use-user-tier";
import { useToast } from "@/hooks/use-toast";

export default function LiveTalk() {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [transcript, setTranscript] = useState("");
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [participants, setParticipants] = useState<{me: string, them: string}>({me: "", them: ""});
  const [showParticipantsPrompt, setShowParticipantsPrompt] = useState(false);
  
  const { tier, canUseFeature } = useUserTier();
  const { toast } = useToast();
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  // Check for browser compatibility
  const isMediaRecorderSupported = 'MediaRecorder' in window;

  // Function to handle starting the recording
  const startRecording = async () => {
    if (!canUseFeature) {
      toast({
        title: "Pro Feature",
        description: "Live Talk recording is only available on the Pro plan. Please upgrade to access this feature.",
        variant: "destructive"
      });
      return;
    }
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        setAudioBlob(audioBlob);
        
        // Create URL for playback
        if (audioRef.current) {
          audioRef.current.src = URL.createObjectURL(audioBlob);
        }
      };
      
      // Start recording
      audioChunksRef.current = [];
      mediaRecorderRef.current.start();
      setIsRecording(true);
      
      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
    } catch (error) {
      console.error('Error accessing microphone:', error);
      toast({
        title: "Microphone Error",
        description: "Unable to access your microphone. Please check your browser permissions and try again.",
        variant: "destructive"
      });
    }
  };
  
  // Function to pause/resume recording
  const togglePause = () => {
    if (!mediaRecorderRef.current) return;
    
    if (isPaused) {
      // Resume recording
      mediaRecorderRef.current.resume();
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } else {
      // Pause recording
      mediaRecorderRef.current.pause();
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
    
    setIsPaused(!isPaused);
  };

  // Function to stop recording
  const stopRecording = () => {
    if (!mediaRecorderRef.current) return;
    
    mediaRecorderRef.current.stop();
    
    // Stop all tracks on the stream
    mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    
    // Clear the timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    setIsRecording(false);
    setIsPaused(false);
    setShowParticipantsPrompt(true);
  };
  
  // Format seconds into MM:SS
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Simulated transcription for now - in a real app, this would call a speech-to-text API
  const transcribeAudio = async () => {
    if (!audioBlob) return;
    
    setIsTranscribing(true);
    
    try {
      // In a real implementation, this would be replaced with an actual API call
      // to a service like OpenAI Whisper or similar for speech-to-text
      const formData = new FormData();
      formData.append('audio', audioBlob);
      
      // Simulate API call with a timeout
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // For demo purposes, we'll use a simulated transcript
      const simulatedTranscript = 
      `Person 1: Hi there, how have you been?
Person 2: I've been really busy with work lately. It feels like you don't check in as much anymore.
Person 1: I'm sorry you feel that way. I've had a lot going on too, but I do care about staying in touch.
Person 2: Well, it doesn't always seem like it. Sometimes I feel like I'm the only one making an effort.
Person 1: I didn't realize you felt that way. I should be better about reaching out.
Person 2: I appreciate you saying that. I miss our regular chats.
Person 1: Me too. Let's make more time for each other.`;
      
      setTranscript(simulatedTranscript);
    } catch (error) {
      console.error('Error transcribing audio:', error);
      toast({
        title: "Transcription Error",
        description: "We encountered an error while transcribing your conversation. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsTranscribing(false);
    }
  };
  
  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  return (
    <section className="mb-12">
      <Card className="relative overflow-hidden border-2 border-transparent">
        {!canUseFeature && (
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-10">
            <div className="bg-white p-6 rounded-lg shadow-lg max-w-md text-center">
              <Badge className="mb-2 bg-gradient-to-r from-primary to-secondary">PRO ONLY</Badge>
              <h3 className="text-xl font-bold mb-2">Live Talk Recording</h3>
              <p className="mb-4 text-muted-foreground">Upgrade to our Pro plan to unlock live conversation recording and analysis.</p>
              <Button className="w-full" style={{ background: 'linear-gradient(90deg, #22C9C9, #FF69B4)', color: 'white', border: 'none' }}>
                Upgrade Now
              </Button>
            </div>
          </div>
        )}
        
        <CardHeader className="bg-gradient-to-r from-primary/20 to-secondary/20">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl font-bold">Live Talk Analysis</CardTitle>
              <CardDescription>Record and analyze conversations in real-time</CardDescription>
            </div>
            <Badge className="bg-gradient-to-r from-primary to-secondary border-0">PRO</Badge>
          </div>
        </CardHeader>
        
        <CardContent className="p-6">
          {!isMediaRecorderSupported ? (
            <Alert className="mb-4 bg-amber-50 border-amber-200">
              <AlertDescription className="text-amber-700">
                Your browser doesn't support audio recording. Please try a modern browser like Chrome, Firefox, or Safari.
              </AlertDescription>
            </Alert>
          ) : null}
          
          <div className="mb-6 space-y-4">
            {!isRecording && !transcript && (
              <div className="text-center p-8 border border-dashed border-gray-300 rounded-lg bg-gray-50">
                <Mic className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="font-medium text-lg mb-2">Ready to Record</h3>
                <p className="text-muted-foreground mb-4">Capture your conversation for AI-powered analysis</p>
                <Button 
                  onClick={startRecording}
                  disabled={!isMediaRecorderSupported || !canUseFeature}
                  className="bg-primary hover:bg-primary/90"
                >
                  Start Recording
                </Button>
              </div>
            )}
            
            {isRecording && (
              <div className="text-center p-6 bg-red-50 border border-red-100 rounded-lg">
                <div className="flex items-center justify-center">
                  <div className="relative">
                    <div className="animate-ping absolute inline-flex h-16 w-16 rounded-full bg-red-400 opacity-25"></div>
                    <Mic className="relative h-16 w-16 text-red-500" />
                  </div>
                </div>
                <div className="mt-4 mb-6">
                  <span className="text-3xl font-mono font-bold">{formatTime(recordingTime)}</span>
                </div>
                <div className="flex items-center justify-center space-x-4">
                  <Button
                    onClick={togglePause}
                    variant="outline"
                    className="rounded-full w-12 h-12 p-0 border-2"
                  >
                    {isPaused ? <Play className="h-6 w-6" /> : <Volume2 className="h-6 w-6" />}
                  </Button>
                  
                  <Button
                    onClick={stopRecording}
                    variant="destructive"
                    className="rounded-full w-12 h-12 p-0"
                  >
                    <Square className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            )}
            
            {audioBlob && !transcript && (
              <div className="p-4 border border-gray-200 rounded-lg bg-gray-50">
                <h3 className="font-medium mb-3">Recording Complete</h3>
                <audio ref={audioRef} controls className="w-full mb-4" />
                
                {showParticipantsPrompt ? (
                  <div className="mb-4">
                    <Button
                      onClick={transcribeAudio}
                      disabled={isTranscribing}
                      className="w-full bg-primary hover:bg-primary/90"
                    >
                      {isTranscribing ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Transcribing...
                        </>
                      ) : (
                        "Transcribe Audio"
                      )}
                    </Button>
                  </div>
                ) : null}
              </div>
            )}
            
            {transcript && (
              <div className="p-4 border border-gray-200 rounded-lg">
                <h3 className="font-medium mb-3">Transcript</h3>
                <div className="whitespace-pre-line bg-white p-3 rounded border border-gray-200 max-h-60 overflow-y-auto mb-4">
                  {transcript}
                </div>
                
                <Button className="w-full bg-primary hover:bg-primary/90">
                  Analyze Conversation
                </Button>
              </div>
            )}
          </div>
        </CardContent>
        
        <CardFooter className="bg-gray-50 border-t border-gray-200 p-4">
          <div className="text-sm text-muted-foreground w-full text-center">
            <p>Your recordings are processed securely and not stored permanently on our servers.</p>
          </div>
        </CardFooter>
      </Card>
    </section>
  );
}