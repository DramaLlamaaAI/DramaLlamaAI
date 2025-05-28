/**
 * Send verification emails to specific unverified users
 */

import { DatabaseStorage } from './server/storage.js';
import { sendVerificationEmail, generateVerificationCode } from './server/services/resend-email-service.js';

async function sendVerificationsToUsers() {
  const storage = new DatabaseStorage();
  
  // User IDs who need verification emails
  const unverifiedUserIds = [5, 6, 7, 4]; // Washkowiakt3, vixta91, nfornellie2020, rachelresmer
  
  try {
    for (const userId of unverifiedUserIds) {
      const user = await storage.getUser(userId);
      
      if (user && !user.emailVerified) {
        console.log(`\n📧 Sending verification email to: ${user.username} (${user.email})`);
        
        // Generate new verification code
        const verificationCode = generateVerificationCode();
        
        // Set verification code (expires in 24 hours)
        await storage.setVerificationCode(user.id, verificationCode, 24 * 60);
        
        // Send verification email
        const emailSent = await sendVerificationEmail(user, verificationCode);
        
        if (emailSent) {
          console.log(`✅ Success! Verification email sent to ${user.email}`);
        } else {
          console.log(`❌ Failed to send email to ${user.email}`);
          console.log(`   Manual code: ${verificationCode}`);
        }
      }
    }
    
    console.log(`\n🎉 Finished sending verification emails!`);
    
  } catch (error) {
    console.error('❌ Error sending verification emails:', error);
  }
}

sendVerificationsToUsers();