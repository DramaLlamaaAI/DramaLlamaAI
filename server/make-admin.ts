/**
 * Command-line utility to make a user an admin directly via the storage layer
 * This bypasses normal authentication and authorization checks
 * 
 * Usage:
 * npx tsx server/make-admin.ts <username> [--create]
 */

import { MemStorage, storage } from './storage';
import crypto from 'crypto';

async function makeAdmin(username: string, shouldCreate: boolean = false, hardcodedPassword?: string) {
  try {
    console.log(`Looking for user with username: ${username}`);
    
    let user = await storage.getUserByUsername(username);
    
    if (!user && shouldCreate) {
      // Create a new user with admin privileges if --create flag is passed
      console.log(`User ${username} not found. Creating new admin user...`);
      
      // Either use provided password or generate a secure one
      const password = hardcodedPassword || ('Admin' + Math.random().toString(36).slice(2, 8) + '!');
      
      // Hash password manually to ensure it's done correctly
      const salt = crypto.randomBytes(16).toString("hex");
      const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");
      const hashedPassword = `${salt}:${hash}`;
      
      console.log(`Password hash format: ${hashedPassword.includes(':') ? 'Correct (salt:hash)' : 'Invalid'}`);
      
      // Create user with admin flag set to true
      user = await storage.createUser({
        username,
        email: "dramallamaconsultancy@gmail.com", // Use the correct email
        password: hashedPassword,
        tier: 'pro',
        isAdmin: true,
        emailVerified: true // Pre-verify email
      });
      
      console.log(`Created new admin user: ${username}`);
      console.log(`Email: dramallamaconsultancy@gmail.com`);
      console.log(`Password: ${password}`);
      console.log('IMPORTANT: Save this password securely. It will not be shown again.');
    } else if (!user) {
      console.log(`User ${username} not found. Use --create flag to create a new admin user.`);
      process.exit(1);
    } else {
      // Make existing user an admin
      console.log(`User ${username} found. Making user an admin...`);
      user = await storage.setUserAdmin(user.id, true);
      
      // Set the proper email if needed
      if (user.email !== "dramallamaconsultancy@gmail.com") {
        console.log(`Updating email to: dramallamaconsultancy@gmail.com`);
        // Use updateUserTier as a temporary workaround since we don't have updateUserEmail
        // This doesn't actually change the email, but we'll just recreate the user
        console.log("(Note: Email update not supported in current storage interface)");
      }
      
      // Also verify email to make sure login works
      if (!user.emailVerified) {
        user = await storage.verifyEmail(user.id);
      }
      
      console.log(`Successfully updated ${username} to admin status.`);
      console.log(`Email verification status: ${user.emailVerified ? 'Verified' : 'Not verified'}`);
      console.log(`Email: ${user.email}`);
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
const hardcodedPassword = process.argv.includes('--simple') ? 'admin123' : undefined;

if (!username) {
  console.log('Usage: npx tsx server/make-admin.ts <username> [--create] [--simple]');
  console.log('Options:');
  console.log('  --create: Create a new admin user if it does not exist');
  console.log('  --simple: Use a simple password (admin123) instead of a random one');
  process.exit(1);
}

// Run the function
makeAdmin(username, shouldCreate, hardcodedPassword).then(() => process.exit(0));