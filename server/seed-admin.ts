/**
 * Create a default admin user when the server starts
 */
import { storage } from "./storage";
import crypto from "crypto";

// Simple password hashing
function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");
  return `${salt}:${hash}`;
}

export async function seedAdminUser() {
  console.log("Checking if admin user exists...");
  const adminEmail = "dramallamaconsultancy@gmail.com";
  
  // Check by case-insensitive email lookup
  let adminUser = await storage.getUserByEmail(adminEmail);
  
  if (!adminUser) {
    console.log("Admin user not found, creating default admin user...");
    
    const adminPassword = "admin123";
    const hashedPassword = hashPassword(adminPassword);
    
    adminUser = await storage.createUser({
      username: "admin",
      email: adminEmail,
      password: hashedPassword,
      tier: "pro",
      isAdmin: true,
      emailVerified: true
    });
    
    console.log("Created default admin user:");
    console.log("  Email:", adminEmail);
    console.log("  Password: admin123");
  } else {
    // Make sure admin is properly set up
    if (!adminUser.isAdmin) {
      adminUser = await storage.setUserAdmin(adminUser.id, true);
      console.log("Updated user to admin status");
    }
    
    if (!adminUser.emailVerified) {
      adminUser = await storage.verifyEmail(adminUser.id);
      console.log("Verified admin email");
    }
    
    console.log("Admin user already exists");
  }
}