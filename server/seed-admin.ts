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
  
  // Check users in the system
  const allUsers = await storage.getAllUsers();
  console.log(`Current users in the system: ${allUsers.length}`);
  allUsers.forEach(user => {
    console.log(`- User: ${user.username}, Email: ${user.email}, Admin: ${user.isAdmin}`);
  });
  
  // Check by case-insensitive email lookup
  let adminUser = await storage.getUserByEmail(adminEmail);
  console.log("Admin user lookup result:", adminUser ? `Found (ID: ${adminUser.id})` : "Not found");
  
  if (!adminUser) {
    console.log("Admin user not found, creating default admin user...");
    
    const adminPassword = "admin123";
    const hashedPassword = hashPassword(adminPassword);
    
    try {
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
      console.log("  ID:", adminUser.id);
      console.log("  isAdmin:", adminUser.isAdmin);
      
      // Let's double-check the user got created
      const createdAdmin = await storage.getUserByEmail(adminEmail);
      if (createdAdmin) {
        console.log("Successfully found admin after creation");
      } else {
        console.log("ERROR: Admin not found after creation attempt");
      }
    } catch (error) {
      console.error("Error creating admin user:", error);
    }
  } else {
    // Make sure admin is properly set up
    if (!adminUser.isAdmin) {
      try {
        adminUser = await storage.setUserAdmin(adminUser.id, true);
        console.log("Updated user to admin status");
      } catch (error) {
        console.error("Error setting admin flag:", error);
      }
    }
    
    if (!adminUser.emailVerified) {
      try {
        adminUser = await storage.verifyEmail(adminUser.id);
        console.log("Verified admin email");
      } catch (error) {
        console.error("Error verifying admin email:", error);
      }
    }
    
    console.log("Admin user already exists");
  }
  
  // Final check
  const finalUsers = await storage.getAllUsers();
  console.log(`Final users in the system: ${finalUsers.length}`);
  finalUsers.forEach(user => {
    console.log(`- User: ${user.username}, Email: ${user.email}, Admin: ${user.isAdmin}`);
  });
}