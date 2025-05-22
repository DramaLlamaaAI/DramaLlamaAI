import { Request, Response } from "express";
import { storage } from "../storage";
import { z } from "zod";
import { sendEmail } from "../services/resend-email-service";

// Schema for bulk discount data
const bulkDiscountSchema = z.object({
  discountPercentage: z.number().min(1).max(100),
  expiryDays: z.number().min(1).optional(),
  exactExpiryDate: z.string().optional(),
  useExactDate: z.boolean().default(false),
  sendEmail: z.boolean().default(true),
  emailTemplate: z.string().optional(),
  tierFilter: z.string().optional(),
  userIds: z.array(z.number()),
});

// Schema for discount campaign data
const discountCampaignSchema = z.object({
  name: z.string().min(1, "Campaign name is required"),
  description: z.string().optional(),
  discountPercentage: z.number().min(1).max(100),
  startDate: z.date(),
  endDate: z.date(),
  upgradeDiscount: z.boolean().default(false),
  upgradeDiscountPercentage: z.number().min(1).max(100).optional(),
  limitedTimeOffer: z.boolean().default(false),
  limitedTimeHours: z.number().min(1).optional(),
  appliesTo: z.enum(["all", "free", "personal", "pro", "beta"]),
  autoEmail: z.boolean().default(true),
  emailTemplate: z.string().optional(),
});

// Schema for subscription data
const subscriptionSchema = z.object({
  userId: z.number(),
  plan: z.string(),
});

// Schema for subscription cancellation data
const subscriptionCancelSchema = z.object({
  userId: z.number(),
});

// Controllers for admin discount-related operations
export const adminDiscountController = {
  // Apply bulk discount to multiple users
  applyBulkDiscount: async (req: Request, res: Response) => {
    try {
      const validatedData = bulkDiscountSchema.parse(req.body);
      const { 
        discountPercentage, 
        expiryDays, 
        exactExpiryDate, 
        useExactDate,
        sendEmail: shouldSendEmail,
        emailTemplate,
        userIds 
      } = validatedData;
      
      // Calculate expiry date
      let expiryDate: Date;
      if (useExactDate && exactExpiryDate) {
        expiryDate = new Date(exactExpiryDate);
      } else {
        expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + (expiryDays || 30));
      }
      
      // Check if any of the users don't exist
      const nonExistentUserIds: number[] = [];
      const existingUsers = [];
      
      for (const userId of userIds) {
        const user = await storage.getUser(userId);
        if (!user) {
          nonExistentUserIds.push(userId);
        } else {
          existingUsers.push(user);
        }
      }
      
      if (nonExistentUserIds.length > 0) {
        return res.status(400).json({
          error: "Some users don't exist",
          nonExistentUserIds
        });
      }
      
      // Apply discount to each user
      const updatedUsers = [];
      for (const userId of userIds) {
        const user = await storage.setUserDiscount(
          userId,
          discountPercentage,
          Math.ceil((expiryDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
        );
        updatedUsers.push(user);
        
        // Track the event
        await storage.trackUserEvent({
          userId: userId,
          eventType: 'discount_applied',
          oldValue: '0',
          newValue: discountPercentage.toString()
        });
      }
      
      // Send email notifications if requested
      if (shouldSendEmail) {
        for (const user of existingUsers) {
          try {
            await sendEmail({
              to: user.email,
              subject: `Special ${discountPercentage}% Discount for You - Drama Llama`,
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                  <h2 style="color: #22C9C9;">Special Discount Just For You!</h2>
                  <p>Hi ${user.username},</p>
                  <p>We're excited to offer you a special ${discountPercentage}% discount on all Drama Llama plans!</p>
                  <p>This discount will automatically be applied to your account until ${expiryDate.toLocaleDateString()}.</p>
                  <p>Log in to your account to take advantage of this offer.</p>
                  <p>Thank you for being a valued Drama Llama user!</p>
                  <p>Best regards,<br>The Drama Llama Team</p>
                </div>
              `,
              text: `
                Special Discount Just For You!
                
                Hi ${user.username},
                
                We're excited to offer you a special ${discountPercentage}% discount on all Drama Llama plans!
                
                This discount will automatically be applied to your account until ${expiryDate.toLocaleDateString()}.
                
                Log in to your account to take advantage of this offer.
                
                Thank you for being a valued Drama Llama user!
                
                Best regards,
                The Drama Llama Team
              `,
            });
          } catch (error) {
            console.error(`Failed to send email to user ${user.id}:`, error);
          }
        }
      }
      
      return res.status(200).json({
        message: "Bulk discount applied successfully",
        affectedCount: updatedUsers.length,
        affectedUsers: updatedUsers.map(u => ({ id: u.id, username: u.username, email: u.email }))
      });
    } catch (error: any) {
      console.error("Bulk discount error:", error);
      return res.status(400).json({ error: error.message });
    }
  },
  
  // Create a discount campaign
  createDiscountCampaign: async (req: Request, res: Response) => {
    try {
      const validatedData = discountCampaignSchema.parse(req.body);
      
      // We would typically save this campaign to a database
      // For now, we'll just return it with a mock ID
      return res.status(201).json({
        id: Math.floor(Math.random() * 10000),
        ...validatedData,
        createdAt: new Date(),
        status: "active"
      });
    } catch (error: any) {
      console.error("Discount campaign error:", error);
      return res.status(400).json({ error: error.message });
    }
  },
  
  // Get subscription details
  getSubscription: async (req: Request, res: Response) => {
    try {
      const subscriptionId = req.params.id;
      
      // In a real implementation, this would fetch from Stripe
      // For now, return mock data
      return res.status(200).json({
        id: subscriptionId,
        customerId: "cus_mock123456",
        plan: "pro",
        status: "active",
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        cancelAtPeriodEnd: false
      });
    } catch (error: any) {
      console.error("Get subscription error:", error);
      return res.status(400).json({ error: error.message });
    }
  },
  
  // Update a subscription
  updateSubscription: async (req: Request, res: Response) => {
    try {
      const validatedData = subscriptionSchema.parse(req.body);
      const { userId, plan } = validatedData;
      
      // Get the user
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      // Update the user's tier
      const updatedUser = await storage.updateUserTier(userId, plan);
      
      // Track tier change event
      await storage.trackUserEvent({
        userId: userId,
        eventType: 'tier_change',
        oldValue: user.tier,
        newValue: plan
      });
      
      // We would typically update the subscription in Stripe here
      
      return res.status(200).json({
        message: "Subscription updated successfully",
        user: {
          id: updatedUser.id,
          username: updatedUser.username,
          email: updatedUser.email,
          tier: updatedUser.tier
        }
      });
    } catch (error: any) {
      console.error("Update subscription error:", error);
      return res.status(400).json({ error: error.message });
    }
  },
  
  // Cancel a subscription
  cancelSubscription: async (req: Request, res: Response) => {
    try {
      const validatedData = subscriptionCancelSchema.parse(req.body);
      const { userId } = validatedData;
      
      // Get the user
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      // We would typically cancel the subscription in Stripe here
      
      // Track cancellation event
      await storage.trackUserEvent({
        userId: userId,
        eventType: 'subscription_cancelled',
        oldValue: user.tier,
        newValue: 'cancelled'
      });
      
      return res.status(200).json({
        message: "Subscription cancellation scheduled for end of billing period",
        userId
      });
    } catch (error: any) {
      console.error("Cancel subscription error:", error);
      return res.status(400).json({ error: error.message });
    }
  },
  
  // Reactivate a cancelled subscription
  reactivateSubscription: async (req: Request, res: Response) => {
    try {
      const validatedData = subscriptionCancelSchema.parse(req.body);
      const { userId } = validatedData;
      
      // Get the user
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      // We would typically reactivate the subscription in Stripe here
      
      // Track reactivation event
      await storage.trackUserEvent({
        userId: userId,
        eventType: 'subscription_reactivated',
        oldValue: 'cancelled',
        newValue: user.tier
      });
      
      return res.status(200).json({
        message: "Subscription reactivated successfully",
        userId
      });
    } catch (error: any) {
      console.error("Reactivate subscription error:", error);
      return res.status(400).json({ error: error.message });
    }
  }
};