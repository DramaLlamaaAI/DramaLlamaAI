/**
 * Script to resend verification emails to all unverified users
 * Run with: npx tsx resend-pending-verifications.js
 */

import { MemStorage } from './server/storage.js';
import { sendVerificationEmail, generateVerificationCode } from './server/services/resend-email-service.js';

async function resendPendingVerifications() {
  const storage = new MemStorage();
  
  try {
    // Get all users
    const allUsers = await storage.getAllUsers();
    
    // Filter for unverified users
    const unverifiedUsers = allUsers.filter(user => !user.emailVerified);
    
    console.log(`Found ${unverifiedUsers.length} unverified users:`);
    
    for (const user of unverifiedUsers) {
      console.log(`\nProcessing user: ${user.username} (${user.email})`);
      
      // Generate new verification code
      const verificationCode = generateVerificationCode();
      
      // Set verification code (expires in 24 hours)
      await storage.setVerificationCode(user.id, verificationCode, 24 * 60);
      
      // Send verification email
      const emailSent = await sendVerificationEmail(user, verificationCode);
      
      if (emailSent) {
        console.log(`✅ Verification email sent to ${user.email}`);
      } else {
        console.log(`❌ Failed to send email to ${user.email}`);
        console.log(`   Manual verification code: ${verificationCode}`);
      }
    }
    
    console.log(`\n🎉 Completed processing ${unverifiedUsers.length} unverified users`);
    
  } catch (error) {
    console.error('Error resending verifications:', error);
  }
}

// Run the script
resendPendingVerifications();