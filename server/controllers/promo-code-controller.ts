import { Request, Response } from "express";
import { storage } from "../storage";
import { z } from "zod";
import { insertPromoCodeSchema } from "@shared/schema";

// Create validation schema for the promo code
const promoCodeCreateSchema = insertPromoCodeSchema.extend({
  expiryDate: z.string().optional(),
});

// Validation schema for updating promo code
const promoCodeUpdateSchema = promoCodeCreateSchema.partial();

// Schema for validating promo code redemption
const promoCodeRedeemSchema = z.object({
  code: z.string().min(1, "Promo code is required"),
});

export const promoCodeController = {
  // Create a new promo code
  createPromoCode: async (req: Request, res: Response) => {
    try {
      // Validate the request data
      const validatedData = promoCodeCreateSchema.parse(req.body);
      
      // Set the creator ID to the current user
      const createdById = req.session?.userId;
      if (!createdById) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      // Format dates
      const startDate = new Date(validatedData.startDate);
      const expiryDate = validatedData.expiryDate ? new Date(validatedData.expiryDate) : null;
      
      // Create the promo code
      const promoCode = await storage.createPromoCode({
        ...validatedData,
        createdById,
        startDate,
        expiryDate,
      });
      
      return res.status(201).json(promoCode);
    } catch (error: any) {
      console.error("Error creating promo code:", error);
      return res.status(400).json({ error: error.message || "Failed to create promo code" });
    }
  },
  
  // Get all promo codes
  getAllPromoCodes: async (req: Request, res: Response) => {
    try {
      const promoCodes = await storage.getAllPromoCodes();
      return res.json(promoCodes);
    } catch (error: any) {
      console.error("Error retrieving promo codes:", error);
      return res.status(500).json({ error: error.message || "Failed to retrieve promo codes" });
    }
  },
  
  // Get active promo codes
  getActivePromoCodes: async (req: Request, res: Response) => {
    try {
      const activeCodes = await storage.getActivePromoCodes();
      return res.json(activeCodes);
    } catch (error: any) {
      console.error("Error retrieving active promo codes:", error);
      return res.status(500).json({ error: error.message || "Failed to retrieve active promo codes" });
    }
  },
  
  // Get a specific promo code by ID
  getPromoCode: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const promoCode = await storage.getPromoCode(parseInt(id));
      
      if (!promoCode) {
        return res.status(404).json({ error: "Promo code not found" });
      }
      
      return res.json(promoCode);
    } catch (error: any) {
      console.error("Error retrieving promo code:", error);
      return res.status(500).json({ error: error.message || "Failed to retrieve promo code" });
    }
  },
  
  // Update a promo code
  updatePromoCode: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const validatedData = promoCodeUpdateSchema.parse(req.body);
      
      // Format dates if provided
      const updates: any = { ...validatedData };
      if (validatedData.startDate) {
        updates.startDate = new Date(validatedData.startDate);
      }
      if (validatedData.expiryDate) {
        updates.expiryDate = new Date(validatedData.expiryDate);
      }
      
      const updatedPromoCode = await storage.updatePromoCode(parseInt(id), updates);
      return res.json(updatedPromoCode);
    } catch (error: any) {
      console.error("Error updating promo code:", error);
      
      if (error.message && error.message.includes("not found")) {
        return res.status(404).json({ error: error.message });
      }
      
      return res.status(400).json({ error: error.message || "Failed to update promo code" });
    }
  },
  
  // Delete a promo code
  deletePromoCode: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const promoCode = await storage.getPromoCode(parseInt(id));
      
      if (!promoCode) {
        return res.status(404).json({ error: "Promo code not found" });
      }
      
      // Deactivate the promo code instead of deleting it
      await storage.updatePromoCode(parseInt(id), { isActive: false });
      
      return res.json({ success: true, message: "Promo code deleted successfully" });
    } catch (error: any) {
      console.error("Error deleting promo code:", error);
      return res.status(500).json({ error: error.message || "Failed to delete promo code" });
    }
  },
  
  // Redeem a promo code
  redeemPromoCode: async (req: Request, res: Response) => {
    try {
      const { code } = promoCodeRedeemSchema.parse(req.body);
      
      if (!req.session?.userId) {
        return res.status(401).json({ error: "You must be logged in to redeem a promo code" });
      }
      
      // Get user from storage
      const user = await storage.getUser(req.session.userId);
      if (!user) {
        return res.status(401).json({ error: "User not found" });
      }
      
      const result = await storage.usePromoCode(code, user.id, user.tier);
      
      if (!result.success) {
        return res.status(400).json({ 
          success: false, 
          message: result.message || "Failed to redeem promo code" 
        });
      }
      
      return res.json(result);
    } catch (error: any) {
      console.error("Error redeeming promo code:", error);
      return res.status(400).json({ 
        success: false, 
        message: error.message || "Failed to redeem promo code" 
      });
    }
  }
};