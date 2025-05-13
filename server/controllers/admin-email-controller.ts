import { Request, Response } from "express";
import { storage } from "../storage";
import { z } from "zod";
import { sendEmail } from "../services/resend-email-service";
import { DRAMA_LLAMA_LOGO_BASE64 } from "../services/logo-data";

// Schema for bulk email data
const bulkEmailSchema = z.object({
  subject: z.string().min(1, "Subject is required"),
  body: z.string().min(1, "Email body is required"),
  userIds: z.array(z.number()),
  includeLogo: z.boolean().default(true),
  includeFooter: z.boolean().default(true),
  isPreview: z.boolean().default(false),
  previewEmail: z.string().email().optional(),
});

// Controllers for admin email operations
export const adminEmailController = {
  // Send bulk emails
  sendBulkEmails: async (req: Request, res: Response) => {
    try {
      const validatedData = bulkEmailSchema.parse(req.body);
      const { 
        subject, 
        body, 
        userIds, 
        includeLogo, 
        includeFooter,
        isPreview,
        previewEmail 
      } = validatedData;
      
      // Handle preview mode
      if (isPreview && previewEmail) {
        // Send a preview to the admin's email
        const demoUser = {
          id: 0,
          username: "Demo User",
          email: previewEmail,
          tier: "pro"
        };
        
        const emailResult = await sendFormattedEmail(
          demoUser,
          subject,
          body,
          includeLogo,
          includeFooter
        );
        
        return res.status(200).json({
          message: "Preview email sent successfully",
          sentTo: previewEmail,
          success: emailResult
        });
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
      
      // Send emails
      const emailResults = [];
      for (const user of existingUsers) {
        try {
          const emailResult = await sendFormattedEmail(
            user,
            subject,
            body,
            includeLogo,
            includeFooter
          );
          
          emailResults.push({
            userId: user.id,
            email: user.email,
            success: emailResult
          });
          
          // Track email sent event
          await storage.trackUserEvent({
            userId: user.id,
            eventType: 'email_sent',
            oldValue: 'admin_initiated',
            newValue: subject.substring(0, 50)
          });
        } catch (error) {
          console.error(`Failed to send email to user ${user.id}:`, error);
          emailResults.push({
            userId: user.id,
            email: user.email,
            success: false
          });
        }
      }
      
      const successCount = emailResults.filter(r => r.success).length;
      
      return res.status(200).json({
        message: `Emails sent successfully to ${successCount} out of ${emailResults.length} users`,
        sentCount: successCount,
        totalCount: emailResults.length,
        details: emailResults
      });
    } catch (error: any) {
      console.error("Bulk email error:", error);
      return res.status(400).json({ error: error.message });
    }
  }
};

// Helper function to format and send emails
async function sendFormattedEmail(
  user: { username: string; email: string; tier?: string },
  subject: string,
  body: string,
  includeLogo: boolean,
  includeFooter: boolean
): Promise<boolean> {
  try {
    // Replace variables in the email content
    let processedBody = body
      .replace(/{{username}}/g, user.username)
      .replace(/{{email}}/g, user.email);
      
    if (user.tier) {
      processedBody = processedBody.replace(/{{tier}}/g, user.tier);
    }
    
    // Add logo if requested
    let htmlContent = `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">`;
    
    if (includeLogo) {
      htmlContent += `
        <div style="text-align: center; margin-bottom: 20px;">
          <img src="data:image/svg+xml;base64,${DRAMA_LLAMA_LOGO_BASE64}" alt="Drama Llama Logo" style="width: 120px; height: auto;" />
        </div>
      `;
    }
    
    // Add the main content
    htmlContent += `
      <div style="padding: 20px; border-radius: 8px; background-color: #f9f9f9;">
        ${processedBody.replace(/\n/g, '<br/>')}
      </div>
    `;
    
    // Add footer if requested
    if (includeFooter) {
      htmlContent += `
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666;">
          <p>© ${new Date().getFullYear()} Drama Llama AI. All rights reserved.</p>
          <p>This email was sent to ${user.email}. If you no longer wish to receive these emails, you can
          <a href="#" style="color: #22C9C9; text-decoration: none;">unsubscribe</a> at any time.</p>
        </div>
      `;
    }
    
    htmlContent += `</div>`;
    
    // Create plain text version
    const textContent = processedBody;
    
    // Send the email
    return await sendEmail({
      to: user.email,
      subject: subject,
      html: htmlContent,
      text: textContent,
    });
  } catch (error) {
    console.error("Error formatting/sending email:", error);
    return false;
  }
}