import { Request, Response } from "express";
import { storage } from "../storage";
import { insertReferralCodeSchema } from "@shared/schema";
import { z } from "zod";

export const referralCodeController = {
  // Create a new referral code
  async createReferralCode(req: Request, res: Response) {
    try {
      const validatedData = insertReferralCodeSchema.parse(req.body);
      
      // Check if code already exists
      const existingCode = await storage.getReferralCodeByCode(validatedData.code.toUpperCase());
      if (existingCode) {
        return res.status(400).json({ 
          success: false, 
          message: "Referral code already exists" 
        });
      }

      const referralCode = await storage.createReferralCode({
        ...validatedData,
        code: validatedData.code.toUpperCase(),
        createdById: req.session?.userId || 1, // Default to admin
      });

      res.status(201).json({
        success: true,
        referralCode,
        message: "Referral code created successfully"
      });
    } catch (error: any) {
      console.error("Error creating referral code:", error);
      res.status(500).json({ 
        success: false, 
        message: error.message || "Failed to create referral code" 
      });
    }
  },

  // Get all referral codes
  async getAllReferralCodes(req: Request, res: Response) {
    try {
      const referralCodes = await storage.getAllReferralCodes();
      res.status(200).json(referralCodes);
    } catch (error: any) {
      console.error("Error fetching referral codes:", error);
      res.status(500).json({ message: "Failed to fetch referral codes" });
    }
  },

  // Get referral code stats
  async getReferralStats(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const referralCodeId = id ? parseInt(id) : undefined;
      
      const stats = await storage.getReferralStats(referralCodeId);
      res.status(200).json(stats);
    } catch (error: any) {
      console.error("Error fetching referral stats:", error);
      res.status(500).json({ message: "Failed to fetch referral stats" });
    }
  },

  // Update referral code
  async updateReferralCode(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      const referralCode = await storage.updateReferralCode(parseInt(id), updates);
      res.status(200).json({
        success: true,
        referralCode,
        message: "Referral code updated successfully"
      });
    } catch (error: any) {
      console.error("Error updating referral code:", error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to update referral code" 
      });
    }
  },

  // Validate referral code (public endpoint)
  async validateReferralCode(req: Request, res: Response) {
    try {
      const { code } = req.params;
      
      const validation = await storage.validateReferralCode(code.toUpperCase());
      res.status(200).json(validation);
    } catch (error: any) {
      console.error("Error validating referral code:", error);
      res.status(500).json({ 
        valid: false, 
        message: "Failed to validate referral code" 
      });
    }
  }
};