import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import llamaImage from "@assets/FB Profile Pic.png";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import AdminLoginHelper from "@/components/admin-login-helper";

// Login Form Schema
const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

// Registration Form Schema
const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string().min(1, "Please confirm your password"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

// Verification Code Schema
const verificationSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  code: z.string().min(6, "Verification code must be at least 6 characters")
});

type LoginFormValues = z.infer<typeof loginSchema>;
type RegisterFormValues = z.infer<typeof registerSchema>;
type VerificationFormValues = z.infer<typeof verificationSchema>;

export default function AuthPage() {
  const [, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("login");
  const [errorMsg, setErrorMsg] = useState("");
  const [showVerificationForm, setShowVerificationForm] = useState(false);
  const [pendingEmail, setPendingEmail] = useState("");
  const { toast } = useToast();

  // Login Form
  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  // Register Form
  const registerForm = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  // Verification Form
  const verificationForm = useForm<VerificationFormValues>({
    resolver: zodResolver(verificationSchema),
    defaultValues: {
      email: pendingEmail,
      code: "",
    },
  });
  
  // Update email field when pendingEmail changes
  useEffect(() => {
    if (pendingEmail) {
      verificationForm.setValue("email", pendingEmail);
    }
  }, [pendingEmail, verificationForm]);

  const onLoginSubmit = async (values: LoginFormValues) => {
    setIsLoading(true);
    setErrorMsg("");
    
    try {
      const response = await apiRequest("POST", "/api/auth/login", values);
      const data = await response.json();
      
      // Special handling for unverified emails 
      if (response.status === 403 && data.error === "Email not verified") {
        toast({
          title: "Email verification required",
          description: "Please enter your verification code to activate your account.",
        });
        
        // Show the verification form and pre-populate the email
        setPendingEmail(values.email);
        setShowVerificationForm(true);
        
        // Reset form values for the verification form
        verificationForm.reset({
          email: values.email,
          code: ""
        });
        
        return;
      }
      
      if (!response.ok) {
        throw new Error(data.error || "Login failed");
      }
      
      // Invalidate queries to refresh user data
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/usage"] });
      
      toast({
        title: "Login successful",
        description: "Welcome back!",
      });
      
      // Add small delay to ensure session is established
      setTimeout(() => {
        // Redirect to home page
        setLocation("/");
      }, 500);
    } catch (error: any) {
      setErrorMsg(error.message || "Login failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

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
      
      // Hide verification form and reset
      setShowVerificationForm(false);
      setPendingEmail("");
      
      // Invalidate queries to refresh user data in case they're automatically logged in
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/usage"] });
      
      // If the server auto-logs in the user after verification
      if (data.autoLogin) {
        // Add small delay to ensure session is established
        setTimeout(() => {
          // Redirect to home page
          setLocation("/");
        }, 500);
      }
    } catch (error: any) {
      setErrorMsg(error.message || "Verification failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const onRegisterSubmit = async (values: RegisterFormValues) => {
    setIsLoading(true);
    setErrorMsg("");
    
    try {
      // Remove confirmPassword before sending to API
      const { confirmPassword, ...registerData } = values;
      
      // Auto-generate a username from the email (everything before the @ symbol)
      const username = values.email.split('@')[0] + '_' + Math.floor(Math.random() * 1000).toString();
      
      const response = await apiRequest("POST", "/api/auth/register", {
        ...registerData,
        username
      });
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Registration failed");
      }
      
      // Check if email verification is needed
      if (data.verificationNeeded) {
        toast({
          title: "Registration successful",
          description: "Please check your email to verify your account.",
          duration: 5000,
        });
        
        // Redirect to the verification page
        // If the server included the verification code directly, pass it in the URL
        if (data.verificationCode) {
          setLocation(`/verify-email?code=${data.verificationCode}&email=${encodeURIComponent(values.email)}`);
        } else {
          setLocation(`/verify-email?email=${encodeURIComponent(values.email)}`);
        }
      } else {
        toast({
          title: "Registration successful",
          description: "Your account has been created. Welcome!",
        });
        
        // Redirect to home page
        setLocation("/");
      }
    } catch (error: any) {
      setErrorMsg(error.message || "Registration failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-80px)] bg-muted/40">
      {/* Left column: Auth forms */}
      <div className="flex flex-col justify-center items-center w-full lg:w-1/2 p-8">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">Welcome to Drama Llama</CardTitle>
            <CardDescription>Sign up or log in to analyze your conversations</CardDescription>
          </CardHeader>
          
          <Tabs defaultValue="login" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Log In</TabsTrigger>
              <TabsTrigger value="register">Sign Up</TabsTrigger>
            </TabsList>
            
            {errorMsg && (
              <Alert variant="destructive" className="mt-4 mx-6">
                <AlertDescription>{errorMsg}</AlertDescription>
              </Alert>
            )}
            
            <TabsContent value="login">
              <CardContent className="pt-4">
                {showVerificationForm ? (
                  // Verification Form
                  <div className="space-y-4">
                    <div className="bg-blue-50 p-4 rounded-md mb-4">
                      <h3 className="text-blue-800 font-medium text-sm mb-1">Verification Required</h3>
                      <p className="text-blue-700 text-xs">
                        Please enter the verification code sent to your email ({pendingEmail}).
                      </p>
                    </div>
                    
                    <Form {...verificationForm}>
                      <form onSubmit={verificationForm.handleSubmit(onVerificationSubmit)} className="space-y-4">
                        <input 
                          type="hidden" 
                          name="email" 
                          value={pendingEmail}
                        />
                        
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
                                Enter the 6-digit code we sent to your email when you registered
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <div className="flex flex-col sm:flex-row justify-between gap-2 mt-6">
                          <Button 
                            type="button" 
                            variant="outline" 
                            onClick={() => {
                              setShowVerificationForm(false);
                              setPendingEmail("");
                            }}
                            className="w-full sm:w-auto order-2 sm:order-1"
                          >
                            Back to Login
                          </Button>
                          
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
                  </div>
                ) : (
                  // Normal Login Form
                  <Form {...loginForm}>
                    <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                      <FormField
                        control={loginForm.control}
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
                      
                      <FormField
                        control={loginForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Password</FormLabel>
                            <FormControl>
                              <Input type="password" placeholder="Enter your password" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <div className="flex justify-end my-2">
                        <Button 
                          variant="link" 
                          className="p-0 h-auto text-xs text-primary/80 hover:text-primary"
                          onClick={() => setLocation("/forgot-password")}
                          type="button"
                        >
                          Forgot password?
                        </Button>
                      </div>
                      
                      <Button type="submit" className="w-full" disabled={isLoading}>
                        {isLoading ? "Logging in..." : "Log In"}
                      </Button>
                    </form>
                  </Form>
                )}
              </CardContent>
            </TabsContent>
            
            <TabsContent value="register">
              <CardContent className="pt-4">
                <Form {...registerForm}>
                  <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-4">
{/* Username field removed - Using email as username */}
                    
                    <FormField
                      control={registerForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="Enter your email" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={registerForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="Create a password" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={registerForm.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Confirm Password</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="Confirm your password" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <Button type="submit" className="w-full" disabled={isLoading}>
                      {isLoading ? "Creating account..." : "Sign Up"}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </TabsContent>
          </Tabs>
          
          <CardFooter className="flex flex-col items-center text-sm text-muted-foreground pt-4">
            {activeTab === "login" ? (
              <p>Don't have an account? <Button variant="link" onClick={() => setActiveTab("register")} className="p-0 h-auto">Sign up</Button></p>
            ) : (
              <p>Already have an account? <Button variant="link" onClick={() => setActiveTab("login")} className="p-0 h-auto">Log in</Button></p>
            )}
          </CardFooter>
        </Card>
      </div>
      
      {/* Right column: Hero section */}
      <div className="hidden lg:flex flex-col justify-center items-center w-1/2 bg-primary/10 p-8">
        <div className="max-w-md text-center">
          <div className="w-32 h-32 mx-auto mb-6 rounded-full overflow-hidden">
            <img 
              src={llamaImage}
              alt="Drama Llama Logo"
              className="w-full h-full object-cover"
            />
          </div>
          
          <h2 className="text-3xl font-bold mb-4">Analyze Your Conversations</h2>
          
          <p className="text-lg mb-8">
            Drama Llama helps you understand the emotional dynamics in your conversations
            with AI-powered analysis and insights.
          </p>
          
          <div className="grid grid-cols-2 gap-4 text-left">
            <div className="bg-white/30 p-4 rounded-lg shadow">
              <h3 className="font-semibold mb-2">Chat Analysis</h3>
              <p className="text-sm">Upload your conversation and get detailed insights on communication patterns.</p>
            </div>
            
            <div className="bg-white/30 p-4 rounded-lg shadow">
              <h3 className="font-semibold mb-2">Message Analysis</h3>
              <p className="text-sm">Analyze individual messages to understand intent and emotional tone.</p>
            </div>
            
            <div className="bg-white/30 p-4 rounded-lg shadow">
              <h3 className="font-semibold mb-2">De-escalate Mode</h3>
              <p className="text-sm">Reframe heated messages into calmer, more constructive versions.</p>
            </div>
            
            <div className="bg-white/30 p-4 rounded-lg shadow">
              <h3 className="font-semibold mb-2">Live Talk</h3>
              <p className="text-sm">Record and analyze real-time conversations with immediate feedback.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}