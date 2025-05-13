import { Request, Response } from "express";
import { storage } from "../storage";
import { z } from "zod";
import 'express-session';
import { 
  generateVerificationCode, 
  sendVerificationEmail 
} from '../services/resend-email-service';

// Augment express-session with custom properties
declare module 'express-session' {
  interface SessionData {
    userId: number;
    userTier: string;
  }
}
import * as crypto from "crypto";

// Simple password hashing
function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(storedPassword: string, suppliedPassword: string): boolean {
  const [salt, storedHash] = storedPassword.split(":");
  const hash = crypto.pbkdf2Sync(suppliedPassword, salt, 1000, 64, "sha512").toString("hex");
  return storedHash === hash;
}

// Schema for login
const loginSchema = z.object({
  username: z.string().optional(),
  email: z.string().optional(),
  password: z.string().min(1, "Password is required"),
}).refine(data => data.username || data.email, {
  message: "Either username or email is required",
  path: ["username"]
});

// Schema for registration
const registerSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

// Schema for usage tracking with device ID
const trackAnonymousSchema = z.object({
  deviceId: z.string().min(1, "Device ID is required"),
});

// Schema for email verification
const verifyEmailSchema = z.object({
  code: z.string().min(6, "Verification code is required"),
});

// Schema for resending verification email
const resendVerificationSchema = z.object({
  email: z.string().email("Invalid email address"),
});

export const authController = {
  // User registration
  register: async (req: Request, res: Response) => {
    try {
      const validatedData = registerSchema.parse(req.body);
      
      // Check if username or email already exists
      const existingUsername = await storage.getUserByUsername(validatedData.username);
      if (existingUsername) {
        return res.status(400).json({ error: "Username already taken" });
      }
      
      const existingEmail = await storage.getUserByEmail(validatedData.email);
      if (existingEmail) {
        return res.status(400).json({ error: "Email already registered" });
      }
      
      // Hash password and create user
      const hashedPassword = hashPassword(validatedData.password);
      
      // Check if this is the admin email
      const isAdminEmail = validatedData.email.toLowerCase() === 'dramallamaconsultancy@gmail.com';
      
      const user = await storage.createUser({
        username: validatedData.username,
        email: validatedData.email.toLowerCase(),
        password: hashedPassword,
        tier: isAdminEmail ? "pro" : "free" // Admin gets pro by default
      });
      
      // Track registration event for analytics
      await storage.trackUserEvent({
        userId: user.id,
        eventType: 'registration',
        oldValue: null,
        newValue: user.tier
      });
      
      // If this is the admin email, set admin flag
      if (isAdminEmail) {
        await storage.setUserAdmin(user.id, true);
      }
      
      // Generate verification code
      const verificationCode = generateVerificationCode();
      
      // Set verification code in user record (expires in 24 hours)
      await storage.setVerificationCode(user.id, verificationCode, 24 * 60);
      
      // Try to send verification email
      const emailSent = await sendVerificationEmail(user, verificationCode);
      
      // Don't return the password
      const { password, ...userWithoutPassword } = user;
      
      // Set user in session
      if (req.session) {
        req.session.userId = user.id;
        req.session.userTier = user.tier || 'free';
      }
      
      // Check if we have Resend API key configured
      const hasEmailService = !!process.env.RESEND_API_KEY;
      
      // If email couldn't be sent or there's no email service, include the verification code in the response
      // so user can verify manually
      res.status(201).json({ 
        ...userWithoutPassword,
        verificationNeeded: true,
        verificationCode: (!emailSent || !hasEmailService) ? verificationCode : undefined,
        emailSent,
        emailServiceConfigured: hasEmailService
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: error.errors[0].message });
      } else {
        console.error("Registration error:", error);
        res.status(500).json({ error: "Registration failed" });
      }
    }
  },
  
  // User login
  login: async (req: Request, res: Response) => {
    try {
      const validatedData = loginSchema.parse(req.body);
      
      // Look up the user by username or email
      let user;
      if (validatedData.email && typeof validatedData.email === 'string') {
        // Get all users to debug email matching issues
        const allUsers = await storage.getAllUsers();
        console.log("All emails in system:", allUsers.map(u => u.email).join(", "));
        
        user = await storage.getUserByEmail(validatedData.email);
        console.log(`Looking up user by email: ${validatedData.email} (normalized to ${validatedData.email.toLowerCase()}), found:`, user?.username);
      } else if (validatedData.username && typeof validatedData.username === 'string') {
        user = await storage.getUserByUsername(validatedData.username);
        console.log(`Looking up user by username: ${validatedData.username}, found:`, user?.username);
      }
      
      if (!user) {
        return res.status(401).json({ error: "Invalid credentials" });
      }
      
      console.log(`Authenticating user: ${user.username}, email: ${user.email}, password hash format: ${user.password.includes(':') ? 'Correct' : 'Invalid'}`);
      
      const isPasswordValid = verifyPassword(user.password, validatedData.password);
      if (!isPasswordValid) {
        return res.status(401).json({ error: "Invalid credentials" });
      }
      
      // Check if email is verified (skip this check if no verification system is in place)
      if (user.emailVerified !== undefined && !user.emailVerified) {
        // If email is not verified, but there's an active verification code
        if (user.verificationCode && user.verificationCodeExpires && user.verificationCodeExpires > new Date()) {
          return res.status(403).json({ 
            error: "Email not verified", 
            message: "Please verify your email address before logging in.",
            needsVerification: true
          });
        } else {
          // Generate a new verification code
          const verificationCode = generateVerificationCode();
          await storage.setVerificationCode(user.id, verificationCode, 24 * 60);
          
          // Try to send verification email
          const emailSent = await sendVerificationEmail(user, verificationCode);
          
          return res.status(403).json({ 
            error: "Email not verified", 
            message: "A new verification email has been sent to your email address.",
            verificationCode: !emailSent ? verificationCode : undefined,
            emailSent,
            needsVerification: true
          });
        }
      }
      
      // Don't return the password
      const { password, ...userWithoutPassword } = user;
      
      // Set user in session
      if (req.session) {
        req.session.userId = user.id;
        req.session.userTier = user.tier || 'free';
      }
      
      res.status(200).json(userWithoutPassword);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: error.errors[0].message });
      } else {
        console.error("Login error:", error);
        res.status(500).json({ error: "Login failed" });
      }
    }
  },
  
  // User logout
  logout: (req: Request, res: Response) => {
    if (req.session) {
      req.session.destroy((err) => {
        if (err) {
          return res.status(500).json({ error: "Logout failed" });
        }
        res.clearCookie("connect.sid");
        res.status(200).json({ message: "Logged out successfully" });
      });
    } else {
      res.status(200).json({ message: "Not logged in" });
    }
  },
  
  // Get current user
  getCurrentUser: async (req: Request, res: Response) => {
    try {
      if (!req.session || !req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const user = await storage.getUser(req.session.userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      // Don't return the password
      const { password, ...userWithoutPassword } = user;
      
      res.status(200).json(userWithoutPassword);
    } catch (error) {
      console.error("Get current user error:", error);
      res.status(500).json({ error: "Failed to get user information" });
    }
  },
  
  // Track anonymous usage
  trackAnonymousUsage: async (req: Request, res: Response) => {
    try {
      const { deviceId } = trackAnonymousSchema.parse(req.body);
      
      // Check current usage
      const usage = await storage.getAnonymousUsage(deviceId);
      
      // If no usage recorded yet, or count is less than 1, allow the free trial
      if (!usage || usage.count < 1) {
        // Increment and return
        const updatedUsage = await storage.incrementAnonymousUsage(deviceId);
        return res.status(200).json({ 
          canUse: true, 
          usageCount: updatedUsage.count,
          remaining: updatedUsage.count < 1 ? 1 : 0,
          message: updatedUsage.count === 1 ? "This is your free trial usage" : "Free trial already used" 
        });
      }
      
      // User has already used their free trial
      return res.status(200).json({ 
        canUse: false, 
        usageCount: usage.count,
        remaining: 0,
        message: "Free trial already used. Please sign up or log in to continue."
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: error.errors[0].message });
      } else {
        console.error("Track usage error:", error);
        res.status(500).json({ error: "Failed to track usage" });
      }
    }
  },
  
  // Get user usage stats
  getUserUsage: async (req: Request, res: Response) => {
    try {
      // Check for dev mode tier in headers
      const devTier = req.headers['x-dev-tier'] as string;
      const devMode = req.headers['x-dev-mode'] as string;
      
      // If dev mode is enabled and a tier is specified, return that tier's info
      if (devMode === 'true' && devTier && ['free', 'personal', 'pro', 'instant'].includes(devTier)) {
        console.log(`Developer mode active: Using tier ${devTier} for testing`);
        const tierLimits = {
          free: 1,
          personal: 10,
          pro: 100,
          instant: 1
        };
        
        return res.status(200).json({ 
          tier: devTier, 
          used: 0, 
          limit: tierLimits[devTier as keyof typeof tierLimits], 
          remaining: tierLimits[devTier as keyof typeof tierLimits],
          isDev: true
        });
      }
      
      // Regular flow for non-dev mode
      if (!req.session || !req.session.userId) {
        // Return free tier info for non-authenticated users
        return res.status(200).json({ tier: "free", used: 0, limit: 1, remaining: 1 });
      }
      
      const userId = req.session.userId;
      const usage = await storage.getUserUsage(userId);
      
      res.status(200).json(usage);
    } catch (error) {
      console.error("Get usage error:", error);
      res.status(500).json({ error: "Failed to get usage information" });
    }
  },
  
  // Verify email with code
  verifyEmail: async (req: Request, res: Response) => {
    try {
      const { code } = verifyEmailSchema.parse(req.body);
      
      // Check if the verification code is valid
      const user = await storage.getUserByVerificationCode(code);
      if (!user) {
        return res.status(400).json({ 
          error: "Invalid verification code",
          message: "The verification code is invalid or has expired."
        });
      }
      
      // Mark the email as verified
      await storage.verifyEmail(user.id);
      
      // If user is not already logged in, log them in
      if (req.session && !req.session.userId) {
        req.session.userId = user.id;
        req.session.userTier = user.tier || 'free';
      }
      
      // Return updated user info (without password)
      const updatedUser = await storage.getUser(user.id);
      if (!updatedUser) {
        return res.status(404).json({ error: "User not found" });
      }
      
      const { password, ...userWithoutPassword } = updatedUser;
      
      res.status(200).json({
        ...userWithoutPassword,
        message: "Email verified successfully!"
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: error.errors[0].message });
      } else {
        console.error("Email verification error:", error);
        res.status(500).json({ error: "Email verification failed" });
      }
    }
  },
  
  // Resend verification email
  resendVerification: async (req: Request, res: Response) => {
    try {
      const { email } = resendVerificationSchema.parse(req.body);
      
      // Check if the email exists
      const user = await storage.getUserByEmail(email);
      if (!user) {
        // For security, don't reveal that the email doesn't exist
        return res.status(200).json({ 
          message: "If your email is registered, a verification link has been sent."
        });
      }
      
      // Check if the email is already verified
      if (user.emailVerified) {
        return res.status(400).json({ 
          error: "Email already verified",
          message: "Your email is already verified."
        });
      }
      
      // Generate new verification code
      const verificationCode = generateVerificationCode();
      
      // Set new verification code in user record (expires in 24 hours)
      await storage.setVerificationCode(user.id, verificationCode, 24 * 60);
      
      // Check if email service is configured
      const hasEmailService = !!process.env.RESEND_API_KEY;
      
      // Try to send verification email
      const emailSent = await sendVerificationEmail(user, verificationCode);
      
      res.status(200).json({ 
        message: "Verification email sent successfully!",
        verificationCode: (!emailSent || !hasEmailService) ? verificationCode : undefined,
        emailSent,
        emailServiceConfigured: hasEmailService
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: error.errors[0].message });
      } else {
        console.error("Resend verification error:", error);
        res.status(500).json({ error: "Failed to resend verification email" });
      }
    }
  }
};