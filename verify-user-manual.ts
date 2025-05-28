import { MemStorage } from './server/storage.js';

async function verifyUser() {
  const storage = new MemStorage();
  
  try {
    // Find the user by email
    const user = await storage.getUserByEmail('washkowiakt3@gmail.com');
    
    if (user) {
      console.log(`Found user: ${user.username} (ID: ${user.id})`);
      console.log(`Current verification status: ${user.emailVerified}`);
      
      // Verify the user's email
      const updatedUser = await storage.verifyEmail(user.id);
      console.log(`✅ User verified! New status: ${updatedUser.emailVerified}`);
    } else {
      console.log('❌ User not found');
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

verifyUser();