import { useQuery } from "@tanstack/react-query";
import { getUserUsage } from "@/lib/openai";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { getTierDisplayName } from "@/lib/utils";
import { Link } from "wouter";
import llamaImage from "@assets/FB Profile Pic.png";

export default function Header() {
  const { data: usage } = useQuery({
    queryKey: ['/api/user/usage'],
    queryFn: getUserUsage,
  });

  const tier = usage?.tier || 'free';
  
  // Get basic usage data
  const used = usage?.used || 0;
  const limit = usage?.limit || 1;
  
  // For free tier, initially show "1/1" when no analyses used,
  // but show "0/1" after they've used their free analysis
  const displayUsed = tier === 'free' && used === 0 ? 1 - used : used;
  
  const isInfinite = limit === Infinity;

  return (
    <header className="bg-primary text-white shadow-md sticky top-0 z-10">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <Link href="/">
          <div className="flex items-center cursor-pointer">
            <div className="w-10 h-10 rounded-full overflow-hidden">
              <img 
                src={llamaImage}
                alt="Drama Llama Logo"
                className="w-full h-full object-cover" 
              />
            </div>
            <h1 className="text-xl md:text-2xl font-bold text-white ml-2">Drama Llama</h1>
          </div>
        </Link>
        
        <div className="flex items-center">
          <nav className="hidden md:flex items-center mr-6 space-x-4">
            <Link href="/">
              <span className="text-white hover:text-white/80 transition">Home</span>
            </Link>
            <Link href="/chat-analysis">
              <span className="text-white hover:text-white/80 transition">Chat Analysis</span>
            </Link>
            <Link href="/message-analysis">
              <span className="text-white hover:text-white/80 transition">Message Analysis</span>
            </Link>
            <Link href="/vent-mode">
              <span className="text-white hover:text-white/80 transition">Vent Mode</span>
            </Link>
          </nav>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="mr-4 text-sm bg-white/10 px-3 py-1 rounded-full">
                  <span className="text-white/80 mr-1">{getTierDisplayName(tier)}</span>
                  <span className="text-white font-semibold">
                    {displayUsed}/{isInfinite ? '∞' : limit}
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Your usage this month</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <div className="flex items-center space-x-2">
            <Link href="/auth">
              <Button variant="outline" size="sm" className="bg-transparent text-white border-white hover:bg-white/10">
                Sign up / Log in
              </Button>
            </Link>
            
            {tier === 'free' && (
              <Link href="/subscription">
                <Button variant="secondary" size="sm">
                  Upgrade
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
