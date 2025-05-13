import { storage } from './server/storage';
import crypto from 'crypto';

// Simple password hashing function (same as used in auth-controller)
function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");
  return `${salt}:${hash}`;
}

async function updateAdminPassword() {
  console.log("Updating admin password...");
  const adminEmail = "dramallamaconsultancy@gmail.com";
  
  // Find the admin user
  const adminUser = await storage.getUserByEmail(adminEmail);
  
  if (!adminUser) {
    console.error("Admin user not found!");
    return;
  }
  
  console.log(`Found admin user: ${adminUser.username} (ID: ${adminUser.id})`);
  
  // Generate new hashed password
  const newPassword = "Drama11ama#2025";
  const hashedPassword = hashPassword(newPassword);
  
  // Update the user's password
  const updatedUser = await storage.updateUserPassword(adminUser.id, hashedPassword);
  
  console.log("Admin password updated successfully!");
  console.log("New password: Drama11ama#2025");
}

updateAdminPassword();