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
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { z } from "zod";
import { LoaderCircle, Mail, Send, BookMarked, Sparkles } from "lucide-react";
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

interface EmailNotificationsProps {
  selectedUsers: User[];
  onComplete: () => void;
}

// Schema for email template form
const emailTemplateSchema = z.object({
  templateName: z.string().min(1, "Template name is required"),
  subject: z.string().min(1, "Subject is required"),
  body: z.string().min(10, "Body must be at least 10 characters"),
  saveAsTemplate: z.boolean().default(false),
});

// Schema for custom email form
const customEmailSchema = z.object({
  subject: z.string().min(1, "Subject is required"),
  body: z.string().min(10, "Body must be at least 10 characters"),
  includeFooter: z.boolean().default(true),
  includeLogo: z.boolean().default(true),
  sendPreview: z.boolean().default(false),
  previewEmail: z.string().email("Please enter a valid email").optional(),
  userFilter: z.string().optional(),
});

type EmailTemplateFormValues = z.infer<typeof emailTemplateSchema>;
type CustomEmailFormValues = z.infer<typeof customEmailSchema>;

// Email template options
const EMAIL_TEMPLATES = [
  {
    id: "special_offer",
    name: "Special Offer",
    subject: "Special Discount Just For You - Drama Llama",
    body: "Dear {{username}},\n\nWe're excited to offer you a special discount on your Drama Llama subscription! For a limited time, you can enjoy a {{discount}}% discount on our services.\n\nLog in to your account to take advantage of this offer.\n\nBest regards,\nThe Drama Llama Team",
  },
  {
    id: "new_feature_announcement",
    name: "New Feature Announcement",
    subject: "Exciting New Features Available - Drama Llama",
    body: "Hello {{username}},\n\nWe're thrilled to announce that we've just released some exciting new features to Drama Llama!\n\n- Improved chat analysis\n- Enhanced message insights\n- New conflict resolution tools\n\nLog in to your account to explore these new features today.\n\nBest regards,\nThe Drama Llama Team",
  },
  {
    id: "subscription_reminder",
    name: "Subscription Reminder",
    subject: "Your Drama Llama Subscription Update",
    body: "Hi {{username}},\n\nThis is a friendly reminder about your Drama Llama subscription. Your current plan is {{tier}}.\n\nWe value your continued support and want to ensure you're getting the most out of our services.\n\nIf you have any questions about your subscription or would like to upgrade, please don't hesitate to contact us.\n\nBest regards,\nThe Drama Llama Team",
  },
  {
    id: "account_notification",
    name: "Account Notification",
    subject: "Important Account Information - Drama Llama",
    body: "Dear {{username}},\n\nWe're writing to inform you about an important update to your Drama Llama account.\n\nYour account information has been successfully updated. If you did not make these changes, please contact our support team immediately.\n\nBest regards,\nThe Drama Llama Team",
  }
];

export function EmailNotifications({ 
  selectedUsers, 
  onComplete 
}: EmailNotificationsProps) {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("templates");
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  
  // Form for template-based email
  const templateForm = useForm<EmailTemplateFormValues>({
    resolver: zodResolver(emailTemplateSchema),
    defaultValues: {
      templateName: "",
      subject: "",
      body: "",
      saveAsTemplate: false,
    },
  });
  
  // Form for custom email
  const customForm = useForm<CustomEmailFormValues>({
    resolver: zodResolver(customEmailSchema),
    defaultValues: {
      subject: "",
      body: "",
      includeFooter: true,
      includeLogo: true,
      sendPreview: false,
      userFilter: "all",
    },
  });
  
  // Watch for form value changes
  const sendPreview = customForm.watch("sendPreview");
  const userFilter = customForm.watch("userFilter");
  
  // Mutation for sending bulk emails
  const sendEmailMutation = useMutation({
    mutationFn: async (values: { 
      subject: string;
      body: string;
      userIds: number[];
      includeLogo?: boolean;
      includeFooter?: boolean;
      isPreview?: boolean;
      previewEmail?: string;
    }) => {
      const res = await apiRequest("POST", "/api/admin/email/send", values);
      return await res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      toast({
        title: "Emails Sent",
        description: `Successfully sent emails to ${data.sentCount} users.`,
      });
      setIsOpen(false);
      onComplete();
    },
    onError: (error: any) => {
      toast({
        title: "Error Sending Emails",
        description: error.message || "Failed to send emails",
        variant: "destructive",
      });
    },
  });
  
  // Handle template selection
  const handleTemplateSelect = (templateId: string) => {
    const template = EMAIL_TEMPLATES.find(t => t.id === templateId);
    if (template) {
      setSelectedTemplate(templateId);
      templateForm.setValue("templateName", template.name);
      templateForm.setValue("subject", template.subject);
      templateForm.setValue("body", template.body);
    }
  };
  
  // Get filtered users based on tier selection
  const getFilteredUsers = (): User[] => {
    if (userFilter === "all") return selectedUsers;
    return selectedUsers.filter(user => user.tier === userFilter);
  };
  
  // Handle template email submission
  const onTemplateSubmit = (values: EmailTemplateFormValues) => {
    const filteredUsers = selectedUsers;
    if (filteredUsers.length === 0) {
      toast({
        title: "No Users Selected",
        description: "No users are selected to receive this email",
        variant: "destructive",
      });
      return;
    }
    
    // Prepare data for API call
    const formData = {
      subject: values.subject,
      body: values.body,
      userIds: filteredUsers.map(user => user.id),
      includeLogo: true,
      includeFooter: true,
    };
    
    // Call mutation
    sendEmailMutation.mutate(formData);
  };
  
  // Handle custom email submission
  const onCustomSubmit = (values: CustomEmailFormValues) => {
    const filteredUsers = getFilteredUsers();
    
    if (values.sendPreview && (!values.previewEmail || values.previewEmail.trim() === "")) {
      toast({
        title: "Preview Email Required",
        description: "Please enter a valid email address for the preview",
        variant: "destructive",
      });
      return;
    }
    
    if (!values.sendPreview && filteredUsers.length === 0) {
      toast({
        title: "No Users Selected",
        description: "No users match the selected criteria",
        variant: "destructive",
      });
      return;
    }
    
    // Prepare data for API call
    const formData = {
      subject: values.subject,
      body: values.body,
      userIds: filteredUsers.map(user => user.id),
      includeLogo: values.includeLogo,
      includeFooter: values.includeFooter,
      isPreview: values.sendPreview,
      previewEmail: values.sendPreview ? values.previewEmail : undefined,
    };
    
    // Call mutation
    sendEmailMutation.mutate(formData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline"
          disabled={selectedUsers.length === 0}
          className="gap-2"
        >
          <Mail className="h-4 w-4" />
          Send Email ({selectedUsers.length})
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>Send Email Notification</DialogTitle>
          <DialogDescription>
            Send email to {selectedUsers.length} selected users
          </DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue="templates" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="templates" className="gap-2">
              <BookMarked className="h-4 w-4" />
              Email Templates
            </TabsTrigger>
            <TabsTrigger value="custom" className="gap-2">
              <Sparkles className="h-4 w-4" />
              Custom Email
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="templates" className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
              {EMAIL_TEMPLATES.map((template) => (
                <Card 
                  key={template.id}
                  className={`cursor-pointer transition-colors ${
                    selectedTemplate === template.id 
                      ? "border-primary bg-primary/5" 
                      : "hover:border-primary/20"
                  }`}
                  onClick={() => handleTemplateSelect(template.id)}
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">{template.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="pb-3">
                    <p className="text-sm text-muted-foreground line-clamp-3">
                      {template.body.substring(0, 120)}...
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
            
            {selectedTemplate && (
              <Form {...templateForm}>
                <form onSubmit={templateForm.handleSubmit(onTemplateSubmit)} className="space-y-4">
                  <FormField
                    control={templateForm.control}
                    name="subject"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email Subject</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={templateForm.control}
                    name="body"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email Body</FormLabel>
                        <FormControl>
                          <Textarea 
                            rows={8} 
                            className="font-mono text-sm"
                            {...field} 
                          />
                        </FormControl>
                        <FormDescription>
                          Available variables: {{username}}, {{email}}, {{tier}}, {{discount}}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={templateForm.control}
                    name="saveAsTemplate"
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
                            Save as custom template
                          </FormLabel>
                          <FormDescription>
                            Save this as a custom template for future use
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />
                  
                  <div className="flex justify-between">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setSelectedTemplate(null)}
                    >
                      Back to Templates
                    </Button>
                    <Button 
                      type="submit"
                      disabled={sendEmailMutation.isPending}
                      className="gap-2"
                    >
                      {sendEmailMutation.isPending ? (
                        <LoaderCircle className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                      Send to {selectedUsers.length} Users
                    </Button>
                  </div>
                </form>
              </Form>
            )}
          </TabsContent>
          
          <TabsContent value="custom" className="space-y-4 pt-4">
            <Form {...customForm}>
              <form onSubmit={customForm.handleSubmit(onCustomSubmit)} className="space-y-4">
                <FormField
                  control={customForm.control}
                  name="subject"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Subject</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={customForm.control}
                  name="body"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Body</FormLabel>
                      <FormControl>
                        <Textarea 
                          rows={8} 
                          className="font-mono text-sm"
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription>
                        Available variables: {{username}}, {{email}}, {{tier}}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={customForm.control}
                    name="includeLogo"
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
                            Include Logo
                          </FormLabel>
                          <FormDescription>
                            Add Drama Llama logo to email
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={customForm.control}
                    name="includeFooter"
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
                            Include Standard Footer
                          </FormLabel>
                          <FormDescription>
                            Add standard footer with unsubscribe link
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={customForm.control}
                  name="userFilter"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Send To Users With Tier</FormLabel>
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
                        Filter which users receive this email based on their tier
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={customForm.control}
                  name="sendPreview"
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
                          Send as Preview Only
                        </FormLabel>
                        <FormDescription>
                          Send a test email to yourself instead of to users
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
                
                {sendPreview && (
                  <FormField
                    control={customForm.control}
                    name="previewEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Preview Email Address</FormLabel>
                        <FormControl>
                          <Input 
                            type="email" 
                            placeholder="Enter your email for preview"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
                
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
                    disabled={sendEmailMutation.isPending}
                    className="gap-2"
                  >
                    {sendEmailMutation.isPending ? (
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                    {sendPreview ? 'Send Preview' : `Send to ${getFilteredUsers().length} Users`}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}