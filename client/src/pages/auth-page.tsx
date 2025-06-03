import { useState } from "react";
import { useLocation } from "wouter";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import llamaImage from "@assets/FB Profile Pic.png";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import EmailVerificationForm from "@/components/email-verification-form";

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
  country: z.string().min(1, "Please select your country"),
  referralCode: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

// Resend Verification Schema
const resendSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

type LoginFormValues = z.infer<typeof loginSchema>;
type RegisterFormValues = z.infer<typeof registerSchema>;
type ResendFormValues = z.infer<typeof resendSchema>;

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
      country: "",
      referralCode: "",
    },
  });

  const onLoginSubmit = async (values: LoginFormValues) => {
    setIsLoading(true);
    setErrorMsg("");
    
    try {
      const response = await apiRequest("POST", "/api/auth/login", values);
      const data = await response.json();
      
      // Special handling for unverified emails 
      if (response.status === 403) {
        console.log("Login response:", data);
        
        // For email verification errors, show the verification form
        if (data.error === "Email not verified") {
          // Extract email from response if available, otherwise use the entered email
          const emailToVerify = data.email || values.email;
          
          // Show the verification form and pre-populate the email
          setPendingEmail(emailToVerify);
          setShowVerificationForm(true);
          return;
        }
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
        
        // Show the verification form directly
        setPendingEmail(values.email);
        setShowVerificationForm(true);
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

  // Handle successful verification
  const handleVerificationSuccess = () => {
    // Hide verification form
    setShowVerificationForm(false);
    setPendingEmail("");
    
    // Toast message
    toast({
      title: "Email verified successfully",
      description: "You are now logged in. Welcome to Drama Llama!",
    });
    
    // Redirect to home page after short delay
    setTimeout(() => {
      setLocation("/");
    }, 500);
  };

  return (
    <div className="flex min-h-[calc(100vh-80px)] bg-muted/40">
      {/* Left column: Auth forms */}
      <div className="flex flex-col justify-center items-center w-full lg:w-1/2 p-8">
        {showVerificationForm ? (
          // Show verification form if email is unverified
          <EmailVerificationForm 
            email={pendingEmail}
            onVerificationSuccess={handleVerificationSuccess}
            onCancel={() => {
              setShowVerificationForm(false);
              setPendingEmail("");
            }}
          />
        ) : (
          // Show login/register forms
          <Card className="w-full max-w-md shadow-lg">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-bold">Welcome to Drama Llama</CardTitle>
              <CardDescription>Sign up or log in to analyze your conversations</CardDescription>
            </CardHeader>
            
            <Tabs defaultValue="login" value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="login">Log In</TabsTrigger>
                <TabsTrigger value="register">Sign Up</TabsTrigger>
                <TabsTrigger value="resend">Resend Code</TabsTrigger>
              </TabsList>
              
              {errorMsg && (
                <Alert variant="destructive" className="mt-4 mx-6">
                  <AlertDescription>{errorMsg}</AlertDescription>
                </Alert>
              )}
              
              <TabsContent value="login">
                <CardContent className="pt-4">
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
                      
                      <div className="flex justify-end gap-4 my-2">
                        <Button 
                          variant="link" 
                          className="p-0 h-auto text-xs text-primary/80 hover:text-primary"
                          onClick={() => setLocation("/verify")}
                          type="button"
                        >
                          Need to verify your email?
                        </Button>
                        
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
                      
                      <FormField
                        control={registerForm.control}
                        name="country"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Country</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select your country" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="United Kingdom">United Kingdom</SelectItem>
                                <SelectItem value="Canada">Canada</SelectItem>
                                <SelectItem value="USA">USA</SelectItem>
                                <SelectItem value="Other">Other</SelectItem>
                              </SelectContent>
                            </Select>
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
              
              <TabsContent value="resend">
                <CardContent className="pt-4">
                  <ResendVerificationForm setErrorMsg={setErrorMsg} />
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
        )}
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
              <h3 className="font-semibold mb-2">WhatsApp Group Chat</h3>
              <p className="text-sm">Analyze group conversations to understand team dynamics.</p>
            </div>
            
            <div className="bg-white/30 p-4 rounded-lg shadow">
              <h3 className="font-semibold mb-2">Vent Mode</h3>
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

// Resend Verification Form Component
function ResendVerificationForm({ setErrorMsg }: { setErrorMsg: (msg: string) => void }) {
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const { toast } = useToast();

  const resendForm = useForm<ResendFormValues>({
    resolver: zodResolver(resendSchema),
    defaultValues: {
      email: "",
    },
  });

  const onResendSubmit = async (values: ResendFormValues) => {
    setIsLoading(true);
    setErrorMsg("");
    setSuccessMessage("");

    try {
      const response = await apiRequest("POST", "/api/auth/resend-verification", values);
      const data = await response.json();

      if (data.success) {
        setSuccessMessage("Verification email sent! Please check your inbox.");
        toast({
          title: "Email Sent",
          description: "Please check your email for the verification code.",
        });
        resendForm.reset();
      } else {
        setErrorMsg(data.message || "Failed to send verification email");
      }
    } catch (error: any) {
      setErrorMsg(error.message || "An error occurred while sending the verification email");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-4">
        <h3 className="text-lg font-semibold mb-2">Resend Verification Email</h3>
        <p className="text-sm text-muted-foreground">
          Didn't receive your verification email? Enter your email address below and we'll send you a new verification code.
        </p>
      </div>

      {successMessage && (
        <Alert className="mb-4">
          <AlertDescription>{successMessage}</AlertDescription>
        </Alert>
      )}

      <Form {...resendForm}>
        <form onSubmit={resendForm.handleSubmit(onResendSubmit)} className="space-y-4">
          <FormField
            control={resendForm.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email Address</FormLabel>
                <FormControl>
                  <Input 
                    type="email" 
                    placeholder="Enter your email address" 
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Sending..." : "Resend Verification Email"}
          </Button>
        </form>
      </Form>
    </div>
  );
}