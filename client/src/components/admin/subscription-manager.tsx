import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription,
  CardFooter
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, CreditCard, AlertTriangle, Check, X } from "lucide-react";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";

interface SubscriptionInfo {
  id: string;
  customerId: string;
  plan: string;
  status: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
}

interface User {
  id: number;
  username: string;
  email: string;
  tier: string;
  isAdmin: boolean;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  discountPercentage: number;
  discountExpiryDate: string | null;
}

interface SubscriptionManagerProps {
  user: User;
}

export function SubscriptionManager({ user }: SubscriptionManagerProps) {
  const { toast } = useToast();
  const [showUpdateDialog, setShowUpdateDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  const [subscriptionInfo, setSubscriptionInfo] = useState<SubscriptionInfo | null>(null);
  const [newPlan, setNewPlan] = useState<string>(user.tier || 'free');

  // Fetch subscription info
  const fetchSubscriptionInfo = async () => {
    if (!user.stripeSubscriptionId) {
      setSubscriptionInfo(null);
      return;
    }

    setLoading(true);
    try {
      const response = await apiRequest(
        "GET", 
        `/api/admin/subscriptions/${user.stripeSubscriptionId}`
      );
      
      if (!response.ok) {
        throw new Error("Failed to fetch subscription information");
      }
      
      const data = await response.json();
      setSubscriptionInfo(data);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load subscription information",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Mutation to update subscription
  const updateSubscriptionMutation = useMutation({
    mutationFn: async ({ 
      userId, 
      plan 
    }: { 
      userId: number; 
      plan: string;
    }) => {
      const res = await apiRequest("PUT", "/api/admin/subscriptions/update", { 
        userId, 
        plan 
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      toast({
        title: "Subscription Updated",
        description: "The user's subscription has been successfully updated.",
      });
      setShowUpdateDialog(false);
      // Refresh subscription info
      fetchSubscriptionInfo();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Update Subscription",
        description: error.message || "An error occurred while updating the subscription",
        variant: "destructive",
      });
    },
  });

  // Mutation to cancel subscription
  const cancelSubscriptionMutation = useMutation({
    mutationFn: async ({ userId }: { userId: number }) => {
      const res = await apiRequest("PUT", "/api/admin/subscriptions/cancel", { userId });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      toast({
        title: "Subscription Cancelled",
        description: "The subscription has been set to cancel at the end of the billing period.",
      });
      // Refresh subscription info
      fetchSubscriptionInfo();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Cancel Subscription",
        description: error.message || "An error occurred while cancelling the subscription",
        variant: "destructive",
      });
    },
  });

  // Mutation to reactivate cancelled subscription
  const reactivateSubscriptionMutation = useMutation({
    mutationFn: async ({ userId }: { userId: number }) => {
      const res = await apiRequest("PUT", "/api/admin/subscriptions/reactivate", { userId });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      toast({
        title: "Subscription Reactivated",
        description: "The subscription has been successfully reactivated.",
      });
      // Refresh subscription info
      fetchSubscriptionInfo();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Reactivate Subscription",
        description: error.message || "An error occurred while reactivating the subscription",
        variant: "destructive",
      });
    },
  });

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  // Handle plan update
  const handleUpdateSubscription = () => {
    if (!user.id || !newPlan) return;
    
    updateSubscriptionMutation.mutate({
      userId: user.id,
      plan: newPlan
    });
  };

  // Handle cancel subscription
  const handleCancelSubscription = () => {
    if (!user.id) return;
    
    cancelSubscriptionMutation.mutate({ userId: user.id });
  };

  // Handle reactivate subscription
  const handleReactivateSubscription = () => {
    if (!user.id) return;
    
    reactivateSubscriptionMutation.mutate({ userId: user.id });
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center">
            <CreditCard className="w-5 h-5 mr-2" />
            Subscription Management
          </CardTitle>
          <CardDescription>
            Manage this user's subscription and payment details
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Subscription Tier</Label>
                <div className="font-medium mt-1 flex items-center">
                  {user.tier === 'free' && <Badge className="bg-gray-500">Free</Badge>}
                  {user.tier === 'personal' && <Badge className="bg-blue-500">Personal</Badge>}
                  {user.tier === 'pro' && <Badge className="bg-purple-500">Pro</Badge>}
                  {user.tier === 'instant' && <Badge className="bg-amber-500">Instant</Badge>}
                </div>
              </div>
              <div>
                <Label>Discount</Label>
                <div className="font-medium mt-1">
                  {user.discountPercentage > 0 ? (
                    <div className="flex flex-col">
                      <Badge className="bg-green-500 w-fit">{user.discountPercentage}% Off</Badge>
                      {user.discountExpiryDate && (
                        <span className="text-xs text-gray-500 mt-1">
                          Expires: {formatDate(user.discountExpiryDate)}
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-gray-500">No discount</span>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Stripe Customer ID</Label>
                <div className="font-medium mt-1">
                  {user.stripeCustomerId ? (
                    <span className="font-mono text-sm">
                      {user.stripeCustomerId.substring(0, 10)}...
                    </span>
                  ) : (
                    <span className="text-gray-500">Not set</span>
                  )}
                </div>
              </div>
              <div>
                <Label>Stripe Subscription ID</Label>
                <div className="font-medium mt-1">
                  {user.stripeSubscriptionId ? (
                    <span className="font-mono text-sm">
                      {user.stripeSubscriptionId.substring(0, 10)}...
                    </span>
                  ) : (
                    <span className="text-gray-500">No active subscription</span>
                  )}
                </div>
              </div>
            </div>

            {subscriptionInfo && (
              <div className="mt-4 border rounded-md p-4">
                <h3 className="font-medium mb-2">Subscription Details</h3>
                <div className="grid grid-cols-2 gap-y-2 text-sm">
                  <div>Status:</div>
                  <div>
                    {subscriptionInfo.status === 'active' && (
                      <Badge className="bg-green-500">Active</Badge>
                    )}
                    {subscriptionInfo.status === 'canceled' && (
                      <Badge className="bg-red-500">Canceled</Badge>
                    )}
                    {subscriptionInfo.status === 'past_due' && (
                      <Badge className="bg-amber-500">Past Due</Badge>
                    )}
                    {subscriptionInfo.status !== 'active' && 
                     subscriptionInfo.status !== 'canceled' && 
                     subscriptionInfo.status !== 'past_due' && (
                      <Badge>{subscriptionInfo.status}</Badge>
                    )}
                  </div>
                  <div>Current Period Ends:</div>
                  <div>{formatDate(subscriptionInfo.currentPeriodEnd)}</div>
                  <div>Cancel at Period End:</div>
                  <div>{subscriptionInfo.cancelAtPeriodEnd ? 'Yes' : 'No'}</div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <div className="flex gap-2">
            <Button 
              variant="default" 
              size="sm" 
              onClick={() => fetchSubscriptionInfo()}
              disabled={loading || !user.stripeSubscriptionId}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              View Details
            </Button>
          </div>
          <div className="flex gap-2">
            {subscriptionInfo?.cancelAtPeriodEnd && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleReactivateSubscription}
                disabled={reactivateSubscriptionMutation.isPending}
              >
                {reactivateSubscriptionMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Reactivate
              </Button>
            )}
            {subscriptionInfo && !subscriptionInfo.cancelAtPeriodEnd && (
              <Button 
                variant="destructive" 
                size="sm"
                onClick={handleCancelSubscription}
                disabled={cancelSubscriptionMutation.isPending}
              >
                {cancelSubscriptionMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Cancel Plan
              </Button>
            )}
            <Button 
              variant="default" 
              size="sm" 
              onClick={() => setShowUpdateDialog(true)}
            >
              Update Plan
            </Button>
          </div>
        </CardFooter>
      </Card>

      {/* Update Plan Dialog */}
      <Dialog open={showUpdateDialog} onOpenChange={setShowUpdateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Subscription Plan</DialogTitle>
            <DialogDescription>
              Change the subscription plan for {user.username}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="plan">Select Plan</Label>
              <Select 
                value={newPlan} 
                onValueChange={setNewPlan}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a plan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">Free</SelectItem>
                  <SelectItem value="personal">Personal</SelectItem>
                  <SelectItem value="pro">Pro</SelectItem>
                  <SelectItem value="instant">Instant Deep Dive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-md p-3 text-amber-800 text-sm">
              <div className="flex">
                <AlertTriangle className="h-5 w-5 mr-2 flex-shrink-0" />
                <div>
                  <p className="font-medium">Important Notes:</p>
                  <ul className="list-disc list-inside mt-1">
                    <li>
                      Changing plans will take effect immediately for tier access
                    </li>
                    <li>
                      If downgrading, the user will still be charged for the current billing period
                    </li>
                    <li>
                      If upgrading, a prorated charge may apply for the remainder of the billing cycle
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowUpdateDialog(false)}
            >
              <X className="mr-2 h-4 w-4" />
              Cancel
            </Button>
            <Button 
              onClick={handleUpdateSubscription}
              disabled={updateSubscriptionMutation.isPending}
            >
              {updateSubscriptionMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Check className="mr-2 h-4 w-4" />
              )}
              Update Plan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}