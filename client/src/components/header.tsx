import { useQuery } from "@tanstack/react-query";
import { getUserUsage } from "@/lib/openai";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { getTierDisplayName } from "@/lib/utils";
import { Link } from "wouter";
import llamaImage from "@assets/FB Profile Pic.png";
import AdminNavItem from "./admin-nav-item";
import { apiRequest } from "@/lib/queryClient";
import { Home, MessageSquare, Zap, Mic, Users, Mail, Sparkles } from "lucide-react";


export default function Header() {
  const { data: usage } = useQuery({
    queryKey: ['/api/user/usage'],
    queryFn: getUserUsage,
  });

  const { data: credits } = useQuery({
    queryKey: ["/api/user/deep-dive-credits"],
    queryFn: async () => {
      const response = await fetch("/api/user/deep-dive-credits");
      if (!response.ok) {
        if (response.status === 401) {
          return null; // Not authenticated
        }
        throw new Error("Failed to fetch credits");
      }
      return response.json();
    },
    retry: false,
  });

  const tier = usage?.tier || 'free';
  
  // Get basic usage data
  const used = usage?.used || 0;
  const limit = usage?.limit !== undefined ? usage.limit : 1;
  
  // Display the actual remaining analyses count
  const remaining = limit === null ? Infinity : Math.max(0, limit - used);
  const displayUsed = used;
  
  const isInfinite = limit === null;

  return (
    <header className="bg-primary text-white shadow-md fixed top-0 left-0 right-0 z-50 w-full">
      <div className="container mx-auto px-2 sm:px-4 py-2 sm:py-3 flex flex-wrap justify-between items-center">
        <Link href="/">
          <div className="flex items-center cursor-pointer">
            <div className="w-10 h-10 rounded-full bg-white p-0.5 flex items-center justify-center">
              <img 
                src={llamaImage}
                alt="Drama Llama Logo"
                className="w-full h-full rounded-full object-cover" 
              />
            </div>
            <h1 className="text-xl md:text-2xl font-bold text-white ml-2">Drama Llama</h1>
          </div>
        </Link>
        
        <div className="flex flex-wrap items-center justify-end">
          <nav className="flex items-center mr-2 sm:mr-4 space-x-1 sm:space-x-2">
            <Link href="/">
              <Button variant="ghost" size="sm" className="text-white hover:text-white/80 hover:bg-white/10 px-2 sm:px-3">
                <Home className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Home</span>
              </Button>
            </Link>
            <div className="hidden md:flex items-center space-x-2">
              <Link href="/chat-analysis">
                <Button variant="ghost" className="text-white hover:text-white/80 hover:bg-white/10">
                  <MessageSquare className="w-4 h-4 mr-2" /> Chat Analysis
                </Button>
              </Link>
              <Link href="/de-escalate">
                <Button variant="ghost" className="text-white hover:text-white/80 hover:bg-white/10">
                  <Zap className="w-4 h-4 mr-2" /> Vent Mode
                </Button>
              </Link>
              <Link href="/group-chat-analysis">
                <div className="relative">
                  <Button variant="ghost" className="text-white hover:text-white/80 hover:bg-white/10">
                    <Users className="w-4 h-4 mr-2" /> Group Chat
                  </Button>
                  <span className="absolute -top-2 -right-2 bg-gradient-to-r from-primary to-secondary text-[10px] text-white px-1 rounded">PRO</span>
                </div>
              </Link>
              <Link href="/live-talk">
                <div className="relative">
                  <Button variant="ghost" className="text-white hover:text-white/80 hover:bg-white/10">
                    <Mic className="w-4 h-4 mr-2" /> Live Talk
                  </Button>
                  <span className="absolute -top-2 -right-2 bg-gradient-to-r from-primary to-secondary text-[10px] text-white px-1 rounded">PRO</span>
                </div>
              </Link>
              <Link href="/contact-us">
                <Button variant="ghost" className="text-white hover:text-white/80 hover:bg-white/10">
                  <Mail className="w-4 h-4 mr-2" /> Contact Us
                </Button>
              </Link>

            </div>
          </nav>
          
          {/* Usage meter and credits - only visible on desktop */}
          <div className="hidden md:flex items-center space-x-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="text-sm bg-white/10 px-3 py-1 rounded-full flex items-center">
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

            {/* Deep Dive Credits Badge */}
            {credits && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link href="/checkout/one-time">
                      <Badge variant="outline" className="bg-purple-100 text-purple-700 border-purple-300 hover:bg-purple-200 cursor-pointer">
                        <Sparkles className="w-3 h-3 mr-1" />
                        {credits.credits} Deep Dive
                      </Badge>
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Deep Dive credits for enhanced analysis. Click to purchase more.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
          
          <div className="flex items-center space-x-1 sm:space-x-2">
            {/* Admin navigation option - only visible to admin users */}
            <AdminNavItem />
            
            {/* Main user actions - optimized for mobile */}
            <div className="flex items-center">
              {/* Query to fetch current user */}
              {(() => {
                const { data: currentUser } = useQuery<any>({
                  queryKey: ['/api/auth/user'],
                  retry: false,
                });
                
                return currentUser ? (
                  // Show user profile and logout when logged in
                  <div className="flex items-center">
                    <div className="relative group">
                      <Button variant="ghost" size="sm" className="bg-white/10 text-white whitespace-nowrap text-xs sm:text-sm px-2 sm:px-3">
                        <span className="mr-1">👤</span> {currentUser.email.split('@')[0]}
                      </Button>
                      
                      {/* Logout dropdown */}
                      <div className="absolute right-0 mt-1 w-40 bg-white rounded-md shadow-lg z-50 hidden group-hover:block">
                        <div className="py-1">
                          <a 
                            href="#" 
                            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            onClick={async (e) => {
                              e.preventDefault();
                              try {
                                await apiRequest("POST", "/api/auth/logout");
                                window.location.href = "/";
                              } catch (error) {
                                console.error("Logout failed:", error);
                              }
                            }}
                          >
                            Log out
                          </a>
                        </div>
                      </div>
                    </div>
                    
                    {tier === 'free' && (
                      <Link href="/subscription" className="ml-1 sm:ml-2">
                        <Button variant="secondary" size="sm" className="whitespace-nowrap text-xs sm:text-sm px-2 sm:px-3">
                          Upgrade
                        </Button>
                      </Link>
                    )}
                  </div>
                ) : (
                  // Show login button when not logged in
                  <div className="flex items-center">
                    <Link href="/auth">
                      <Button variant="outline" size="sm" className="bg-transparent text-white border-white hover:bg-white/10 whitespace-nowrap text-xs sm:text-sm px-2 sm:px-3">
                        Log in
                      </Button>
                    </Link>
                    
                    {tier === 'free' && (
                      <Link href="/subscription" className="ml-1 sm:ml-2">
                        <Button variant="secondary" size="sm" className="whitespace-nowrap text-xs sm:text-sm px-2 sm:px-3">
                          Upgrade
                        </Button>
                      </Link>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
