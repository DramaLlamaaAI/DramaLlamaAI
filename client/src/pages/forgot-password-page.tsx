import { useState } from "react";
import { useLocation } from "wouter";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

// Form Schema
const forgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email address")
});

// Reset Password Schema for code verification and new password
const resetPasswordSchema = z.object({
  code: z.string().min(1, "Verification code is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string().min(1, "Please confirm your password"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;
type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;

export default function ForgotPasswordPage() {
  const [, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [isRequestSent, setIsRequestSent] = useState(false);
  const [email, setEmail] = useState("");
  const { toast } = useToast();
  
  // Get code from URL params if available for direct reset
  const searchParams = new URLSearchParams(window.location.search);
  const codeFromUrl = searchParams.get("code");
  const initialMode = codeFromUrl ? "reset" : "request";
  const [mode, setMode] = useState(initialMode);
  
  // Request form
  const requestForm = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });
  
  // Reset form with password input
  const resetForm = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      code: codeFromUrl || "",
      password: "",
      confirmPassword: "",
    },
  });
  
  const onRequestSubmit = async (values: ForgotPasswordValues) => {
    setIsLoading(true);
    setErrorMsg("");
    setSuccessMsg("");
    
    try {
      // In a real app, this would call an API endpoint
      const response = await apiRequest("POST", "/api/auth/forgot-password", values);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Failed to process password reset request");
      }
      
      // Store email for potential reset step
      setEmail(values.email);
      
      // Show success message
      setSuccessMsg("Password reset email sent. Please check your inbox for instructions.");
      setIsRequestSent(true);
      
      toast({
        title: "Reset email sent",
        description: "Check your email for a password reset link.",
      });
      
      // If we got a direct code in the response for testing, show it
      if (data.verificationCode) {
        setMode("reset");
        resetForm.setValue("code", data.verificationCode);
      }
      
    } catch (error: any) {
      setErrorMsg(error.message || "Request failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };
  
  const onResetSubmit = async (values: ResetPasswordValues) => {
    setIsLoading(true);
    setErrorMsg("");
    
    try {
      // Include the email if we have it from the previous step
      const payload = {
        ...values,
        email: email || searchParams.get("email") || "",
      };
      
      // Combine with code from the form
      delete payload.confirmPassword;
      
      const response = await apiRequest("POST", "/api/auth/reset-password", payload);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Password reset failed");
      }
      
      toast({
        title: "Password reset successful",
        description: "Your password has been updated. You can now log in.",
      });
      
      // Redirect to login page
      setLocation("/auth");
      
    } catch (error: any) {
      setErrorMsg(error.message || "Password reset failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="flex min-h-[calc(100vh-80px)] bg-muted/40 justify-center items-center">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">
            {mode === "request" ? "Forgot Password" : "Reset Password"}
          </CardTitle>
          <CardDescription>
            {mode === "request" 
              ? "Enter your email address to receive password reset instructions" 
              : "Enter the verification code and your new password"}
          </CardDescription>
        </CardHeader>
        
        {errorMsg && (
          <Alert variant="destructive" className="mx-6">
            <AlertDescription>{errorMsg}</AlertDescription>
          </Alert>
        )}
        
        {successMsg && (
          <Alert className="mx-6 bg-green-50 border-green-200 text-green-800">
            <AlertDescription>{successMsg}</AlertDescription>
          </Alert>
        )}
        
        <CardContent className="pt-4">
          {mode === "request" ? (
            <Form {...requestForm}>
              <form onSubmit={requestForm.handleSubmit(onRequestSubmit)} className="space-y-4">
                <FormField
                  control={requestForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter your email address" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Sending..." : "Reset Password"}
                </Button>
                
                {isRequestSent && (
                  <div className="mt-2">
                    <Button 
                      variant="link" 
                      onClick={() => setMode("reset")} 
                      className="p-0 w-full text-sm"
                      type="button"
                    >
                      Already have a reset code? Click here
                    </Button>
                  </div>
                )}
              </form>
            </Form>
          ) : (
            <Form {...resetForm}>
              <form onSubmit={resetForm.handleSubmit(onResetSubmit)} className="space-y-4">
                <FormField
                  control={resetForm.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Verification Code</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter verification code" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={resetForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>New Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="Enter new password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={resetForm.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="Confirm new password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Updating..." : "Set New Password"}
                </Button>
                
                {mode === "reset" && !codeFromUrl && (
                  <Button 
                    variant="link" 
                    onClick={() => setMode("request")} 
                    className="p-0 w-full text-sm"
                    type="button"
                  >
                    Need a verification code? Request one here
                  </Button>
                )}
              </form>
            </Form>
          )}
        </CardContent>
        
        <CardFooter className="flex flex-col items-center text-sm text-muted-foreground pt-4">
          <Button variant="link" onClick={() => setLocation("/auth")} className="p-0 h-auto">
            Back to Login
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}