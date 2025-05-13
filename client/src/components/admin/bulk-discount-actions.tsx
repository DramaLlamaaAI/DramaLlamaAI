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
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { z } from "zod";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { CalendarIcon, LoaderCircle, Percent, Tags } from "lucide-react";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Interface for user data
interface User {
  id: number;
  username: string;
  email: string;
  tier: string;
}

interface BulkDiscountActionsProps {
  selectedUsers: User[];
  onComplete: () => void;
}

// Schema for bulk discount form
const bulkDiscountSchema = z.object({
  discountPercentage: z.coerce.number().min(1).max(100),
  expiryDays: z.coerce.number().min(1).optional(),
  exactExpiryDate: z.date().optional(),
  useExactDate: z.boolean().default(false),
  sendEmail: z.boolean().default(true),
  emailTemplate: z.string().optional(),
  tierFilter: z.string().optional(),
});

type BulkDiscountFormValues = z.infer<typeof bulkDiscountSchema>;

export function BulkDiscountActions({ 
  selectedUsers, 
  onComplete 
}: BulkDiscountActionsProps) {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  
  // Form for bulk discount settings
  const form = useForm<BulkDiscountFormValues>({
    resolver: zodResolver(bulkDiscountSchema),
    defaultValues: {
      discountPercentage: 10,
      expiryDays: 30,
      useExactDate: false,
      sendEmail: true,
      emailTemplate: "standard",
      tierFilter: "all",
    },
  });
  
  // Watch for form value changes
  const useExactDate = form.watch("useExactDate");
  const sendEmail = form.watch("sendEmail");
  const tierFilter = form.watch("tierFilter");
  
  // Mutation for applying bulk discounts
  const applyBulkDiscountMutation = useMutation({
    mutationFn: async (values: BulkDiscountFormValues & { userIds: number[] }) => {
      const res = await apiRequest("POST", "/api/admin/users/bulk-discount", values);
      return await res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      toast({
        title: "Bulk Discount Applied",
        description: `Successfully applied discount to ${data.affectedCount} users.`,
      });
      setIsOpen(false);
      onComplete();
    },
    onError: (error: any) => {
      toast({
        title: "Error Applying Discounts",
        description: error.message || "Failed to apply bulk discounts",
        variant: "destructive",
      });
    },
  });
  
  // Get filtered users based on tier selection
  const getFilteredUsers = (): User[] => {
    if (tierFilter === "all") return selectedUsers;
    return selectedUsers.filter(user => user.tier === tierFilter);
  };
  
  // Handle form submission
  const onSubmit = (values: BulkDiscountFormValues) => {
    const filteredUsers = getFilteredUsers();
    if (filteredUsers.length === 0) {
      toast({
        title: "No Users Selected",
        description: "No users match the selected criteria",
        variant: "destructive",
      });
      return;
    }
    
    // Prepare data for API call
    const formData = {
      ...values,
      userIds: filteredUsers.map(user => user.id),
    };
    
    // Call mutation
    applyBulkDiscountMutation.mutate(formData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline"
          disabled={selectedUsers.length === 0}
          className="gap-2"
        >
          <Tags className="h-4 w-4" />
          Bulk Discount ({selectedUsers.length})
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>Apply Bulk Discount</DialogTitle>
          <DialogDescription>
            Apply discount to {selectedUsers.length} selected users
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="discountPercentage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Discount Percentage (%)</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input type="number" min={1} max={100} {...field} />
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                        <Percent className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                  </FormControl>
                  <FormDescription>
                    Enter a percentage between 1-100%
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="useExactDate"
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
                      Use exact expiry date instead of days
                    </FormLabel>
                    <FormDescription>
                      Set a specific date when the discount will expire
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />
            
            {useExactDate ? (
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
                          disabled={(date) =>
                            date < new Date() || date < new Date("1900-01-01")
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : (
              <FormField
                control={form.control}
                name="expiryDays"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Expiry Period (days)</FormLabel>
                    <FormControl>
                      <Input type="number" min={1} {...field} />
                    </FormControl>
                    <FormDescription>
                      Number of days before the discount expires
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            
            <FormField
              control={form.control}
              name="tierFilter"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Apply To Users With Tier</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select tier filter" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="all">All Selected Users</SelectItem>
                      <SelectItem value="free">Free Tier Only</SelectItem>
                      <SelectItem value="personal">Personal Tier Only</SelectItem>
                      <SelectItem value="pro">Pro Tier Only</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Filter which users receive the discount based on their current tier
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
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
                      Send email notification
                    </FormLabel>
                    <FormDescription>
                      Notify users about their new discount
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />
            
            {sendEmail && (
              <FormField
                control={form.control}
                name="emailTemplate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Template</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select email template" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="standard">Standard Notification</SelectItem>
                        <SelectItem value="special_offer">Special Offer</SelectItem>
                        <SelectItem value="limited_time">Limited Time Offer</SelectItem>
                        <SelectItem value="loyal_customer">Loyal Customer Discount</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Choose the email template to send to users
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            
            <div className="bg-amber-50 border border-amber-200 rounded-md p-3 text-amber-800 text-sm">
              <p className="font-medium">This will apply discounts to {getFilteredUsers().length} users.</p>
              <p className="mt-1">Any existing discounts will be overwritten.</p>
            </div>
            
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