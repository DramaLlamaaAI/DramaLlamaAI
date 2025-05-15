import { Request, Response } from "express";
import { storage } from "../storage";

// Controller for promo code analytics and reporting
export const promoCodeReportController = {
  // Get report on promo code usage
  getPromoCodeUsageReport: async (req: Request, res: Response) => {
    try {
      // Get all promo codes
      const allPromoCodes = await storage.getAllPromoCodes();
      
      // Get all promo usage records
      const allPromoUsages = await storage.getAllPromoUsages();
      
      // Calculate metrics for each promo code
      const report = allPromoCodes.map(promoCode => {
        // Filter usages for this code
        const codeUsages = allPromoUsages.filter(usage => usage.promoCodeId === promoCode.id);
        
        // Count usages
        const usageCount = codeUsages.length;
        
        // Calculate conversion rate (simplified example)
        // In a real app, you'd need to track impressions vs. redemptions
        const conversionRate = promoCode.maxUses > 0 ? usageCount / promoCode.maxUses : 0;
        
        // Calculate total discount amount
        const discountAmount = codeUsages.reduce((total, usage) => {
          // This is a simplified calculation
          // In a real app, you'd have the actual discount amount saved per usage
          return total + (usage.discountAmount || 0);
        }, 0);
        
        return {
          code: promoCode.code,
          usageCount,
          conversionRate,
          discountAmount,
          isActive: promoCode.isActive,
          createdAt: promoCode.createdAt,
          expiresAt: promoCode.expiresAt,
        };
      });
      
      res.status(200).json(report);
    } catch (error) {
      console.error("Error generating promo code report:", error);
      res.status(500).json({ message: "Failed to generate promo code report" });
    }
  }
};