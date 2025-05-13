import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
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
import { Slider } from "@/components/ui/slider";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { z } from "zod";
import { format } from "date-fns";
import { LoaderCircle, Percent, Tag } from "lucide-react";
import { cn } from "@/lib/utils";

interface User {
  id: number;
  username: string;
  email: string;
  tier: string;
  isAdmin: boolean;
  emailVerified: boolean;
  discountPercentage: number;
  discountExpiryDate: string | null;
}

interface BulkDiscountActionsProps {
  selectedUsers: User[];
  onComplete: () => void;
}

// Schema for bulk discount form
const bulkDiscountSchema = z.object({
  discountPercentage: z.coerce.number().min(1).max(100),
  expiryMethod: z.enum(["days", "date"]),
  expiryDays: z.coerce.number().min(1).max(365).optional(),
  exactExpiryDate: z.date().optional(),
  sendEmail: z.boolean().default(true),
  emailTemplate: z.string().optional(),
});

type BulkDiscountFormValues = z.infer<typeof bulkDiscountSchema>;

export function BulkDiscountActions({ selectedUsers, onComplete }: BulkDiscountActionsProps) {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  
  // Form for bulk discount settings
  const form = useForm<BulkDiscountFormValues>({
    resolver: zodResolver(bulkDiscountSchema),
    defaultValues: {
      discountPercentage: 15,
      expiryMethod: "days",
      expiryDays: 30,
      sendEmail: true,
      emailTemplate: "discount_notification",
    },
  });
  
  // Watch for form value changes
  const expiryMethod = form.watch("expiryMethod");
  
  // Mutation for applying bulk discount
  const applyBulkDiscountMutation = useMutation({
    mutationFn: async (values: BulkDiscountFormValues) => {
      const res = await apiRequest("POST", "/api/admin/users/bulk-discount", {
        discountPercentage: values.discountPercentage,
        expiryDays: values.expiryDays,
        exactExpiryDate: values.exactExpiryDate ? format(values.exactExpiryDate, "yyyy-MM-dd") : undefined,
        useExactDate: values.expiryMethod === "date",
        sendEmail: values.sendEmail,
        emailTemplate: values.emailTemplate,
        userIds: selectedUsers.map(user => user.id),
      });
      return await res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      toast({
        title: "Discount Applied",
        description: `Applied discount to ${data.affectedCount} users successfully.`,
      });
      setIsOpen(false);
      onComplete();
    },
    onError: (error: any) => {
      toast({
        title: "Error Applying Discount",
        description: error.message || "Failed to apply discount to users",
        variant: "destructive",
      });
    },
  });
  
  // Handle form submission
  const onSubmit = (values: BulkDiscountFormValues) => {
    // Validate form
    if (values.expiryMethod === "days" && !values.expiryDays) {
      form.setError("expiryDays", {
        type: "manual",
        message: "Number of days is required",
      });
      return;
    }
    
    if (values.expiryMethod === "date" && !values.exactExpiryDate) {
      form.setError("exactExpiryDate", {
        type: "manual",
        message: "Expiry date is required",
      });
      return;
    }
    
    // Call mutation
    applyBulkDiscountMutation.mutate(values);
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm"
          className="gap-2"
        >
          <Percent className="h-4 w-4" />
          Apply Discount
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Apply Bulk Discount</DialogTitle>
          <DialogDescription>
            Apply a discount to {selectedUsers.length} selected users.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="discountPercentage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Discount Percentage</FormLabel>
                  <FormControl>
                    <div className="space-y-2">
                      <Slider
                        min={1}
                        max={100}
                        step={1}
                        defaultValue={[field.value]}
                        onValueChange={(vals) => field.onChange(vals[0])}
                      />
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">1%</span>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            className="w-16 h-8"
                            min={1}
                            max={100}
                            {...field}
                          />
                          <Percent className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <span className="text-sm text-muted-foreground">100%</span>
                      </div>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="expiryMethod"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>Expiry Method</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      value={field.value}
                      className="flex flex-col space-y-1"
                    >
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="days" />
                        </FormControl>
                        <FormLabel className="font-normal">
                          Set number of days
                        </FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="date" />
                        </FormControl>
                        <FormLabel className="font-normal">
                          Choose specific date
                        </FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {expiryMethod === "days" ? (
              <FormField
                control={form.control}
                name="expiryDays"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Expires In (Days)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min={1} 
                        max={365} 
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>
                      Number of days until discount expires
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : (
              <FormField
                control={form.control}
                name="exactExpiryDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Expiry Date</FormLabel>
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
                          disabled={(date) => 
                            date < new Date(new Date().setHours(0, 0, 0, 0))
                          }
                        />
                      </PopoverContent>
                    </Popover>
                    <FormDescription>
                      Exact date when discount expires
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            
            <FormField
              control={form.control}
              name="sendEmail"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>
                      Send email notification to users
                    </FormLabel>
                    <FormDescription>
                      Notify users about their discount via email
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />
            
            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsOpen(false)}
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                disabled={applyBulkDiscountMutation.isPending}
              >
                {applyBulkDiscountMutation.isPending && (
                  <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                )}
                Apply Discount
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}