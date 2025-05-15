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
  const { data: currentUser } = useQuery<CurrentUser | null>({
    queryKey: ['/api/auth/user'],
    retry: false,
  });

  // Only show admin link if user is admin
  if (!currentUser?.isAdmin) {
    return null;
  }
  
  console.log("Admin check passed:", currentUser);

  return (
    <Link href="/admin">
      <Button variant="ghost" size="sm" className="flex items-center gap-1">
        <Settings className="h-4 w-4" />
        <span>Admin</span>
      </Button>
    </Link>
  );
}