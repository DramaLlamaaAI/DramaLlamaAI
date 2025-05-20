/**
 * Command-line utility to add specific users directly to the database
 * 
 * Usage:
 * npx tsx server/add-users.ts
 */

import { db } from './db';
import { users, usageLimits } from '@shared/schema';
import { createHash, randomBytes } from 'crypto';
import { eq } from 'drizzle-orm';

// Function to hash a password with a salt
function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = createHash('sha512').update(salt + password).digest('hex');
  return `${salt}:${hash}`;
}

async function addSpecificUsers() {
  try {
    console.log('Adding specific users to the database...');
    
    // Andy Sheady's account
    const andyEmail = 'andysheady@gmail.com';
    
    // Check if this user already exists
    const existingAndy = await db
      .select()
      .from(users)
      .where(eq(users.email, andyEmail.toLowerCase()))
      .limit(1);
    
    if (existingAndy.length > 0) {
      console.log(`User with email ${andyEmail} already exists with ID: ${existingAndy[0].id}`);
    } else {
      // Add Andy's account
      const andy = await db
        .insert(users)
        .values({
          username: 'andy',
          email: andyEmail,
          password: hashPassword('Drama11ama#2025'), // Using the same password as admin for simplicity
          tier: 'personal', // Giving him Personal tier
          isAdmin: false,
          emailVerified: true // Marking as verified for convenience
        })
        .returning();
      
      console.log(`Created user: ${andy[0].username}, Email: ${andy[0].email}, ID: ${andy[0].id}`);
      
      // Create usage limits for Andy
      await db
        .insert(usageLimits)
        .values({
          userId: andy[0].id,
          monthlyTotal: 0,
          lastResetDate: new Date()
        });
      
      console.log(`Created usage limits for ${andy[0].username}`);
    }
    
    // If you had more users to add, you could add them here
    
    console.log('User addition completed successfully');
  } catch (error) {
    console.error('Error adding users:', error);
  }
}

// Execute the function
addSpecificUsers().then(() => {
  console.log('Script completed');
  process.exit(0);
}).catch(error => {
  console.error('Script failed:', error);
  process.exit(1);
});