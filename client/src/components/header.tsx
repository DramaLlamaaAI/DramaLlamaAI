import { useQuery } from "@tanstack/react-query";
import { getUserUsage } from "@/lib/openai";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { getTierDisplayName } from "@/lib/utils";
import { Link } from "wouter";
import llamaImage from "@assets/FB Profile Pic.png";
import AdminNavItem from "./admin-nav-item";

export default function Header() {
  const { data: usage } = useQuery({
    queryKey: ['/api/user/usage'],
    queryFn: getUserUsage,
  });

  const tier = usage?.tier || 'free';
  
  // Get basic usage data
  const used = usage?.used || 0;
  const limit = usage?.limit || 1;
  
  // Display the actual remaining analyses count
  const remaining = Math.max(0, limit - used);
  const displayUsed = used;
  
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
            <Link href="/de-escalate">
              <span className="text-white hover:text-white/80 transition">De-escalate</span>
            </Link>
          </nav>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="mr-4 text-sm bg-white/10 px-3 py-1 rounded-full flex items-center">
                  <span className="text-white/80 mr-1">{getTierDisplayName(tier)}</span>
                  
                  {/* Visual progress indicator */}
                  {!isInfinite && (
                    <div className="relative w-16 h-4 bg-white/20 rounded-full overflow-hidden mr-2">
                      <div 
                        className="absolute left-0 top-0 h-full bg-white/60 rounded-full" 
                        style={{width: `${Math.min(100, (displayUsed / limit) * 100)}%`}}
                      />
                      <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold">
                        {remaining} left
                      </div>
                    </div>
                  )}
                  
                  <span className="text-white font-semibold">
                    {displayUsed}/{isInfinite ? '∞' : limit}
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>You have {remaining} analysis{remaining !== 1 ? 'es' : ''} remaining this month</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <div className="flex items-center space-x-2">
            {/* Admin navigation option - only visible to admin users */}
            <AdminNavItem />
            
            {/* Main user actions - better aligned for mobile */}
            <div className="flex">
              <Link href="/auth">
                <Button variant="outline" size="sm" className="bg-transparent text-white border-white hover:bg-white/10">
                  Sign up / Log in
                </Button>
              </Link>
              
              {tier === 'free' && (
                <Link href="/subscription">
                  <Button variant="secondary" size="sm" className="ml-2">
                    Upgrade
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
