import { Upload, Sparkles, FileBarChart, Mic, BadgePlus } from "lucide-react";
import llamaImage from "@assets/FB Profile Pic.png";
import { Badge } from "@/components/ui/badge";

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="mb-12 bg-gradient-to-r from-primary/5 to-secondary/5 rounded-xl p-8">
      <div className="flex items-center justify-center gap-3 mb-6">
        <img src={llamaImage} alt="Drama Llama" className="w-12 h-12 rounded-full" />
        <h2 className="text-3xl font-bold text-primary">How Drama Llama Works</h2>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
        <div className="flex flex-col">
          <div className="bg-white rounded-lg shadow-md p-6 h-full">
            <div className="bg-primary/10 rounded-full w-16 h-16 flex items-center justify-center mb-4">
              <Upload className="h-8 w-8 text-primary" />
            </div>
            <h3 className="font-semibold mb-2 text-lg">1. Upload Your Conversation</h3>
            <p className="text-muted-foreground">Paste messages, upload a file, or snap a screenshot — whatever works for you.</p>
          </div>
        </div>
        
        <div className="flex flex-col">
          <div className="bg-white rounded-lg shadow-md p-6 h-full">
            <div className="bg-secondary/10 rounded-full w-16 h-16 flex items-center justify-center mb-4">
              <Sparkles className="h-8 w-8 text-secondary" />
            </div>
            <h3 className="font-semibold mb-2 text-lg">2. Let AI Do the Work</h3>
            <p className="text-muted-foreground">Our AI examines tone, patterns, and subtle emotional cues — no bias, no judgment.</p>
          </div>
        </div>
        
        <div className="flex flex-col">
          <div className="bg-white rounded-lg shadow-md p-6 h-full">
            <div className="bg-gradient-to-r from-primary/20 to-secondary/20 rounded-full w-16 h-16 flex items-center justify-center mb-4">
              <FileBarChart className="h-8 w-8 text-primary" />
            </div>
            <h3 className="font-semibold mb-2 text-lg">3. Get Clarity</h3>
            <p className="text-muted-foreground">Uncover red flags, emotional trends, and communication dynamics — so you can respond with confidence.</p>
          </div>
        </div>
      </div>

      <div className="mt-8 max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6 relative overflow-hidden border-2 border-primary/20">
          <div className="absolute top-0 right-0 py-1 px-3 bg-gradient-to-r from-primary to-secondary text-white text-xs font-bold rounded-bl-lg">
            PRO
          </div>
          
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="bg-primary/10 rounded-full w-16 h-16 flex items-center justify-center flex-shrink-0">
              <Mic className="h-8 w-8 text-primary" />
            </div>
            
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-lg">Live Talk Recording</h3>
                <Badge variant="outline" className="text-xs bg-primary/5 text-primary border-primary/20">NEW</Badge>
              </div>
              <p className="text-muted-foreground mb-3">Record conversations directly through your microphone and let our AI transcribe and analyze the discussion in real-time.</p>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary" className="bg-primary/10 hover:bg-primary/20 text-primary border-0">Real-time transcription</Badge>
                <Badge variant="secondary" className="bg-primary/10 hover:bg-primary/20 text-primary border-0">Automatic speaker detection</Badge>
                <Badge variant="secondary" className="bg-primary/10 hover:bg-primary/20 text-primary border-0">Instant analysis</Badge>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="mt-8 bg-white/80 rounded-lg p-5 max-w-4xl mx-auto">
        <div className="flex items-start md:items-center flex-col md:flex-row">
          <div className="mb-4 md:mb-0 md:mr-6">
            <div className="bg-primary/10 rounded-full p-3">
              <svg 
                width="36" 
                height="36" 
                viewBox="0 0 64 64" 
                fill="none" 
                xmlns="http://www.w3.org/2000/svg"
                className="text-primary"
              >
                <path d="M32 8C25.5 8 20 13.5 20 20C20 26.5 25.5 32 32 32C38.5 32 44 26.5 44 20C44 13.5 38.5 8 32 8ZM32 28C27.6 28 24 24.4 24 20C24 15.6 27.6 12 32 12C36.4 12 40 15.6 40 20C40 24.4 36.4 28 32 28Z" fill="currentColor"/>
                <path d="M54 36H10C7.8 36 6 37.8 6 40V52C6 54.2 7.8 56 10 56H54C56.2 56 58 54.2 58 52V40C58 37.8 56.2 36 54 36ZM54 52H10V40H54V52Z" fill="currentColor"/>
                <path d="M28 44H32V48H28V44Z" fill="currentColor"/>
                <path d="M36 44H52V48H36V44Z" fill="currentColor"/>
                <path d="M28 44H32V48H28V44Z" fill="currentColor"/>
                <path d="M12 44H24V48H12V44Z" fill="currentColor"/>
                <path d="M28 44H32V48H28V44Z" fill="currentColor"/>
              </svg>
            </div>
          </div>
          <div>
            <h3 className="font-semibold mb-2">Privacy & Security</h3>
            <p className="text-muted-foreground">Your conversations are analyzed securely and never stored without your permission. We use state-of-the-art security measures to protect your data.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
