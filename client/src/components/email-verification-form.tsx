import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

// Verification Code Schema
const verificationSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  code: z.string().min(6, "Verification code must be at least 6 characters")
});

type VerificationFormValues = z.infer<typeof verificationSchema>;

interface EmailVerificationFormProps {
  email: string;
  onVerificationSuccess?: () => void;
  onCancel?: () => void;
}

export default function EmailVerificationForm({ email, onVerificationSuccess, onCancel }: EmailVerificationFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const { toast } = useToast();

  // Verification Form
  const verificationForm = useForm<VerificationFormValues>({
    resolver: zodResolver(verificationSchema),
    defaultValues: {
      email: email,
      code: "",
    },
  });

  const onVerificationSubmit = async (values: VerificationFormValues) => {
    setIsLoading(true);
    setErrorMsg("");
    
    try {
      const response = await apiRequest("POST", "/api/auth/verify-email", values);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Verification failed");
      }
      
      // Successfully verified email
      toast({
        title: "Email verified",
        description: "Your email has been verified. You can now log in.",
      });
      
      // Invalidate queries to refresh user data in case they're automatically logged in
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/usage"] });
      
      // Call the success callback if provided
      if (onVerificationSuccess) {
        onVerificationSuccess();
      }
    } catch (error: any) {
      setErrorMsg(error.message || "Verification failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="border-primary/20 shadow-md">
      <CardHeader>
        <CardTitle>Verify Your Email</CardTitle>
        <CardDescription>
          Enter the verification code sent to your email
        </CardDescription>
      </CardHeader>
      <CardContent>
        {errorMsg && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{errorMsg}</AlertDescription>
          </Alert>
        )}
        
        <div className="bg-blue-50 p-4 rounded-md mb-4">
          <p className="text-blue-700 text-sm">
            A verification code was sent to <strong>{email}</strong>. Please check your email and enter the code below.
          </p>
        </div>
        
        <Form {...verificationForm}>
          <form onSubmit={verificationForm.handleSubmit(onVerificationSubmit)} className="space-y-4">
            <input type="hidden" name="email" value={email} />
            
            <FormField
              control={verificationForm.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Verification Code</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Enter your verification code" 
                      {...field} 
                      autoFocus 
                    />
                  </FormControl>
                  <FormDescription className="text-xs">
                    Enter the code we sent to your email when you registered
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="flex flex-col sm:flex-row justify-between gap-2 mt-6">
              {onCancel && (
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={onCancel}
                  className="w-full sm:w-auto order-2 sm:order-1"
                >
                  Back to Login
                </Button>
              )}
              
              <Button 
                type="submit" 
                disabled={isLoading}
                className="w-full sm:w-auto order-1 sm:order-2"
              >
                {isLoading ? "Verifying..." : "Verify Email"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}