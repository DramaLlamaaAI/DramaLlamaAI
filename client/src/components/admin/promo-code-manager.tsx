import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Trash } from "lucide-react";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";

// Types for promo codes
interface PromoCode {
  id: number;
  code: string;
  discountPercentage: number;
  maxUses: number;
  usedCount: number;
  createdAt: string;
  expiresAt: string | null;
  isActive: boolean;
  targetTier: string | null;
}

// Form schema
const promoFormSchema = z.object({
  code: z
    .string()
    .min(3, "Code must be at least 3 characters")
    .max(20, "Code cannot exceed 20 characters")
    .toUpperCase(),
  discountPercentage: z
    .number()
    .min(1, "Discount must be at least 1%")
    .max(100, "Discount cannot exceed 100%"),
  maxUses: z
    .number()
    .int()
    .min(1, "Must allow at least 1 use")
    .default(100),
  expiryDays: z
    .number()
    .int()
    .min(0, "Days cannot be negative")
    .default(30),
  targetTier: z
    .string()
    .default('any'),
});

export function PromoCodeManager() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Fetch promo codes
  const { data: promoCodes, isLoading } = useQuery<PromoCode[]>({
    queryKey: ['/api/admin/promo-codes'],
    refetchInterval: 30000, // Refetch every 30 seconds
  });
  
  // Create promo code mutation
  const createPromoCode = useMutation({
    mutationFn: async (data: z.infer<typeof promoFormSchema>) => {
      const response = await apiRequest('POST', '/api/admin/promo-codes', data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Promo Code Created",
        description: "Your promo code has been successfully created.",
      });
      setIsCreateDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['/api/admin/promo-codes'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error Creating Promo Code",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    },
  });
  
  // Form for creating promo codes
  const form = useForm<z.infer<typeof promoFormSchema>>({
    resolver: zodResolver(promoFormSchema),
    defaultValues: {
      code: '',
      discountPercentage: 10,
      maxUses: 100,
      expiryDays: 30,
      targetTier: 'any',
    },
  });
  
  function onSubmit(values: z.infer<typeof promoFormSchema>) {
    createPromoCode.mutate(values);
  }
  
  // Define columns for data table
  const columns: ColumnDef<PromoCode>[] = [
    {
      accessorKey: "code",
      header: "Code",
      cell: ({ row }) => (
        <div className="font-mono uppercase">{row.getValue("code")}</div>
      ),
    },
    {
      accessorKey: "discountPercentage",
      header: "Discount",
      cell: ({ row }) => (
        <div>{row.getValue("discountPercentage")}%</div>
      ),
    },
    {
      accessorKey: "usedCount",
      header: "Usage",
      cell: ({ row }) => (
        <div>{row.getValue("usedCount")} / {row.original.maxUses}</div>
      ),
    },
    {
      accessorKey: "targetTier",
      header: "Target Tier",
      cell: ({ row }) => {
        const tier = row.getValue("targetTier") as string | null;
        return tier ? (
          <Badge variant="secondary">{tier}</Badge>
        ) : (
          <span className="text-muted-foreground">Any</span>
        );
      },
    },
    {
      accessorKey: "expiresAt",
      header: "Expires",
      cell: ({ row }) => {
        const expiresAt = row.getValue("expiresAt") as string | null;
        if (!expiresAt) return <span className="text-muted-foreground">Never</span>;
        
        const expiry = new Date(expiresAt);
        const now = new Date();
        const isExpired = expiry < now;
        
        return (
          <div className={isExpired ? "text-destructive" : ""}>
            {expiry.toLocaleDateString()}
          </div>
        );
      },
    },
    {
      accessorKey: "isActive",
      header: "Status",
      cell: ({ row }) => {
        const isActive = row.getValue("isActive") as boolean;
        return isActive ? (
          <Badge className="bg-green-500 hover:bg-green-600">Active</Badge>
        ) : (
          <Badge variant="destructive">Inactive</Badge>
        );
      },
    },
  ];
  
  // Reset form when dialog opens
  const handleDialogOpen = (open: boolean) => {
    if (open) {
      form.reset();
    }
    setIsCreateDialogOpen(open);
  };
  
  // Placeholder for not implemented notification
  const showNotImplemented = () => {
    toast({
      title: "Not Implemented",
      description: "This feature is coming soon!",
      variant: "default",
    });
  };
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Promo Codes</h2>
          <p className="text-muted-foreground">
            Create and manage discount promotional codes
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={handleDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Promo Code
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md overflow-y-auto md:max-h-[90vh] max-h-[80vh]">
            <DialogHeader>
              <DialogTitle>Create Promo Code</DialogTitle>
              <DialogDescription>
                Create a new promotional code for user discounts.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Promo Code</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="SUMMER2025"
                          {...field}
                          onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                        />
                      </FormControl>
                      <FormDescription>
                        A unique code for users to enter during checkout
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="discountPercentage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Discount Percentage</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={1}
                          max={100}
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value))}
                        />
                      </FormControl>
                      <FormDescription>
                        Percentage discount to apply (1-100%)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="maxUses"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Max Uses</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={1}
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="expiryDays"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Expires In (Days)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={0}
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="targetTier"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Target Tier (Optional)</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value || undefined}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Any tier" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="any">Any tier</SelectItem>
                          <SelectItem value="personal">Personal</SelectItem>
                          <SelectItem value="pro">Pro</SelectItem>
                          <SelectItem value="deepdive">Deep Dive</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Restrict the promo code to a specific subscription tier
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button
                    type="submit"
                    disabled={createPromoCode.isPending}
                  >
                    {createPromoCode.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      "Create Promo Code"
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
      
      <Separator />
      
      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : !promoCodes || promoCodes.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-8">
            <div className="flex flex-col items-center justify-center text-center space-y-3">
              <div className="bg-muted rounded-full p-3">
                <Trash className="h-6 w-6 text-muted-foreground" />
              </div>
              <div className="space-y-1">
                <h3 className="font-medium">No Promo Codes</h3>
                <p className="text-sm text-muted-foreground">
                  You haven't created any promo codes yet.
                </p>
              </div>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create Your First Promo Code
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <DataTable 
              columns={columns} 
              data={promoCodes} 
              searchColumn="code"
              searchPlaceholder="Search promo codes..."
              noDataMessage="No promo codes found"
            />
          </CardContent>
        </Card>
      )}
      
      <Card>
        <CardHeader>
          <CardTitle>Bulk Actions</CardTitle>
          <CardDescription>
            Create and manage promo codes in bulk
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={showNotImplemented}>
            Generate Multiple Codes
          </Button>
          <Button variant="outline" onClick={showNotImplemented}>
            Import Codes
          </Button>
          <Button variant="outline" onClick={showNotImplemented}>
            Export Codes
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}