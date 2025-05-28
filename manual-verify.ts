/**
 * Manual verification script for washkowiakt3@gmail.com
 */
import { storage } from './server/storage.js';

async function manualVerify() {
  try {
    console.log('Getting all users...');
    const users = await storage.getAllUsers();
    
    const targetUser = users.find(u => u.email === 'washkowiakt3@gmail.com');
    
    if (targetUser) {
      console.log(`Found user: ${targetUser.username} (ID: ${targetUser.id})`);
      console.log(`Current verification: ${targetUser.emailVerified}`);
      
      // Use the verifyEmail method from storage
      const verifiedUser = await storage.verifyEmail(targetUser.id);
      
      console.log(`✅ Verification complete!`);
      console.log(`New status: ${verifiedUser.emailVerified}`);
    } else {
      console.log('❌ User not found');
      console.log('Available users:');
      users.forEach(u => console.log(`- ${u.username}: ${u.email}`));
    }
  } catch (error) {
    console.error('Error during verification:', error);
  }
}

manualVerify();