import React from 'react';
import { Link } from 'wouter';
import { Button } from "@/components/ui/button";
import { HelpCircle } from 'lucide-react';

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
  if (textOnly) {
    return (
      <Link href="/support-helplines" className={`text-primary hover:underline flex items-center gap-1 ${className}`}>
        <HelpCircle size={16} />
        <span>Support Helplines</span>
      </Link>
    );
  }

  return (
    <Button variant={variant} size={size} asChild className={className}>
      <Link href="/support-helplines" className="flex items-center gap-2">
        <HelpCircle size={size === 'sm' ? 14 : 16} />
        <span>Support Helplines</span>
      </Link>
    </Button>
  );
};

export default SupportHelpLinesLink;