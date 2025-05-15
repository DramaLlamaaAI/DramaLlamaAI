import { Request, Response } from "express";
import { z } from "zod";
import { storage } from "../storage";

// Define interface to extend Express.Request
declare global {
  namespace Express {
    interface User {
      id: number;
      tier: string;
    }
  }
}

const redeemSchema = z.object({
  code: z.string().min(1).max(20)
});

export const promoCodeController = {
  // Get all active promo codes (admin only)
  getAllActive: async (req: Request, res: Response) => {
    try {
      const promoCodes = await storage.getActivePromoCodes();
      res.json(promoCodes);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
  
  // Redeem a promo code
  redeemCode: async (req: Request, res: Response) => {
    try {
      const parseResult = redeemSchema.safeParse(req.body);
      
      if (!parseResult.success) {
        return res.status(400).json({ 
          success: false, 
          message: "Invalid promo code format" 
        });
      }
      
      const { code } = parseResult.data;
      
      // Get user's tier and id if authenticated
      const tier = req.session?.userTier || 'free';
      const userId = req.session?.userId || 0; // Anonymous users get 0
      
      // Try to use the promo code
      const result = await storage.usePromoCode(code, userId, tier);
      
      // Return result
      return res.json(result);
    } catch (error: any) {
      console.error("Error redeeming promo code:", error);
      return res.status(500).json({ 
        success: false, 
        message: "An error occurred while processing your promo code" 
      });
    }
  },
  
  // Check if a user has already used a promo code
  getUserPromoUsage: async (req: Request, res: Response) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const userId = req.session.userId;
      const promoUsage = await storage.getPromoUsageByUser(userId);
      
      res.json({ promoUsage });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
};