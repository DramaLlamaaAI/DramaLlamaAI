import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Settings } from 'lucide-react';

// Interface for current user
interface CurrentUser {
  id: number;
  email: string;
  isAdmin: boolean;
}

export default function AdminNavItem() {
  // Query to fetch current user
  const { data: currentUser, isLoading, error } = useQuery<CurrentUser | null>({
    queryKey: ['/api/auth/user'],
    retry: false,
  });

  // Debug info to troubleshoot admin visibility
  console.log("Admin nav item check:", { 
    currentUser, 
    isLoading, 
    error, 
    isAdmin: currentUser?.isAdmin,
    email: currentUser?.email
  });

  // If still loading, don't show anything yet
  if (isLoading) {
    return null;
  }

  // Check both isAdmin flag and special admin email
  const isAdmin = currentUser?.isAdmin === true || currentUser?.email === 'dramallamaconsultancy@gmail.com';
  
  // Only show admin link if user exists and has admin privileges
  if (!currentUser || !isAdmin) {
    return null;
  }
  
  // Force displaying the admin link for debugging purposes
  console.log("Showing admin nav item for:", currentUser.email);

  return (
    <Link href="/admin">
      <Button variant="ghost" size="sm" className="flex items-center gap-1">
        <Settings className="h-4 w-4" />
        <span>Admin</span>
      </Button>
    </Link>
  );
}