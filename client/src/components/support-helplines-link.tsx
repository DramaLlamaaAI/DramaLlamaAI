import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { HelpCircle } from 'lucide-react';
import SupportHelpLinesDialog from './support-helplines-dialog';

interface SupportHelpLinesLinkProps {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  textOnly?: boolean;
  className?: string;
}

const SupportHelpLinesLink: React.FC<SupportHelpLinesLinkProps> = ({
  variant = 'secondary',
  size = 'default',
  textOnly = false,
  className = '',
}) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  
  if (textOnly) {
    return (
      <>
        <button 
          onClick={() => setDialogOpen(true)} 
          className={`text-primary hover:underline flex items-center gap-1 ${className}`}
        >
          <HelpCircle size={16} />
          <span>Support Helplines</span>
        </button>
        <SupportHelpLinesDialog open={dialogOpen} onOpenChange={setDialogOpen} />
      </>
    );
  }

  return (
    <>
      <Button 
        variant={variant} 
        size={size} 
        onClick={() => setDialogOpen(true)} 
        className={className}
      >
        <HelpCircle size={size === 'sm' ? 14 : 16} className="mr-2" />
        <span>Support Helplines</span>
      </Button>
      <SupportHelpLinesDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </>
  );
};

export default SupportHelpLinesLink;