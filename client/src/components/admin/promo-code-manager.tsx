import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
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
  FormMessage 
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { z } from "zod";
import { format } from "date-fns";
import { 
  CalendarIcon, 
  Check, 
  Clipboard, 
  Copy,
  Edit, 
  Gift, 
  LoaderCircle, 
  Percent, 
  Plus, 
  Tag,
  Trash, 
  X 
} from "lucide-react";
import { cn } from "@/lib/utils";

// Schema for promo code form
const promoCodeSchema = z.object({
  code: z.string().min(3, "Code must be at least 3 characters").max(20, "Code cannot exceed 20 characters"),
  description: z.string().optional(),
  discountPercentage: z.coerce.number().min(1, "Minimum discount is 1%").max(100, "Maximum discount is 100%"),
  maxUses: z.coerce.number().min(1, "Minimum uses is 1"),
  isActive: z.boolean().default(true),
  startDate: z.date(),
  expiryDate: z.date().optional().nullable(),
  targetTier: z.string().optional().nullable(),
  applyToFirstMonth: z.boolean().default(true),
});

type PromoCodeFormValues = z.infer<typeof promoCodeSchema>;

type PromoCode = {
  id: number;
  code: string;
  description: string;
  discountPercentage: number;
  maxUses: number;
  usedCount: number;
  isActive: boolean;
  startDate: string;
  expiryDate: string | null;
  createdAt: string;
  createdById: number;
  targetTier: string | null;
  applyToFirstMonth: boolean;
};

export function PromoCodeManager() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentCodeId, setCurrentCodeId] = useState<number | null>(null);
  
  // Query to get all promo codes
  const { data: promoCodes, isLoading } = useQuery({
    queryKey: ['/api/admin/promo-codes'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/admin/promo-codes');
      const data = await res.json();
      return data as PromoCode[];
    },
  });
  
  // Form for promo code creation/editing
  const form = useForm<PromoCodeFormValues>({
    resolver: zodResolver(promoCodeSchema),
    defaultValues: {
      code: "",
      description: "",
      discountPercentage: 25,
      maxUses: 100,
      isActive: true,
      startDate: new Date(),
      expiryDate: null,
      targetTier: null,
      applyToFirstMonth: true,
    },
  });
  
  // Mutation for creating promo codes
  const createPromoCodeMutation = useMutation({
    mutationFn: async (values: PromoCodeFormValues) => {
      const res = await apiRequest("POST", "/api/admin/promo-codes", values);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/promo-codes'] });
      toast({
        title: "Promo Code Created",
        description: `Your promo code "${form.getValues().code}" has been created successfully.`,
      });
      setIsOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error Creating Promo Code",
        description: error.message || "Failed to create promo code",
        variant: "destructive",
      });
    },
  });
  
  // Mutation for updating promo codes
  const updatePromoCodeMutation = useMutation({
    mutationFn: async ({ id, values }: { id: number, values: PromoCodeFormValues }) => {
      const res = await apiRequest("PATCH", `/api/admin/promo-codes/${id}`, values);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/promo-codes'] });
      toast({
        title: "Promo Code Updated",
        description: `Your promo code "${form.getValues().code}" has been updated successfully.`,
      });
      setIsOpen(false);
      setIsEditMode(false);
      setCurrentCodeId(null);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error Updating Promo Code",
        description: error.message || "Failed to update promo code",
        variant: "destructive",
      });
    },
  });
  
  // Mutation for deleting promo codes
  const deletePromoCodeMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/admin/promo-codes/${id}`);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/promo-codes'] });
      toast({
        title: "Promo Code Deleted",
        description: "The promo code has been deleted successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error Deleting Promo Code",
        description: error.message || "Failed to delete promo code",
        variant: "destructive",
      });
    },
  });
  
  // Handle form submission
  const onSubmit = (values: PromoCodeFormValues) => {
    // Validate dates
    if (values.expiryDate && values.startDate > values.expiryDate) {
      toast({
        title: "Invalid Date Range",
        description: "Expiry date must be after start date",
        variant: "destructive",
      });
      return;
    }
    
    if (isEditMode && currentCodeId) {
      updatePromoCodeMutation.mutate({ id: currentCodeId, values });
    } else {
      createPromoCodeMutation.mutate(values);
    }
  };
  
  // Function to edit a promo code
  const handleEdit = (promoCode: PromoCode) => {
    setIsEditMode(true);
    setCurrentCodeId(promoCode.id);
    
    form.reset({
      code: promoCode.code,
      description: promoCode.description || "",
      discountPercentage: promoCode.discountPercentage,
      maxUses: promoCode.maxUses,
      isActive: promoCode.isActive,
      startDate: new Date(promoCode.startDate),
      expiryDate: promoCode.expiryDate ? new Date(promoCode.expiryDate) : null,
      targetTier: promoCode.targetTier,
      applyToFirstMonth: promoCode.applyToFirstMonth,
    });
    
    setIsOpen(true);
  };
  
  // Function to delete a promo code
  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this promo code? This cannot be undone.")) {
      deletePromoCodeMutation.mutate(id);
    }
  };
  
  // Function to copy code to clipboard
  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({
      title: "Code Copied",
      description: `Promo code "${code}" copied to clipboard.`,
    });
  };
  
  // Function to format date
  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Never";
    return format(new Date(dateString), "MMM d, yyyy");
  };
  
  // Helper for generating a random promo code
  const generateRandomCode = () => {
    const prefixes = ["SUMMER", "FALL", "WINTER", "SPRING", "NEW", "WELCOME", "SPECIAL", "VIP", "DRAMA", "LLAMA"];
    const randomPrefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const randomNum = Math.floor(Math.random() * 900) + 100; // 100-999
    const code = `${randomPrefix}${randomNum}`;
    form.setValue("code", code);
  };
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold">Promotional Codes</h2>
        <Button 
          onClick={() => {
            setIsEditMode(false);
            setCurrentCodeId(null);
            form.reset();
            setIsOpen(true);
          }}
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          Create Promo Code
        </Button>
      </div>
      
      {isLoading ? (
        <div className="flex justify-center p-8">
          <LoaderCircle className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : promoCodes && promoCodes.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {promoCodes.map((promoCode) => (
            <Card key={promoCode.id} className={cn(!promoCode.isActive && "opacity-70")}>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <CardTitle className="flex items-center gap-2 text-xl">
                        {promoCode.code}
                      </CardTitle>
                      <button 
                        onClick={() => copyToClipboard(promoCode.code)}
                        className="text-muted-foreground hover:text-foreground"
                        title="Copy code"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                    </div>
                    <CardDescription>
                      {promoCode.description || "No description"}
                    </CardDescription>
                  </div>
                  <div className="flex gap-1">
                    <Badge variant={promoCode.isActive ? "default" : "outline"}>
                      {promoCode.isActive ? "Active" : "Inactive"}
                    </Badge>
                    {promoCode.targetTier && (
                      <Badge variant="secondary">
                        {promoCode.targetTier.charAt(0).toUpperCase() + promoCode.targetTier.slice(1)}
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pb-2">
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Percent className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{promoCode.discountPercentage}% off</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Tag className="h-4 w-4 text-muted-foreground" />
                    <span>
                      {promoCode.usedCount} / {promoCode.maxUses} used
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                    <span>Start: {formatDate(promoCode.startDate)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                    <span>Expires: {formatDate(promoCode.expiryDate)}</span>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="pt-2">
                <div className="flex w-full justify-between">
                  <div className="text-xs text-muted-foreground">
                    Created {formatDate(promoCode.createdAt)}
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => handleEdit(promoCode)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="text-destructive"
                      onClick={() => handleDelete(promoCode.id)}
                    >
                      <Trash className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-6 text-center">
            <Gift className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold">No Promotional Codes Yet</h3>
            <p className="text-muted-foreground mb-4">
              Create your first promotional code to offer discounts to your users.
            </p>
            <Button
              onClick={() => {
                setIsEditMode(false);
                setCurrentCodeId(null);
                form.reset();
                setIsOpen(true);
              }}
            >
              Create Your First Promo Code
            </Button>
          </CardContent>
        </Card>
      )}
      
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isEditMode ? "Edit Promotional Code" : "Create Promotional Code"}
            </DialogTitle>
            <DialogDescription>
              {isEditMode 
                ? "Modify this promotional code's details and settings" 
                : "Create a new promotional code for your users"
              }
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <FormField
                    control={form.control}
                    name="code"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Promo Code</FormLabel>
                        <div className="flex gap-2">
                          <FormControl className="flex-1">
                            <Input placeholder="SUMMER25" {...field} className="uppercase" />
                          </FormControl>
                          {!isEditMode && (
                            <Button 
                              type="button" 
                              variant="outline" 
                              onClick={generateRandomCode}
                            >
                              Generate
                            </Button>
                          )}
                        </div>
                        <FormDescription>
                          Code users will enter to receive the discount
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={form.control}
                  name="discountPercentage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Discount Percentage</FormLabel>
                      <div className="flex items-center gap-2">
                        <FormControl>
                          <Input
                            type="number"
                            min={1}
                            max={100}
                            {...field}
                          />
                        </FormControl>
                        <span className="text-muted-foreground">%</span>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="maxUses"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Maximum Uses</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={1}
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Maximum number of times this code can be used
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="25% off first month subscription"
                        {...field}
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormDescription>
                      Internal note about this promotion
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Start Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="expiryDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Expiry Date (Optional)</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>No expiry date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <div className="p-2 border-b">
                            <Button
                              variant="ghost"
                              className="w-full justify-start text-muted-foreground"
                              onClick={() => field.onChange(null)}
                            >
                              <X className="mr-2 h-4 w-4" />
                              Clear date
                            </Button>
                          </div>
                          <Calendar
                            mode="single"
                            selected={field.value || undefined}
                            onSelect={field.onChange}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="targetTier"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Target Tier (Optional)</FormLabel>
                      <FormControl>
                        <select
                          className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          value={field.value || ""}
                          onChange={(e) => field.onChange(e.target.value || null)}
                        >
                          <option value="">Any tier</option>
                          <option value="personal">Personal</option>
                          <option value="pro">Pro</option>
                        </select>
                      </FormControl>
                      <FormDescription>
                        Restrict code to a specific subscription tier
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="isActive"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                        <div className="space-y-0.5">
                          <FormLabel>Active Status</FormLabel>
                          <FormDescription>
                            Enable or disable this promo code
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              </div>
              
              <FormField
                control={form.control}
                name="applyToFirstMonth"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>
                        Apply to first month only
                      </FormLabel>
                      <FormDescription>
                        Discount will only apply to the first month of subscription
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setIsOpen(false);
                    setIsEditMode(false);
                    setCurrentCodeId(null);
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={createPromoCodeMutation.isPending || updatePromoCodeMutation.isPending}>
                  {createPromoCodeMutation.isPending || updatePromoCodeMutation.isPending ? (
                    <>
                      <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                      {isEditMode ? "Updating..." : "Creating..."}
                    </>
                  ) : (
                    isEditMode ? "Update Code" : "Create Code"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}