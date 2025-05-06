import { useQuery } from "@tanstack/react-query";
import { getUserUsage } from "@/lib/openai";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { getTierDisplayName } from "@/lib/utils";
import { Link } from "wouter";

export default function Header() {
  const { data: usage } = useQuery({
    queryKey: ['/api/user/usage'],
    queryFn: getUserUsage,
  });

  const tier = usage?.tier || 'free';
  const used = usage?.used || 0;
  const limit = usage?.limit || 1;
  
  const isInfinite = limit === Infinity;

  return (
    <header className="bg-primary text-white shadow-md sticky top-0 z-10">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <Link href="/">
          <div className="flex items-center cursor-pointer">
            <div className="bg-white/10 p-2 rounded-full">
              <svg 
                width="28" 
                height="28" 
                viewBox="0 0 64 64" 
                fill="none" 
                xmlns="http://www.w3.org/2000/svg"
                className="text-white"
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
            <h1 className="text-xl md:text-2xl font-bold text-white ml-2">Drama Llama</h1>
          </div>
        </Link>
        
        <div className="flex items-center">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="mr-4 text-sm bg-white/10 px-3 py-1 rounded-full">
                  <span className="text-white/80 mr-1">{getTierDisplayName(tier)}</span>
                  <span className="text-white font-semibold">
                    {used}/{isInfinite ? '∞' : limit}
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Your usage this month</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          {tier === 'free' && (
            <Button variant="secondary" size="sm">
              Upgrade
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
