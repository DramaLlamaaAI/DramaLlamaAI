import { Home } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

interface BackHomeButtonProps {
  className?: string;
}

export default function BackHomeButton({ className = "" }: BackHomeButtonProps) {
  return (
    <div className={`${className}`}>
      <Link href="/">
        <Button 
          variant="outline" 
          size="sm" 
          className="flex items-center bg-white shadow-sm border-primary text-primary hover:bg-primary/5"
        >
          <Home className="h-4 w-4 mr-1" />
          Back to Home
        </Button>
      </Link>
    </div>
  );
}