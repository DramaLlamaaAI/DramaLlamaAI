import { useEffect, useState } from "react";
import { useLocation, useRoute } from "wouter";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiRequest } from "@/lib/queryClient";

// Components
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Mail, CheckCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

// Schema for verification
const verificationSchema = z.object({
  code: z.string().min(6, "Verification code must be at least 6 characters"),
});

type VerificationFormValues = z.infer<typeof verificationSchema>;

export default function VerifyEmailPage() {
  const [, setLocation] = useLocation();
  const [match, params] = useRoute("/verify-email");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [resendLoading, setResendLoading] = useState(false);
  const [resendEmail, setResendEmail] = useState("");
  const { toast } = useToast();
  
  // Get code and email from URL params if available
  const searchParams = new URLSearchParams(window.location.search);
  const codeFromUrl = searchParams.get("code");
  const emailFromUrl = searchParams.get("email");
  
  // Set the resend email from URL if available
  useEffect(() => {
    if (emailFromUrl) {
      setResendEmail(emailFromUrl);
    }
  }, [emailFromUrl]);
  
  const form = useForm<VerificationFormValues>({
    resolver: zodResolver(verificationSchema),
    defaultValues: {
      code: codeFromUrl || "",
    },
  });

  // Auto-verify if code is in URL
  useEffect(() => {
    const verifyCodeFromUrl = async (code: string) => {
      setIsVerifying(true);
      setErrorMsg("");
      
      try {
        console.log("Auto-verifying with code from URL:", code);
        const response = await apiRequest("POST", "/api/auth/verify-email", { code });
        
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.message || "Verification failed");
        }
        
        const data = await response.json();
        setIsVerified(true);
        
        toast({
          title: "Email Verified",
          description: data.message || "Your email has been successfully verified! You are now logged in.",
          duration: 5000,
        });
        
        // Redirect to home after 3 seconds
        setTimeout(() => {
          // Force reload the page to ensure session is refreshed
          window.location.href = "/";
        }, 3000);
      } catch (error: any) {
        console.error("Verification error from URL code:", error);
        setErrorMsg(error.message || "Verification failed. Please try again.");
      } finally {
        setIsVerifying(false);
      }
    };
    
    if (codeFromUrl && codeFromUrl.length >= 6) {
      verifyCodeFromUrl(codeFromUrl);
    }
  }, [codeFromUrl, setLocation, toast]);
  
  const onSubmit = async (values: VerificationFormValues) => {
    setIsVerifying(true);
    setErrorMsg("");
    
    try {
      console.log("Submitting verification code:", values.code);
      const response = await apiRequest("POST", "/api/auth/verify-email", values);
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Verification failed");
      }
      
      const data = await response.json();
      setIsVerified(true);
      
      toast({
        title: "Email Verified",
        description: data.message || "Your email has been successfully verified! You are now logged in.",
        duration: 5000,
      });
      
      // Redirect to home after 3 seconds
      setTimeout(() => {
        // Force reload the page to ensure session is refreshed
        window.location.href = "/";
      }, 3000);
    } catch (error: any) {
      console.error("Verification error:", error);
      setErrorMsg(error.message || "Verification failed. Please try again.");
    } finally {
      setIsVerifying(false);
    }
  };
  
  const handleResendVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!resendEmail.trim() || !resendEmail.includes('@')) {
      toast({
        title: "Invalid Email",
        description: "Please enter a valid email address.",
        variant: "destructive"
      });
      return;
    }
    
    setResendLoading(true);
    
    try {
      console.log("Resending verification for:", resendEmail);
      const response = await apiRequest("POST", "/api/auth/resend-verification", { email: resendEmail });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to resend verification email");
      }
      
      const data = await response.json();
      
      if (data.verificationCode) {
        // If we got a code directly (no email sent), update the form with it
        form.setValue("code", data.verificationCode);
        toast({
          title: "Verification Code Generated",
          description: "Please use the code provided in the form below.",
          duration: 5000,
        });
      } else {
        toast({
          title: "Verification Email Sent",
          description: "Please check your email for the verification link.",
          duration: 5000,
        });
      }
    } catch (error: any) {
      toast({
        title: "Failed to Resend",
        description: error.message || "Failed to resend verification email.",
        variant: "destructive"
      });
    } finally {
      setResendLoading(false);
    }
  };
  
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-80px)] p-4 bg-muted/40">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Email Verification</CardTitle>
          <CardDescription>Verify your email to activate your account</CardDescription>
        </CardHeader>
        
        <CardContent>
          {isVerified ? (
            <div className="text-center py-6">
              <CheckCircle className="h-16 w-16 mx-auto text-green-500 mb-4" />
              <h3 className="text-xl font-medium mb-2">Email Verified Successfully!</h3>
              <p className="text-muted-foreground">
                Thank you for verifying your email. You will be redirected to the home page shortly.
              </p>
            </div>
          ) : (
            <>
              {errorMsg && (
                <Alert variant="destructive" className="mb-4">
                  <AlertDescription>{errorMsg}</AlertDescription>
                </Alert>
              )}
              
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="code"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Verification Code</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter your verification code" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={isVerifying}
                  >
                    {isVerifying ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Verifying...
                      </>
                    ) : (
                      "Verify Email"
                    )}
                  </Button>
                </form>
              </Form>
              
              <div className="mt-6 pt-6 border-t">
                <h4 className="font-medium text-sm mb-2">Didn't receive a code?</h4>
                <form onSubmit={handleResendVerification} className="flex gap-2">
                  <Input 
                    type="email" 
                    placeholder="Enter your email" 
                    value={resendEmail}
                    onChange={(e) => setResendEmail(e.target.value)}
                    required
                  />
                  <Button variant="outline" type="submit" disabled={resendLoading}>
                    {resendLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Mail className="h-4 w-4" />
                    )}
                  </Button>
                </form>
              </div>
            </>
          )}
        </CardContent>
        
        <CardFooter className="flex flex-col items-center text-sm text-muted-foreground pt-4">
          <p>
            Return to <Button variant="link" onClick={() => setLocation("/")} className="p-0 h-auto">home page</Button>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}