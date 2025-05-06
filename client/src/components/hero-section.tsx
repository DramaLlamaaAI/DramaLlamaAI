import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { BadgeInfo, Flag, BarChart2 } from "lucide-react";
import llamaImage from "@assets/FB Profile Pic.png"; 

export default function HeroSection() {
  return (
    <div className="mb-10">
      <Card className="rounded-2xl shadow-lg overflow-hidden border-0">
        <div className="grid md:grid-cols-2">
          <CardContent className="p-6 md:p-10 bg-primary text-white">
            <h2 className="text-3xl font-bold mb-4 text-white">They gaslight. We spotlight.</h2>
            <p className="text-lg text-white/80 mb-6">
              Drama Llama uses AI to analyze conversations, detect emotional tones, and provide clarity on communication dynamics.
            </p>
            
            <div className="flex flex-wrap gap-3 mb-8">
              <div className="bg-white/10 rounded-full px-4 py-1 text-sm border border-white/20 flex items-center text-white">
                <BadgeInfo className="w-4 h-4 mr-1" /> Emotional tone
              </div>
              <div className="bg-white/10 rounded-full px-4 py-1 text-sm border border-white/20 flex items-center text-white">
                <Flag className="w-4 h-4 mr-1" /> Red flags
              </div>
              <div className="bg-white/10 rounded-full px-4 py-1 text-sm border border-white/20 flex items-center text-white">
                <BarChart2 className="w-4 h-4 mr-1" /> Communication patterns
              </div>
            </div>
            
            <div className="flex flex-wrap space-x-0 space-y-2 sm:space-x-4 sm:space-y-0">
              <Button size="lg" className="w-full sm:w-auto bg-secondary hover:bg-secondary-dark text-white">
                Get Started
              </Button>
              <Button size="lg" className="w-full sm:w-auto bg-blue-500 hover:bg-blue-600 text-white border-0">
                How It Works
              </Button>
            </div>
          </CardContent>
          
          <div className="hidden md:flex bg-primary items-center justify-center p-6">
            <div className="relative w-full h-full flex items-center justify-center">
              <img 
                src={llamaImage} 
                alt="Drama Llama" 
                className="max-w-full max-h-[300px] object-contain" 
              />
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
