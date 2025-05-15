import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, Tag, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface PromoCodeInputProps {
  onApply: (discountPercentage: number) => void;
  className?: string;
}

export function PromoCodeInput({ onApply, className }: PromoCodeInputProps) {
  const [code, setCode] = useState("");
  const [appliedCode, setAppliedCode] = useState<{ code: string; discountPercentage: number } | null>(null);
  const { toast } = useToast();
  
  // Mutation for redeeming promo code
  const redeemMutation = useMutation({
    mutationFn: async (promoCode: string) => {
      const response = await apiRequest("POST", "/api/promo-codes/redeem", { code: promoCode });
      return await response.json();
    },
    onSuccess: (data) => {
      if (!data.success) {
        toast({
          title: "Invalid Code",
          description: data.message || "This promotion code cannot be applied",
          variant: "destructive",
        });
        return;
      }
      
      // Apply discount
      setAppliedCode({
        code,
        discountPercentage: data.discountPercentage || 0,
      });
      
      // Notify parent component
      onApply(data.discountPercentage || 0);
      
      toast({
        title: "Promo Code Applied",
        description: `${data.discountPercentage}% discount has been applied to your order`,
        variant: "default",
        className: "bg-green-50 border-green-200",
      });
      
      // Clear input
      setCode("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to apply promo code",
        variant: "destructive",
      });
    },
  });
  
  const handleApply = () => {
    if (!code) {
      toast({
        title: "Empty Code",
        description: "Please enter a promotion code",
        variant: "destructive",
      });
      return;
    }
    
    redeemMutation.mutate(code);
  };
  
  const removeAppliedCode = () => {
    setAppliedCode(null);
    onApply(0);
    
    toast({
      title: "Promo Code Removed",
      description: "The discount has been removed from your order",
    });
  };
  
  if (appliedCode) {
    return (
      <div className={cn("mb-4", className)}>
        <div className="flex items-center justify-between p-2 border rounded-md bg-muted/20">
          <div className="flex items-center gap-2">
            <Tag className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">{appliedCode.code}</span>
            <Badge variant="secondary" className="ml-2">
              {appliedCode.discountPercentage}% OFF
            </Badge>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={removeAppliedCode} 
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Remove promo code</span>
          </Button>
        </div>
      </div>
    );
  }
  
  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between">
        <Label htmlFor="promo-code">Promo Code</Label>
        {redeemMutation.isPending && (
          <div className="flex items-center text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin mr-1" />
            Validating...
          </div>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Input
          id="promo-code"
          type="text"
          placeholder="Enter promo code"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          className="uppercase"
          disabled={redeemMutation.isPending}
        />
        <Button 
          onClick={handleApply} 
          disabled={redeemMutation.isPending || !code}
          variant="secondary"
        >
          {redeemMutation.isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Applying
            </>
          ) : (
            "Apply"
          )}
        </Button>
      </div>
    </div>
  );
}