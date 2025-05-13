import { 
  users, analyses, usageLimits, userEvents,
  type User, type InsertUser, 
  type Analysis, type InsertAnalysis, 
  type UsageLimit, type InsertUsageLimit,
  type UserEvent, type InsertUserEvent
} from "@shared/schema";

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
  getUserByVerificationCode(code: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserTier(userId: number, tier: string): Promise<User>;
  updateStripeCustomerId(userId: number, customerId: string): Promise<User>;
  updateStripeSubscriptionId(userId: number, subscriptionId: string): Promise<User>;
  setVerificationCode(userId: number, code: string, expiresIn: number): Promise<User>;
  verifyEmail(userId: number): Promise<User>;
  
  // Admin Management
  getAllUsers(): Promise<User[]>;
  setUserAdmin(userId: number, isAdmin: boolean): Promise<User>;
  setUserDiscount(userId: number, discountPercentage: number, expiryDays?: number): Promise<User>;
  
  // Analysis Management
  saveAnalysis(analysis: InsertAnalysis): Promise<Analysis>;
  getUserAnalyses(userId: number): Promise<Analysis[]>;
  
  // Usage Tracking
  getUserUsage(userId: number): Promise<{ used: number, limit: number, tier: string }>;
  incrementUserUsage(userId: number): Promise<void>;
  
  // Anonymous Usage Tracking
  getAnonymousUsage(deviceId: string): Promise<AnonymousUsage | undefined>;
  incrementAnonymousUsage(deviceId: string): Promise<AnonymousUsage>;
  
  // Analytics
  trackUserEvent(event: InsertUserEvent): Promise<UserEvent>;
  getUserEvents(filter?: { 
    userId?: number, 
    eventType?: string, 
    startDate?: Date, 
    endDate?: Date 
  }): Promise<UserEvent[]>;
  getAnalyticsSummary(): Promise<{
    totalUsers: number;
    usersByTier: { [tier: string]: number };
    registrationsByDate: { date: string; count: number }[];
    tierConversionRate: { fromTier: string; toTier: string; count: number }[];
  }>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private analyses: Map<number, Analysis>;
  private usageLimits: Map<number, UsageLimit>;
  private anonymousUsage: Map<string, AnonymousUsage>;
  private userEvents: Map<number, UserEvent>;
  private userId: number;
  private analysisId: number;
  private usageLimitId: number;
  private userEventId: number;

  constructor() {
    this.users = new Map();
    this.analyses = new Map();
    this.usageLimits = new Map();
    this.anonymousUsage = new Map();
    this.userEvents = new Map();
    this.userId = 1;
    this.analysisId = 1;
    this.usageLimitId = 1;
    this.userEventId = 1;
    
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
    
    const user: User = { 
      ...userWithDefaultTier, 
      id,
      emailVerified: false,
      verificationCode: null,
      verificationCodeExpires: null,
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      isAdmin: false,
      discountPercentage: 0,
      discountExpiryDate: null
    };
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
  
  async getUserByVerificationCode(code: string): Promise<User | undefined> {
    const now = new Date();
    return Array.from(this.users.values()).find(
      (user) => user.verificationCode === code && 
                user.verificationCodeExpires && 
                user.verificationCodeExpires > now
    );
  }
  
  async setVerificationCode(userId: number, code: string, expiresInMinutes: number): Promise<User> {
    const user = await this.getUser(userId);
    if (!user) {
      throw new Error(`User with id ${userId} not found`);
    }
    
    // Set expiration time (default: 24 hours)
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + expiresInMinutes);
    
    const updatedUser = { 
      ...user, 
      verificationCode: code,
      verificationCodeExpires: expiresAt
    };
    this.users.set(userId, updatedUser);
    return updatedUser;
  }
  
  async verifyEmail(userId: number): Promise<User> {
    const user = await this.getUser(userId);
    if (!user) {
      throw new Error(`User with id ${userId} not found`);
    }
    
    const updatedUser = { 
      ...user, 
      emailVerified: true,
      verificationCode: null,
      verificationCodeExpires: null
    };
    this.users.set(userId, updatedUser);
    return updatedUser;
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
  
  async updateStripeCustomerId(userId: number, customerId: string): Promise<User> {
    const user = await this.getUser(userId);
    if (!user) {
      throw new Error(`User with id ${userId} not found`);
    }
    
    const updatedUser = { ...user, stripeCustomerId: customerId };
    this.users.set(userId, updatedUser);
    return updatedUser;
  }
  
  async updateStripeSubscriptionId(userId: number, subscriptionId: string): Promise<User> {
    const user = await this.getUser(userId);
    if (!user) {
      throw new Error(`User with id ${userId} not found`);
    }
    
    const updatedUser = { ...user, stripeSubscriptionId: subscriptionId };
    this.users.set(userId, updatedUser);
    return updatedUser;
  }
  
  // Admin management methods
  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }
  
  async setUserAdmin(userId: number, isAdmin: boolean): Promise<User> {
    const user = await this.getUser(userId);
    if (!user) {
      throw new Error(`User with id ${userId} not found`);
    }
    
    const updatedUser = { ...user, isAdmin };
    this.users.set(userId, updatedUser);
    return updatedUser;
  }
  
  async setUserDiscount(userId: number, discountPercentage: number, expiryDays: number = 30): Promise<User> {
    const user = await this.getUser(userId);
    if (!user) {
      throw new Error(`User with id ${userId} not found`);
    }
    
    // Calculate expiry date (default to 30 days from now)
    const discountExpiryDate = new Date();
    discountExpiryDate.setDate(discountExpiryDate.getDate() + expiryDays);
    
    const updatedUser = { 
      ...user, 
      discountPercentage: Math.min(Math.max(discountPercentage, 0), 100), // Ensure discount is between 0-100%
      discountExpiryDate
    };
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
  
  // Analytics methods
  
  async trackUserEvent(event: InsertUserEvent): Promise<UserEvent> {
    const id = this.userEventId++;
    const now = new Date();
    
    const newEvent: UserEvent = {
      ...event,
      id,
      createdAt: now
    };
    
    this.userEvents.set(id, newEvent);
    return newEvent;
  }
  
  async getUserEvents(filter?: { 
    userId?: number, 
    eventType?: string, 
    startDate?: Date, 
    endDate?: Date 
  }): Promise<UserEvent[]> {
    let events = Array.from(this.userEvents.values());
    
    // Apply filters if provided
    if (filter) {
      if (filter.userId !== undefined) {
        events = events.filter(event => event.userId === filter.userId);
      }
      
      if (filter.eventType) {
        events = events.filter(event => event.eventType === filter.eventType);
      }
      
      if (filter.startDate) {
        events = events.filter(event => event.createdAt >= filter.startDate);
      }
      
      if (filter.endDate) {
        events = events.filter(event => event.createdAt <= filter.endDate);
      }
    }
    
    // Sort by creation date, newest first
    return events.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
  
  async getAnalyticsSummary(): Promise<{
    totalUsers: number;
    usersByTier: { [tier: string]: number };
    registrationsByDate: { date: string; count: number }[];
    tierConversionRate: { fromTier: string; toTier: string; count: number }[];
  }> {
    const users = Array.from(this.users.values());
    const registrationEvents = await this.getUserEvents({ eventType: 'registration' });
    const tierChangeEvents = await this.getUserEvents({ eventType: 'tier_change' });
    
    // Calculate total users
    const totalUsers = users.length;
    
    // Calculate users by tier
    const usersByTier: { [tier: string]: number } = {};
    for (const user of users) {
      const tier = user.tier;
      usersByTier[tier] = (usersByTier[tier] || 0) + 1;
    }
    
    // Calculate registrations by date (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const registrationsByDate: { date: string; count: number }[] = [];
    const dateCountMap = new Map<string, number>();
    
    // Initialize all dates in the last 30 days with 0 counts
    for (let i = 0; i < 30; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateString = date.toISOString().split('T')[0];
      dateCountMap.set(dateString, 0);
    }
    
    // Count registrations for each date
    for (const event of registrationEvents) {
      if (event.createdAt >= thirtyDaysAgo) {
        const dateString = event.createdAt.toISOString().split('T')[0];
        const count = dateCountMap.get(dateString) || 0;
        dateCountMap.set(dateString, count + 1);
      }
    }
    
    // Convert map to array and sort by date
    for (const [date, count] of dateCountMap.entries()) {
      registrationsByDate.push({ date, count });
    }
    registrationsByDate.sort((a, b) => a.date.localeCompare(b.date));
    
    // Calculate tier conversion rates
    const tierChanges = new Map<string, number>();
    
    for (const event of tierChangeEvents) {
      if (event.oldValue && event.newValue) {
        const key = `${event.oldValue}:${event.newValue}`;
        const count = tierChanges.get(key) || 0;
        tierChanges.set(key, count + 1);
      }
    }
    
    const tierConversionRate: { fromTier: string; toTier: string; count: number }[] = [];
    
    for (const [key, count] of tierChanges.entries()) {
      const [fromTier, toTier] = key.split(':');
      tierConversionRate.push({ fromTier, toTier, count });
    }
    
    // Sort by count (highest first)
    tierConversionRate.sort((a, b) => b.count - a.count);
    
    return {
      totalUsers,
      usersByTier,
      registrationsByDate,
      tierConversionRate
    };
  }
}

export const storage = new MemStorage();
