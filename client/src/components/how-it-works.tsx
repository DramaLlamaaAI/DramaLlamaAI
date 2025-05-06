import { Card, CardContent } from "@/components/ui/card";
import { Upload, Sparkles, FileBarChart } from "lucide-react";

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="mb-12 bg-white rounded-xl shadow-lg p-6">
      <h2 className="text-2xl font-bold mb-6 text-center">How Drama Llama Works</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="text-center">
          <div className="bg-primary/10 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
            <Upload className="h-8 w-8 text-primary" />
          </div>
          <h3 className="font-semibold mb-2">1. Share Communication</h3>
          <p className="text-muted-foreground">Paste text, upload files, or capture screenshots of your conversations.</p>
        </div>
        
        <div className="text-center">
          <div className="bg-primary/10 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
            <Sparkles className="h-8 w-8 text-primary" />
          </div>
          <h3 className="font-semibold mb-2">2. AI Analysis</h3>
          <p className="text-muted-foreground">Our AI analyzes tone, patterns, and emotional indicators in the conversation.</p>
        </div>
        
        <div className="text-center">
          <div className="bg-primary/10 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
            <FileBarChart className="h-8 w-8 text-primary" />
          </div>
          <h3 className="font-semibold mb-2">3. Get Insights</h3>
          <p className="text-muted-foreground">Receive clear insights about emotional tones, red flags, and communication patterns.</p>
        </div>
      </div>
      
      <div className="mt-8 bg-muted rounded-lg p-5">
        <div className="flex items-start md:items-center flex-col md:flex-row">
          <div className="mb-4 md:mb-0 md:mr-6">
            <div className="bg-primary/10 rounded-full p-3">
              <svg 
                width="48" 
                height="48" 
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
