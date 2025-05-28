/**
 * Check verification status of all users and resend emails to unverified ones
 */

import { MemStorage } from './server/storage.js';
import { sendVerificationEmail, generateVerificationCode } from './server/services/resend-email-service.js';

async function checkAndResendVerifications() {
  const storage = new MemStorage();
  
  try {
    // Get all users
    const allUsers = await storage.getAllUsers();
    
    console.log(`\nChecking ${allUsers.length} total users:\n`);
    
    for (const user of allUsers) {
      console.log(`User: ${user.username}`);
      console.log(`Email: ${user.email}`);
      console.log(`Email Verified: ${user.emailVerified ? '✅ Yes' : '❌ No'}`);
      console.log(`Admin: ${user.isAdmin ? 'Yes' : 'No'}`);
      
      // If not verified and not a demo account, send verification email
      if (!user.emailVerified && !user.email.includes('example.com')) {
        console.log(`🔄 Sending verification email...`);
        
        // Generate new verification code
        const verificationCode = generateVerificationCode();
        
        // Set verification code (expires in 24 hours)
        await storage.setVerificationCode(user.id, verificationCode, 24 * 60);
        
        // Send verification email
        const emailSent = await sendVerificationEmail(user, verificationCode);
        
        if (emailSent) {
          console.log(`✅ Verification email sent successfully!`);
        } else {
          console.log(`❌ Failed to send email`);
          console.log(`   Manual verification code: ${verificationCode}`);
        }
      }
      
      console.log('---');
    }
    
  } catch (error) {
    console.error('Error checking users:', error);
  }
}

checkAndResendVerifications();