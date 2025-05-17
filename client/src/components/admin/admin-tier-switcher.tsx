import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue 
} from '@/components/ui/select';
import type { Tier } from '@/lib/trial-utils';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

/**
 * A special tier switcher for the admin user only - for testing purposes
 */
export function AdminTierSwitcher() {
  const { user, isLoading } = useAuth();
  const [currentTier, setCurrentTier] = useState<Tier | null>(null);
  const { toast } = useToast();
  const [visible, setVisible] = useState(false);
  
  // Only show for the admin@dramallamaconsultancy.com account
  const isAdminEmail = user?.email === 'dramallamaconsultancy@gmail.com';
  
  useEffect(() => {
    if (user?.tier) {
      setCurrentTier(user.tier as Tier);
    }
  }, [user]);
  
  if (isLoading || !isAdminEmail) return null;
  
  // Toggle visibility with the keyboard shortcut (Ctrl+Shift+T)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'T') {
        e.preventDefault();
        setVisible(prev => !prev);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
  
  if (!visible) return null;
  
  const handleTierChange = async (tier: Tier) => {
    try {
      if (!user?.id) return;
      
      await apiRequest('PUT', `/api/admin/user/tier`, {
        userId: user.id,
        tier
      });
      
      setCurrentTier(tier);
      
      toast({
        title: 'Tier updated',
        description: `Your tier has been updated to ${tier}.`,
      });
      
      // Reload the page to apply the new tier
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      toast({
        title: 'Failed to update tier',
        description: 'There was an error updating your tier.',
        variant: 'destructive',
      });
    }
  };
  
  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Card className="w-72 shadow-lg border-primary/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Admin Tier Testing</CardTitle>
          <CardDescription className="text-xs">
            Change your tier for testing purposes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select 
            value={currentTier || undefined} 
            onValueChange={(value) => handleTierChange(value as Tier)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select tier" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="free">Free</SelectItem>
              <SelectItem value="personal">Personal</SelectItem>
              <SelectItem value="pro">Pro</SelectItem>
              <SelectItem value="instant">Instant</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>
    </div>
  );
}