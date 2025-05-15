import { Request, Response, NextFunction } from "express";
import { storage } from "../storage";
import { z } from "zod";

// Admin middleware that checks if user is an admin
export const isAdmin = async (req: Request, res: Response, next: NextFunction) => {
  console.log("Admin middleware - Session data:", { 
    hasSession: !!req.session, 
    sessionId: req.session?.id,
    userId: req.session?.userId,
    userTier: req.session?.userTier,
    cookieData: req.headers.cookie
  });
  
  const userId = (req.session as any).userId;
  
  if (!userId) {
    console.log("Admin access denied: No user ID in session");
    return res.status(401).json({ error: "Unauthorized" });
  }
  
  const user = await storage.getUser(userId);
  console.log("Admin check - User from DB:", { 
    userId,
    foundUser: !!user,
    isAdmin: user?.isAdmin,
    email: user?.email
  });
  
  if (!user) {
    console.log("Admin access denied: User not found in database");
    return res.status(404).json({ error: "User not found" });
  }
  
  if (!user.isAdmin) {
    console.log("Admin access denied: User is not an admin");
    return res.status(403).json({ error: "Forbidden: Admin access required" });
  }
  
  console.log("Admin access granted for user:", user.email);
  next();
};

// Admin routes for managing users and tiers
export const adminController = {
  // Get all users (admin only)
  getAllUsers: async (req: Request, res: Response) => {
    try {
      const users = await storage.getAllUsers();
      
      // Remove sensitive data like passwords
      const safeUsers = users.map(user => {
        const { password, verificationCode, ...safeUser } = user;
        return safeUser;
      });
      
      return res.status(200).json(safeUsers);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  },
  
  // Update user tier (admin only)
  updateUserTier: async (req: Request, res: Response) => {
    try {
      const schema = z.object({
        userId: z.number(),
        tier: z.enum(["free", "personal", "pro", "instant"])
      });
      
      const validatedData = schema.parse(req.body);
      const { userId, tier } = validatedData;
      
      // Get current user to track the tier change
      const currentUser = await storage.getUser(userId);
      const oldTier = currentUser?.tier || 'free';
      
      const updatedUser = await storage.updateUserTier(userId, tier);
      
      // Track tier change event for analytics
      await storage.trackUserEvent({
        userId: userId,
        eventType: 'tier_change',
        oldValue: oldTier,
        newValue: tier
      });
      
      const { password, verificationCode, ...safeUser } = updatedUser;
      return res.status(200).json(safeUser);
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  },
  
  // Make user an admin (super-admin only)
  makeUserAdmin: async (req: Request, res: Response) => {
    try {
      const schema = z.object({
        userId: z.number(),
        isAdmin: z.boolean()
      });
      
      const validatedData = schema.parse(req.body);
      const { userId, isAdmin } = validatedData;
      
      // Check if this is the specific admin with the email dramallamaconsultancy@gmail.com
      const requesterUserId = (req.session as any).userId;
      const requester = await storage.getUser(requesterUserId);
      
      if (requester?.email !== "dramallamaconsultancy@gmail.com") {
        return res.status(403).json({ error: "Forbidden: Only the main admin can set admin privileges" });
      }
      
      const updatedUser = await storage.setUserAdmin(userId, isAdmin);
      
      const { password, verificationCode, ...safeUser } = updatedUser;
      return res.status(200).json(safeUser);
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  },
  
  // Set user discount (admin only)
  setUserDiscount: async (req: Request, res: Response) => {
    try {
      const schema = z.object({
        userId: z.number(),
        discountPercentage: z.number().min(0).max(100),
        expiryDays: z.number().optional()
      });
      
      const validatedData = schema.parse(req.body);
      const { userId, discountPercentage, expiryDays } = validatedData;
      
      const updatedUser = await storage.setUserDiscount(
        userId, 
        discountPercentage, 
        expiryDays
      );
      
      const { password, verificationCode, ...safeUser } = updatedUser;
      return res.status(200).json(safeUser);
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  }
};