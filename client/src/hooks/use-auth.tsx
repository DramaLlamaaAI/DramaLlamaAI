import { createContext, ReactNode, useContext } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

// Define the types for user data
export interface User {
  id: number;
  username: string;
  email: string;
  tier: string;
  emailVerified: boolean;
  isAdmin: boolean;
  discountPercentage?: number;
  discountExpiryDate?: string | null;
}

// Context type definition
interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  error: Error | null;
  isAdmin: boolean;
}

// Create context
const AuthContext = createContext<AuthContextType | null>(null);

// Provider component
export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  
  // Fetch current user data
  const { data: user, error, isLoading } = useQuery<User | null>({
    queryKey: ["/api/auth/user"],
    queryFn: async () => {
      try {
        const response = await apiRequest("GET", "/api/auth/user");
        if (response.status === 401) {
          return null; // Not authenticated
        }
        
        const userData = await response.json();
        return userData;
      } catch (error) {
        return null; // Return null instead of throwing on auth errors
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
  
  // Determine if the user is an admin
  const isAdmin = !!user?.isAdmin;
  
  // Provide auth context
  return (
    <AuthContext.Provider value={{ user, isLoading, error, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
}

// Hook for consuming auth context
export function useAuth() {
  const context = useContext(AuthContext);
  
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  
  return context;
}