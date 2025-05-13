/**
 * Command-line utility to make a user an admin directly via the storage layer
 * This bypasses normal authentication and authorization checks
 * 
 * Usage:
 * npx tsx server/make-admin.ts <username> [--create]
 */

import { MemStorage, storage } from './storage';
import crypto from 'crypto';

async function makeAdmin(username: string, shouldCreate: boolean = false) {
  try {
    console.log(`Looking for user with username: ${username}`);
    
    let user = await storage.getUserByUsername(username);
    
    if (!user && shouldCreate) {
      // Create a new user with admin privileges if --create flag is passed
      console.log(`User ${username} not found. Creating new admin user...`);
      
      // Generate a secure password
      const password = 'Admin' + Math.random().toString(36).slice(2, 8) + '!';
      const salt = crypto.randomBytes(16).toString("hex");
      const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");
      const hashedPassword = `${salt}:${hash}`;
      
      // Create user with admin flag set to true
      user = await storage.createUser({
        username,
        email: `${username}@dramallamaai.com`,
        password: hashedPassword,
        tier: 'pro',
        isAdmin: true,
        emailVerified: true
      });
      
      console.log(`Created new admin user: ${username}`);
      console.log(`Password: ${password}`);
      console.log('IMPORTANT: Save this password securely. It will not be shown again.');
    } else if (!user) {
      console.log(`User ${username} not found. Use --create flag to create a new admin user.`);
      process.exit(1);
    } else {
      // Make existing user an admin
      console.log(`User ${username} found. Making user an admin...`);
      user = await storage.setUserAdmin(user.id, true);
      
      // Also verify email to make sure login works
      if (!user.emailVerified) {
        user = await storage.verifyEmail(user.id);
      }
      
      console.log(`Successfully updated ${username} to admin status.`);
      console.log(`Email verification status: ${user.emailVerified ? 'Verified' : 'Not verified'}`);
    }
    
    console.log('Operation completed successfully.');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

// Get command line arguments
const username = process.argv[2];
const shouldCreate = process.argv.includes('--create');

if (!username) {
  console.log('Usage: npx tsx server/make-admin.ts <username> [--create]');
  process.exit(1);
}

// Run the function
makeAdmin(username, shouldCreate).then(() => process.exit(0));