import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  ArrowLeft,
  AtSign, 
  BadgeCheck, 
  BadgeX, 
  Calendar, 
  Clock, 
  CreditCard,
  Home,
  LoaderCircle, 
  LockKeyhole, 
  Mail, 
  Percent, 
  RefreshCw, 
  Shield, 
  ShieldOff, 
  User, 
  UserCog 
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface UserDetailViewProps {
  user: {
    id: number;
    username: string;
    email: string;
    tier: string;
    isAdmin: boolean;
    emailVerified: boolean;
    discountPercentage: number;
    discountExpiryDate: string | null;
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;
    createdAt?: string;
  };
  onBack: () => void;
}

export function UserDetailView({ user, onBack }: UserDetailViewProps) {
  const { toast } = useToast();
  const [tierValue, setTierValue] = useState(user.tier);
  const [isAdmin, setIsAdmin] = useState(user.isAdmin);
  const [discountPercentage, setDiscountPercentage] = useState(user.discountPercentage.toString());
  const [discountExpiryDate, setDiscountExpiryDate] = useState<Date | undefined>(
    user.discountExpiryDate ? new Date(user.discountExpiryDate) : undefined
  );

  // Mutation for updating user tier
  const updateTierMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PUT", "/api/admin/user/tier", {
        userId: user.id,
        tier: tierValue,
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      toast({
        title: "Tier Updated",
        description: `User tier updated to ${tierValue}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update tier",
        variant: "destructive",
      });
    },
  });

  // Mutation for updating admin status
  const updateAdminMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PUT", "/api/admin/user/admin", {
        userId: user.id,
        isAdmin,
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      toast({
        title: "Admin Status Updated",
        description: isAdmin ? "User is now an admin" : "User is no longer an admin",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update admin status",
        variant: "destructive",
      });
    },
  });

  // Mutation for updating discount
  const updateDiscountMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PUT", "/api/admin/user/discount", {
        userId: user.id,
        discountPercentage: parseInt(discountPercentage, 10),
        expiryDays: discountExpiryDate 
          ? Math.ceil((discountExpiryDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) 
          : 30,
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      toast({
        title: "Discount Updated",
        description: `User discount updated to ${discountPercentage}%`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update discount",
        variant: "destructive",
      });
    },
  });

  // Handle tier change
  const handleTierChange = (value: string) => {
    setTierValue(value);
  };

  // Handle admin toggle change
  const handleAdminToggle = (checked: boolean) => {
    setIsAdmin(checked);
  };

  // Handle discount percentage change
  const handleDiscountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Ensure it's a valid number between 0 and 100
    const value = e.target.value;
    if (value === "" || (/^\d+$/.test(value) && parseInt(value, 10) >= 0 && parseInt(value, 10) <= 100)) {
      setDiscountPercentage(value);
    }
  };

  // Format date
  const formatDate = (date: string | null) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex gap-2">
          <Button variant="ghost" onClick={onBack} className="flex gap-2 items-center">
            <ArrowLeft className="h-4 w-4" />
            Back to Users
          </Button>
          
          <Link href="/">
            <Button variant="outline" className="flex gap-2 items-center">
              <Home className="h-4 w-4" />
              Back to Home
            </Button>
          </Link>
        </div>
        
        <div className="flex gap-2">
          <Badge variant="outline" className="flex items-center gap-1 border-primary">
            <User className="h-3 w-3" />
            ID: {user.id}
          </Badge>
          {user.isAdmin && (
            <Badge className="bg-amber-500 text-amber-950">Admin</Badge>
          )}
          <Badge 
            className={
              user.tier === 'free' ? 'bg-gray-500' : 
              user.tier === 'personal' ? 'bg-blue-500' : 
              'bg-purple-500'
            }
          >
            {user.tier.charAt(0).toUpperCase() + user.tier.slice(1)}
          </Badge>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* User Info Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCog className="h-5 w-5" />
              User Information
            </CardTitle>
            <CardDescription>
              Basic details about the user
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-1.5">
              <div className="text-sm font-medium text-muted-foreground">Username</div>
              <div className="flex items-center gap-2">
                <AtSign className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{user.username}</span>
              </div>
            </div>
            
            <div className="flex flex-col gap-1.5">
              <div className="text-sm font-medium text-muted-foreground">Email</div>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{user.email}</span>
                {user.emailVerified ? (
                  <BadgeCheck className="h-4 w-4 text-green-500" />
                ) : (
                  <BadgeX className="h-4 w-4 text-red-500" />
                )}
              </div>
            </div>
            
            {user.createdAt && (
              <div className="flex flex-col gap-1.5">
                <div className="text-sm font-medium text-muted-foreground">Joined</div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>{formatDate(user.createdAt)}</span>
                </div>
              </div>
            )}
            
            {user.stripeCustomerId && (
              <div className="flex flex-col gap-1.5">
                <div className="text-sm font-medium text-muted-foreground">Stripe Customer ID</div>
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                  <span className="font-mono text-sm">{user.stripeCustomerId}</span>
                </div>
              </div>
            )}
            
            {user.stripeSubscriptionId && (
              <div className="flex flex-col gap-1.5">
                <div className="text-sm font-medium text-muted-foreground">Subscription ID</div>
                <div className="flex items-center gap-2">
                  <RefreshCw className="h-4 w-4 text-muted-foreground" />
                  <span className="font-mono text-sm">{user.stripeSubscriptionId}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* User Management Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LockKeyhole className="h-5 w-5" />
              Manage User
            </CardTitle>
            <CardDescription>
              Update user settings and permissions
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Tier selection */}
            <div className="space-y-2">
              <Label htmlFor="tier-select">User Tier</Label>
              <Select
                value={tierValue}
                onValueChange={handleTierChange}
              >
                <SelectTrigger id="tier-select">
                  <SelectValue placeholder="Select tier" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">Free</SelectItem>
                  <SelectItem value="personal">Personal</SelectItem>
                  <SelectItem value="pro">Pro</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                Change the user's subscription tier
              </p>
            </div>
            
            <Separator />
            
            {/* Admin toggle */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="admin-toggle">Admin Access</Label>
                <p className="text-sm text-muted-foreground">
                  Grant administrative privileges
                </p>
              </div>
              <div className="flex items-center gap-2">
                {isAdmin ? (
                  <Shield className="h-4 w-4 text-amber-500" />
                ) : (
                  <ShieldOff className="h-4 w-4 text-muted-foreground" />
                )}
                <Switch
                  id="admin-toggle"
                  checked={isAdmin}
                  onCheckedChange={handleAdminToggle}
                />
              </div>
            </div>
            
            <Separator />
            
            {/* Discount settings */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="discount-percentage">Discount Percentage</Label>
                <div className="flex items-center">
                  <Input
                    id="discount-percentage"
                    type="number"
                    min="0"
                    max="100"
                    value={discountPercentage}
                    onChange={handleDiscountChange}
                    className="w-20 text-right"
                  />
                  <span className="ml-2">%</span>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="discount-expiry">Discount Expiry Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !discountExpiryDate && "text-muted-foreground"
                      )}
                    >
                      <Clock className="mr-2 h-4 w-4" />
                      {discountExpiryDate ? format(discountExpiryDate, "PPP") : "Select expiration date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <CalendarComponent
                      mode="single"
                      selected={discountExpiryDate}
                      onSelect={setDiscountExpiryDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button
              variant="outline" 
              onClick={onBack}
            >
              Cancel
            </Button>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => updateDiscountMutation.mutate()}
                disabled={updateDiscountMutation.isPending}
              >
                {updateDiscountMutation.isPending && (
                  <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                )}
                <Percent className="mr-2 h-4 w-4" />
                Update Discount
              </Button>
              
              <Button
                variant="outline"
                onClick={() => updateAdminMutation.mutate()}
                disabled={updateAdminMutation.isPending}
              >
                {updateAdminMutation.isPending && (
                  <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                )}
                <Shield className="mr-2 h-4 w-4" />
                Update Admin
              </Button>
              
              <Button
                onClick={() => updateTierMutation.mutate()}
                disabled={updateTierMutation.isPending}
              >
                {updateTierMutation.isPending && (
                  <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                )}
                Save Changes
              </Button>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}