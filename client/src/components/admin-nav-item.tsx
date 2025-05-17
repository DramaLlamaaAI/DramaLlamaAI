import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Settings } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';

export default function AdminNavItem() {
  // Use our centralized auth hook instead of making a separate query
  const { user, isLoading, isAdmin } = useAuth();

  // Debug info to troubleshoot admin visibility
  console.log("Admin nav item check:", { 
    email: user?.email, 
    isLoading, 
    isAdmin
  });

  // If still loading, don't show anything yet
  if (isLoading) {
    return null;
  }
  
  // Only show admin link if user exists and has admin privileges
  if (!user || !isAdmin) {
    return null;
  }
  
  // Force displaying the admin link for debugging purposes
  console.log("Showing admin nav item for:", user.email);

  return (
    <Link href="/admin">
      <Button variant="ghost" size="sm" className="flex items-center gap-1">
        <Settings className="h-4 w-4" />
        <span>Admin</span>
      </Button>
    </Link>
  );
}