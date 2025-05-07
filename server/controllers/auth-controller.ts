import { Request, Response } from "express";
import { storage } from "../storage";
import { z } from "zod";
import 'express-session';

// Augment express-session with custom properties
declare module 'express-session' {
  interface SessionData {
    userId: number;
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
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
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
      
      const user = await storage.createUser({
        username: validatedData.username,
        email: validatedData.email,
        password: hashedPassword,
        tier: "free" // Default tier
      });
      
      // Don't return the password
      const { password, ...userWithoutPassword } = user;
      
      // Set user in session
      if (req.session) {
        req.session.userId = user.id;
      }
      
      res.status(201).json(userWithoutPassword);
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
      
      const user = await storage.getUserByUsername(validatedData.username);
      if (!user) {
        return res.status(401).json({ error: "Invalid credentials" });
      }
      
      const isPasswordValid = verifyPassword(user.password, validatedData.password);
      if (!isPasswordValid) {
        return res.status(401).json({ error: "Invalid credentials" });
      }
      
      // Don't return the password
      const { password, ...userWithoutPassword } = user;
      
      // Set user in session
      if (req.session) {
        req.session.userId = user.id;
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
          message: updatedUsage.count === 1 ? "This is your free trial usage" : "Free trial already used" 
        });
      }
      
      // User has already used their free trial
      return res.status(200).json({ 
        canUse: false, 
        usageCount: usage.count,
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
  }
};