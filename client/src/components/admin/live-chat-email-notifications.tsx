import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Loader2, Send, Mail, Users } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

export function LiveChatEmailNotifications() {
  const [isLoading, setIsLoading] = useState(false);
  const [testEmail, setTestEmail] = useState('support@dramallama.ai');
  const { toast } = useToast();

  const sendTestEmail = async () => {
    if (!testEmail.trim()) {
      toast({
        title: "Email Required",
        description: "Please enter an email address for the test.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const result = await fetch('/api/admin/email/chat-announcement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testEmail: testEmail.trim() }),
      });
      
      if (!result.ok) {
        throw new Error(`HTTP error! status: ${result.status}`);
      }
      
      const data = await result.json();

      toast({
        title: "Test Email Sent",
        description: `Live chat announcement test email sent successfully to ${testEmail}`,
      });
    } catch (error) {
      console.error('Failed to send test email:', error);
      toast({
        title: "Email Failed",
        description: "Failed to send test email. Please check your configuration.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const sendToAllUsers = async () => {
    setIsLoading(true);
    try {
      const result = await apiRequest('/api/admin/email/chat-announcement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      toast({
        title: "Emails Sent Successfully",
        description: result.message || "Live chat announcement sent to all verified users",
      });
    } catch (error) {
      console.error('Failed to send bulk emails:', error);
      toast({
        title: "Bulk Email Failed",
        description: "Failed to send emails to all users. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Live Chat Feature Announcement</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Send an email to users announcing the new live chat support feature
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Test Email
            </CardTitle>
            <CardDescription>
              Send a test email to review the content before sending to all users
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="test-email">Test Email Address</Label>
              <Input
                id="test-email"
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="support@dramallama.ai"
              />
            </div>
            <Button 
              onClick={sendTestEmail} 
              disabled={isLoading}
              className="w-full"
              variant="outline"
            >
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              Send Test Email
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Send to All Users
            </CardTitle>
            <CardDescription>
              Send the live chat announcement to all verified email addresses
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-2">Email Content Preview:</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Announces new live chat support feature</li>
                <li>• Explains how to access the chat widget</li>
                <li>• Lists what support is available via chat</li>
                <li>• Professional HTML email with branding</li>
              </ul>
            </div>
            
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <p className="text-sm text-amber-800">
                <strong>Important:</strong> Test the email first to review content and formatting before sending to all users.
              </p>
            </div>

            <Button 
              onClick={sendToAllUsers} 
              disabled={isLoading}
              className="w-full"
              variant="default"
            >
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Users className="mr-2 h-4 w-4" />
              )}
              Send to All Verified Users
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Email Content Details</CardTitle>
          <CardDescription>
            Preview of what users will receive in their inbox
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium">Subject Line:</Label>
              <p className="text-sm text-muted-foreground mt-1">
                🎉 New Feature: Live Chat Support Now Available!
              </p>
            </div>
            
            <Separator />
            
            <div>
              <Label className="text-sm font-medium">Key Messages:</Label>
              <ul className="text-sm text-muted-foreground mt-2 space-y-1 list-disc ml-5">
                <li>Introduction of live chat support feature</li>
                <li>Instructions on how to find and use the chat widget</li>
                <li>Types of support available (technical, how-to, quick answers, feature requests)</li>
                <li>Business hours availability note</li>
                <li>Professional branding consistent with Drama Llama theme</li>
              </ul>
            </div>

            <Separator />

            <div>
              <Label className="text-sm font-medium">Format:</Label>
              <p className="text-sm text-muted-foreground mt-1">
                Responsive HTML email with fallback text version, optimized for all email clients
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}