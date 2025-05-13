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
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { z } from "zod";
import { LoaderCircle, Mail, SendHorizonal, Users } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

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

interface EmailNotificationsProps {
  selectedUsers: User[];
  onComplete: () => void;
}

// Schema for email form
const emailFormSchema = z.object({
  subject: z.string().min(1, "Subject is required").max(100, "Subject is too long"),
  body: z.string().min(1, "Email body is required"),
  includeLogo: z.boolean().default(true),
  includeFooter: z.boolean().default(true),
  isPreview: z.boolean().default(false),
  previewEmail: z.string().email("Please enter a valid email").optional(),
});

type EmailFormValues = z.infer<typeof emailFormSchema>;

export function EmailNotifications({ selectedUsers, onComplete }: EmailNotificationsProps) {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("compose");
  
  // Form for email settings
  const form = useForm<EmailFormValues>({
    resolver: zodResolver(emailFormSchema),
    defaultValues: {
      subject: "",
      body: "",
      includeLogo: true,
      includeFooter: true,
      isPreview: false,
    },
  });
  
  // Watch for form value changes
  const isPreview = form.watch("isPreview");
  
  // Mutation for sending bulk email
  const sendEmailMutation = useMutation({
    mutationFn: async (values: EmailFormValues) => {
      const res = await apiRequest("POST", "/api/admin/email/send", {
        subject: values.subject,
        body: values.body,
        userIds: selectedUsers.map(user => user.id),
        includeLogo: values.includeLogo,
        includeFooter: values.includeFooter,
        isPreview: values.isPreview,
        previewEmail: values.previewEmail,
      });
      return await res.json();
    },
    onSuccess: (data) => {
      if (isPreview) {
        toast({
          title: "Preview Email Sent",
          description: `Preview email has been sent to ${data.sentTo}`,
        });
      } else {
        toast({
          title: "Emails Sent",
          description: `Successfully sent emails to ${data.sentCount} out of ${data.totalCount} recipients`,
        });
        setIsOpen(false);
        onComplete();
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error Sending Emails",
        description: error.message || "Failed to send emails",
        variant: "destructive",
      });
    },
  });
  
  // Handle form submission
  const onSubmit = (values: EmailFormValues) => {
    // Validate preview email if needed
    if (values.isPreview && !values.previewEmail) {
      form.setError("previewEmail", {
        type: "manual",
        message: "Preview email is required",
      });
      return;
    }
    
    // Call mutation
    sendEmailMutation.mutate(values);
  };
  
  // Handle template selection
  const selectTemplate = (templateType: string) => {
    let subject = "";
    let body = "";
    
    switch (templateType) {
      case "welcome":
        subject = "Welcome to Drama Llama - Get Started with Our AI Analysis Tools";
        body = `Hello {{username}},

We're thrilled to welcome you to Drama Llama! Your account has been successfully created and you're all set to start analyzing conversations and messages with our powerful AI tools.

Here's what you can do with your account:
- Analyze chat conversations to understand emotional dynamics
- Get insights on individual messages
- Learn how to de-escalate tense situations
- Experience real-time analysis with Live Talk

If you have any questions or need assistance, don't hesitate to reach out to our support team.

Happy analyzing!
The Drama Llama Team`;
        break;
      case "feature":
        subject = "New Feature Alert - Explore What's New in Drama Llama";
        body = `Hello {{username}},

We're excited to announce some fantastic new features in Drama Llama that will enhance your experience:

🚀 NEW FEATURE: Enhanced psychological profiles for deeper insights
🚀 NEW FEATURE: Improved conversation analysis with more detailed breakdowns
🚀 NEW FEATURE: Mobile export functionality for on-the-go access

Log in to your account and try these new features today!

Your current tier: {{tier}}

Thank you for being part of the Drama Llama community.

Best regards,
The Drama Llama Team`;
        break;
      case "upgrade":
        subject = "Unlock Premium Features - Upgrade Your Drama Llama Experience";
        body = `Hello {{username}},

We noticed you've been getting great value from your Drama Llama account! Did you know you can access even more powerful features by upgrading to a higher tier?

By upgrading to Personal or Pro, you'll unlock:
- Enhanced conversation analysis 
- Psychological profiles of participants
- More detailed sentiment breakdowns
- Advanced pattern detection

Your current tier: {{tier}}

Visit our pricing page to explore the options that best suit your needs.

Best regards,
The Drama Llama Team`;
        break;
      case "tip":
        subject = "Communication Tips from Drama Llama";
        body = `Hello {{username}},

Here are some quick communication tips from Drama Llama to enhance your conversations:

1. Practice active listening by paraphrasing what others say
2. Use "I" statements instead of "you" statements to reduce defensiveness
3. Take a 10-second pause before responding when emotions run high
4. Ask clarifying questions instead of making assumptions
5. Acknowledge others' perspectives, even if you disagree

We hope these tips help you improve your communication skills!

Your Drama Llama Team`;
        break;
      default:
        break;
    }
    
    form.setValue("subject", subject);
    form.setValue("body", body);
  };
  
  // Format variable placeholders in preview
  const formatPreview = (text: string) => {
    if (!text) return "";
    return text
      .replace(/{{username}}/g, "<strong class='text-primary'>USERNAME</strong>")
      .replace(/{{email}}/g, "<strong class='text-primary'>USER_EMAIL</strong>")
      .replace(/{{tier}}/g, "<strong class='text-primary'>USER_TIER</strong>");
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm"
          className="gap-2"
        >
          <Mail className="h-4 w-4" />
          Send Email
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>Send Email to Users</DialogTitle>
          <DialogDescription>
            Compose and send an email to {selectedUsers.length} selected users.
          </DialogDescription>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="compose">Compose Email</TabsTrigger>
            <TabsTrigger value="recipients">Recipients ({selectedUsers.length})</TabsTrigger>
          </TabsList>
          
          <TabsContent value="compose" className="mt-4 space-y-4">
            <div className="flex flex-wrap gap-2 mb-4">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => selectTemplate("welcome")}
              >
                Welcome
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => selectTemplate("feature")}
              >
                New Features
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => selectTemplate("upgrade")}
              >
                Upgrade Offer
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => selectTemplate("tip")}
              >
                Tips & Advice
              </Button>
            </div>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="subject"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Subject</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Enter email subject..." 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="body"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Body</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Compose your email... Use {{username}}, {{email}}, and {{tier}} as placeholders for personalization." 
                          className="min-h-[200px]" 
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription>
                        You can use placeholders like &#123;&#123;username&#125;&#125;, &#123;&#123;email&#125;&#125;, and &#123;&#123;tier&#125;&#125;
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="includeLogo"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 border rounded-md p-3">
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
                    control={form.control}
                    name="includeFooter"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 border rounded-md p-3">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>
                            Include Footer
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
                  control={form.control}
                  name="isPreview"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 border rounded-md p-3">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>
                          Send Preview First
                        </FormLabel>
                        <FormDescription>
                          Send a test email to yourself before bulk sending
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
                
                {isPreview && (
                  <FormField
                    control={form.control}
                    name="previewEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Preview Email Address</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Enter your email for preview..." 
                            type="email"
                            {...field} 
                            value={field.value || ""}
                          />
                        </FormControl>
                        <FormDescription>
                          We'll send a preview to this address first
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
                
                {form.getValues("subject") && form.getValues("body") && (
                  <div className="border rounded-md p-4 space-y-3">
                    <h3 className="text-sm font-medium">Email Preview</h3>
                    <Separator />
                    <p className="text-sm font-semibold">Subject: {form.getValues("subject")}</p>
                    <div 
                      className="text-sm prose prose-sm max-w-none" 
                      dangerouslySetInnerHTML={{ 
                        __html: formatPreview(form.getValues("body").replace(/\n/g, "<br/>")) 
                      }} 
                    />
                  </div>
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
                    {sendEmailMutation.isPending && (
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                    )}
                    {isPreview ? (
                      <>
                        <SendHorizonal className="h-4 w-4" />
                        Send Preview
                      </>
                    ) : (
                      <>
                        <SendHorizonal className="h-4 w-4" />
                        Send to {selectedUsers.length} Users
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </TabsContent>
          
          <TabsContent value="recipients" className="mt-4">
            <ScrollArea className="h-[400px] border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Username</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Tier</TableHead>
                    <TableHead>Discount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>{user.username}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            user.tier === 'free' ? 'border-gray-500 text-gray-500' : 
                            user.tier === 'personal' ? 'border-blue-500 text-blue-500' : 
                            'border-purple-500 text-purple-500'
                          }
                        >
                          {user.tier.charAt(0).toUpperCase() + user.tier.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {user.discountPercentage > 0 ? (
                          <Badge variant="outline" className="border-green-500 text-green-500">
                            {user.discountPercentage}% OFF
                          </Badge>
                        ) : (
                          <span className="text-sm text-muted-foreground">None</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
            
            <div className="mt-4 flex justify-end">
              <Button 
                onClick={() => setActiveTab("compose")}
                className="gap-2"
              >
                <Mail className="h-4 w-4" />
                Continue to Compose
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}