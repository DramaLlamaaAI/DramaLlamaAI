import { Request, Response } from "express";
import { storage } from "../storage";
import { z } from "zod";
import { InsertPromoCode } from "@shared/schema";

// Schema for creating a promo code
const createPromoCodeSchema = z.object({
  code: z.string().min(3, "Code must be at least 3 characters").max(20, "Code cannot exceed 20 characters"),
  discountPercentage: z.number().min(1, "Discount must be at least 1%").max(100, "Discount cannot exceed 100%"),
  maxUses: z.number().int().min(1, "Must allow at least 1 use"),
  expiryDays: z.number().int().min(0, "Days cannot be negative"),
  targetTier: z.string().optional(),
});

// Admin routes for managing promo codes
export const adminPromoCodeController = {
  // Get all promo codes (admin only)
  getAllPromoCodes: async (req: Request, res: Response) => {
    try {
      const promoCodes = await storage.getAllPromoCodes();
      res.json(promoCodes);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  // Create a new promo code (admin only)
  createPromoCode: async (req: Request, res: Response) => {
    try {
      const parseResult = createPromoCodeSchema.safeParse(req.body);
      
      if (!parseResult.success) {
        return res.status(400).json({ 
          success: false, 
          message: "Invalid promo code data",
          errors: parseResult.error.format()
        });
      }
      
      const { code, discountPercentage, maxUses, expiryDays, targetTier } = parseResult.data;
      
      // Calculate expiry date if specified
      const expiryDate = expiryDays > 0 
        ? new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000) 
        : null;
      
      // Create the promo code
      const promoCode: InsertPromoCode = {
        code: code.toUpperCase(),
        discountPercentage,
        maxUses,
        isActive: true,
        startDate: new Date(),
        expiryDate,
        targetTier: targetTier === 'any' ? null : targetTier,
        createdById: req.session.userId as number, // Set creator to current admin user
      };
      
      const newPromoCode = await storage.createPromoCode(promoCode);
      
      return res.status(200).json(newPromoCode);
    } catch (error: any) {
      console.error("Error creating promo code:", error);
      return res.status(500).json({ 
        success: false, 
        message: "An error occurred while creating the promo code",
        error: error.message
      });
    }
  },

  // Update a promo code (admin only)
  updatePromoCode: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const promoCode = await storage.getPromoCode(parseInt(id));
      
      if (!promoCode) {
        return res.status(404).json({ error: "Promo code not found" });
      }
      
      const updates = req.body;
      const updatedPromoCode = await storage.updatePromoCode(parseInt(id), updates);
      
      res.json(updatedPromoCode);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
};