import { users, analyses, usageLimits, type User, type InsertUser, type Analysis, type InsertAnalysis, type UsageLimit, type InsertUsageLimit } from "@shared/schema";

// Interface for tracking anonymous usage
interface AnonymousUsage {
  deviceId: string;
  count: number;
  lastUsed: Date;
}

export interface IStorage {
  // User Management
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserTier(userId: number, tier: string): Promise<User>;
  
  // Analysis Management
  saveAnalysis(analysis: InsertAnalysis): Promise<Analysis>;
  getUserAnalyses(userId: number): Promise<Analysis[]>;
  
  // Usage Tracking
  getUserUsage(userId: number): Promise<{ used: number, limit: number, tier: string }>;
  incrementUserUsage(userId: number): Promise<void>;
  
  // Anonymous Usage Tracking
  getAnonymousUsage(deviceId: string): Promise<AnonymousUsage | undefined>;
  incrementAnonymousUsage(deviceId: string): Promise<AnonymousUsage>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private analyses: Map<number, Analysis>;
  private usageLimits: Map<number, UsageLimit>;
  private anonymousUsage: Map<string, AnonymousUsage>;
  private userId: number;
  private analysisId: number;
  private usageLimitId: number;

  constructor() {
    this.users = new Map();
    this.analyses = new Map();
    this.usageLimits = new Map();
    this.anonymousUsage = new Map();
    this.userId = 1;
    this.analysisId = 1;
    this.usageLimitId = 1;
    
    // Initialize with a demo user
    this.createUser({
      username: "demo",
      password: "password123",
      email: "demo@example.com",
      tier: "free"
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }
  
  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email === email.toLowerCase(),
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userId++;
    // Ensure tier is set with a default if not provided
    const userWithDefaultTier = {
      ...insertUser,
      tier: insertUser.tier || "free"
    };
    
    const user: User = { ...userWithDefaultTier, id };
    this.users.set(id, user);
    
    // Create usage limits for new user
    const usageLimit: UsageLimit = {
      id: this.usageLimitId++,
      userId: id,
      monthlyTotal: 0,
      lastResetDate: new Date()
    };
    this.usageLimits.set(id, usageLimit);
    
    return user;
  }
  
  async updateUserTier(userId: number, tier: string): Promise<User> {
    const user = await this.getUser(userId);
    if (!user) {
      throw new Error(`User with id ${userId} not found`);
    }
    
    const updatedUser = { ...user, tier };
    this.users.set(userId, updatedUser);
    return updatedUser;
  }
  
  async saveAnalysis(analysis: InsertAnalysis): Promise<Analysis> {
    const id = this.analysisId++;
    const now = new Date();
    const newAnalysis: Analysis = { 
      ...analysis, 
      id, 
      createdAt: now
    };
    
    this.analyses.set(id, newAnalysis);
    
    // Increment usage for the user
    await this.incrementUserUsage(analysis.userId);
    
    return newAnalysis;
  }
  
  async getUserAnalyses(userId: number): Promise<Analysis[]> {
    return Array.from(this.analyses.values())
      .filter(analysis => analysis.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
  
  async getUserUsage(userId: number): Promise<{ used: number, limit: number, tier: string }> {
    const user = await this.getUser(userId);
    if (!user) {
      throw new Error(`User with id ${userId} not found`);
    }
    
    const usageLimit = this.usageLimits.get(userId);
    if (!usageLimit) {
      // Create a new usage limit record if it doesn't exist
      const newUsageLimit: UsageLimit = {
        id: this.usageLimitId++,
        userId: userId,
        monthlyTotal: 0,
        lastResetDate: new Date()
      };
      this.usageLimits.set(userId, newUsageLimit);
      
      return {
        used: 0,
        limit: user.tier === 'pro' ? Infinity : user.tier === 'personal' ? 10 : 1,
        tier: user.tier
      };
    }
    
    // Check if we need to reset the monthly usage
    const now = new Date();
    const lastReset = usageLimit.lastResetDate;
    if (lastReset.getMonth() !== now.getMonth() || lastReset.getFullYear() !== now.getFullYear()) {
      usageLimit.monthlyTotal = 0;
      usageLimit.lastResetDate = now;
      this.usageLimits.set(userId, usageLimit);
    }
    
    return {
      used: usageLimit.monthlyTotal,
      limit: user.tier === 'pro' ? Infinity : user.tier === 'personal' ? 10 : 1,
      tier: user.tier
    };
  }
  
  async incrementUserUsage(userId: number): Promise<void> {
    const usageLimit = this.usageLimits.get(userId);
    if (!usageLimit) {
      // Create a new usage limit record if it doesn't exist
      const newUsageLimit: UsageLimit = {
        id: this.usageLimitId++,
        userId: userId,
        monthlyTotal: 1,
        lastResetDate: new Date()
      };
      this.usageLimits.set(userId, newUsageLimit);
      return;
    }
    
    // Increment the usage
    usageLimit.monthlyTotal += 1;
    this.usageLimits.set(userId, usageLimit);
  }
  
  async getAnonymousUsage(deviceId: string): Promise<AnonymousUsage | undefined> {
    return this.anonymousUsage.get(deviceId);
  }
  
  async incrementAnonymousUsage(deviceId: string): Promise<AnonymousUsage> {
    const existing = this.anonymousUsage.get(deviceId);
    
    if (existing) {
      const updated = {
        ...existing,
        count: existing.count + 1,
        lastUsed: new Date()
      };
      this.anonymousUsage.set(deviceId, updated);
      return updated;
    } else {
      const newUsage: AnonymousUsage = {
        deviceId,
        count: 1,
        lastUsed: new Date()
      };
      this.anonymousUsage.set(deviceId, newUsage);
      return newUsage;
    }
  }
}

export const storage = new MemStorage();
