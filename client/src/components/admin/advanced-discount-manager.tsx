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
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
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
import { useToast } from "@/hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { z } from "zod";
import { format } from "date-fns";
import { 
  ArrowUpFromLine, 
  CalendarIcon, 
  ChevronDown, 
  ChevronUp, 
  Gift, 
  LoaderCircle, 
  Percent, 
  Sparkles, 
  Timer, 
  TrendingUp 
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Schema for advanced discount form
const advancedDiscountSchema = z.object({
  name: z.string().min(1, "Campaign name is required"),
  description: z.string().optional(),
  discountPercentage: z.coerce.number().min(1).max(100),
  startDate: z.date(),
  endDate: z.date(),
  upgradeDiscount: z.boolean().default(false),
  upgradeDiscountPercentage: z.coerce.number().min(1).max(100).optional(),
  limitedTimeOffer: z.boolean().default(false),
  limitedTimeHours: z.coerce.number().min(1).optional(),
  appliesTo: z.enum(["all", "free", "personal", "pro"]),
  autoEmail: z.boolean().default(true),
  emailTemplate: z.string().optional(),
});

type AdvancedDiscountFormValues = z.infer<typeof advancedDiscountSchema>;

export function AdvancedDiscountManager() {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  
  // Form for advanced discount settings
  const form = useForm<AdvancedDiscountFormValues>({
    resolver: zodResolver(advancedDiscountSchema),
    defaultValues: {
      name: "",
      description: "",
      discountPercentage: 15,
      startDate: new Date(),
      endDate: new Date(new Date().setDate(new Date().getDate() + 30)),
      upgradeDiscount: false,
      upgradeDiscountPercentage: 25,
      limitedTimeOffer: false,
      limitedTimeHours: 24,
      appliesTo: "all",
      autoEmail: true,
      emailTemplate: "special_offer",
    },
  });
  
  // Watch for form value changes
  const upgradeDiscount = form.watch("upgradeDiscount");
  const limitedTimeOffer = form.watch("limitedTimeOffer");
  const autoEmail = form.watch("autoEmail");
  
  // Mutation for creating advanced discount campaign
  const createDiscountCampaignMutation = useMutation({
    mutationFn: async (values: AdvancedDiscountFormValues) => {
      const res = await apiRequest("POST", "/api/admin/discount-campaigns", values);
      return await res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/discount-campaigns'] });
      toast({
        title: "Discount Campaign Created",
        description: `Your discount campaign "${data.name}" has been created successfully.`,
      });
      setIsOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error Creating Campaign",
        description: error.message || "Failed to create discount campaign",
        variant: "destructive",
      });
    },
  });
  
  // Handle form submission
  const onSubmit = (values: AdvancedDiscountFormValues) => {
    // Validate dates
    if (values.startDate > values.endDate) {
      toast({
        title: "Invalid Date Range",
        description: "End date must be after start date",
        variant: "destructive",
      });
      return;
    }
    
    // Call mutation
    createDiscountCampaignMutation.mutate(values);
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline"
          className="gap-2"
        >
          <Sparkles className="h-4 w-4" />
          Advanced Discount Manager
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Advanced Discount Campaign</DialogTitle>
          <DialogDescription>
            Configure sophisticated discount campaigns with targeted offers
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Campaign Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Spring Promotion 2025" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Campaign Description (Optional)</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Internal notes about this campaign" 
                      {...field} 
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <Separator className="my-4" />
            
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Discount Configuration</h3>
              
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
                              className="w-20 h-8"
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
                  name="endDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>End Date</FormLabel>
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
              </div>
            </div>
            
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="advanced-options">
                <AccordionTrigger className="py-2">
                  <span className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4" />
                    Advanced Options
                  </span>
                </AccordionTrigger>
                <AccordionContent className="space-y-4 pt-2">
                  <FormField
                    control={form.control}
                    name="appliesTo"
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
                            <SelectItem value="all">All Users</SelectItem>
                            <SelectItem value="free">Free Tier Only</SelectItem>
                            <SelectItem value="personal">Personal Tier Only</SelectItem>
                            <SelectItem value="pro">Pro Tier Only</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Target specific user tiers with this discount
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="upgradeDiscount"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <div className="flex items-center">
                            <FormLabel className="mr-2">
                              Special Upgrade Discount
                            </FormLabel>
                            <TrendingUp className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <FormDescription>
                            Offer a bigger discount for users upgrading to higher tiers
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />
                  
                  {upgradeDiscount && (
                    <FormField
                      control={form.control}
                      name="upgradeDiscountPercentage"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Upgrade Discount Percentage</FormLabel>
                          <FormControl>
                            <div className="flex items-center gap-2">
                              <Input
                                type="number"
                                min={1}
                                max={100}
                                {...field}
                              />
                              <Percent className="h-4 w-4 text-muted-foreground" />
                            </div>
                          </FormControl>
                          <FormDescription>
                            Higher percentage offered specifically for upgrades
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                  
                  <FormField
                    control={form.control}
                    name="limitedTimeOffer"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <div className="flex items-center">
                            <FormLabel className="mr-2">
                              Limited Time Offer
                            </FormLabel>
                            <Timer className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <FormDescription>
                            Create urgency with a countdown timer on first visit
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />
                  
                  {limitedTimeOffer && (
                    <FormField
                      control={form.control}
                      name="limitedTimeHours"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Hours to Decide</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min={1}
                              max={72}
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            How many hours the user has to claim this offer after first seeing it
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </AccordionContent>
              </AccordionItem>
              
              <AccordionItem value="email-options">
                <AccordionTrigger className="py-2">
                  <span className="flex items-center gap-2">
                    <Gift className="h-4 w-4" />
                    Email Notification Options
                  </span>
                </AccordionTrigger>
                <AccordionContent className="space-y-4 pt-2">
                  <FormField
                    control={form.control}
                    name="autoEmail"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <div className="flex items-center">
                            <FormLabel className="mr-2">
                              Send Email Notification
                            </FormLabel>
                          </div>
                          <FormDescription>
                            Automatically send email to eligible users when campaign starts
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />
                  
                  {autoEmail && (
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
                              <SelectItem value="special_offer">Special Offer</SelectItem>
                              <SelectItem value="limited_time">Limited Time Offer</SelectItem>
                              <SelectItem value="upgrade_discount">Upgrade Discount</SelectItem>
                              <SelectItem value="seasonal_promo">Seasonal Promotion</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            Choose the email template to use for notifications
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </AccordionContent>
              </AccordionItem>
            </Accordion>
            
            <Card className="bg-amber-50 border-amber-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-amber-800">Campaign Preview</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-sm text-amber-800">
                  <p className="font-medium">
                    {form.getValues("name") || "Unnamed Campaign"}
                  </p>
                  <p className="mt-1">
                    {form.getValues("discountPercentage")}% discount
                    {form.getValues("upgradeDiscount") && ` (${form.getValues("upgradeDiscountPercentage")}% for upgrades)`}
                  </p>
                  <p className="mt-1">
                    Active from {format(form.getValues("startDate"), "PP")} to {format(form.getValues("endDate"), "PP")}
                  </p>
                  <p className="mt-1">
                    Target audience: {form.getValues("appliesTo") === "all" ? "All Users" : 
                      `${form.getValues("appliesTo").charAt(0).toUpperCase() + form.getValues("appliesTo").slice(1)} Tier`}
                  </p>
                  {form.getValues("limitedTimeOffer") && (
                    <p className="mt-1">
                      Limited time offer: {form.getValues("limitedTimeHours")} hours to decide
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
            
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
                disabled={createDiscountCampaignMutation.isPending}
              >
                {createDiscountCampaignMutation.isPending && (
                  <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                )}
                Create Campaign
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}