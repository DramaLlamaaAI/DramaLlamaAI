import { 
  users, analyses, usageLimits, userEvents, promoCodes, promoUsage,
  type User, type InsertUser, 
  type Analysis, type InsertAnalysis, 
  type UsageLimit, type InsertUsageLimit,
  type UserEvent, type InsertUserEvent,
  type PromoCode, type InsertPromoCode,
  type PromoUsage, type InsertPromoUsage
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
  updateUserPassword(userId: number, newPassword: string): Promise<User>;
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
  getUserUsage(userId: number): Promise<{ used: number, limit: number | null, tier: string }>;
  incrementUserUsage(userId: number): Promise<void>;
  
  // Anonymous Usage Tracking
  getAnonymousUsage(deviceId: string): Promise<AnonymousUsage | undefined>;
  incrementAnonymousUsage(deviceId: string): Promise<AnonymousUsage>;

  // Promo Codes Management
  createPromoCode(promoCode: InsertPromoCode): Promise<PromoCode>;
  getPromoCode(id: number): Promise<PromoCode | undefined>;
  getPromoCodeByCode(code: string): Promise<PromoCode | undefined>;
  updatePromoCode(id: number, updates: Partial<PromoCode>): Promise<PromoCode>;
  getAllPromoCodes(): Promise<PromoCode[]>;
  getActivePromoCodes(): Promise<PromoCode[]>;
  usePromoCode(code: string, userId: number, tier: string): Promise<{ 
    success: boolean, 
    discountPercentage?: number, 
    message?: string 
  }>;
  getPromoUsageByUser(userId: number): Promise<PromoUsage[]>;
  getAllPromoUsages(): Promise<PromoUsage[]>;
  
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
  private promoCodes: Map<number, PromoCode>;
  private promoUsages: Map<number, PromoUsage>;
  private userId: number;
  private analysisId: number;
  private usageLimitId: number;
  private userEventId: number;
  private promoCodeId: number;
  private promoUsageId: number;

  constructor() {
    this.users = new Map();
    this.analyses = new Map();
    this.usageLimits = new Map();
    this.anonymousUsage = new Map();
    this.userEvents = new Map();
    this.promoCodes = new Map();
    this.promoUsages = new Map();
    this.userId = 1;
    this.analysisId = 1;
    this.usageLimitId = 1;
    this.userEventId = 1;
    this.promoCodeId = 1;
    this.promoUsageId = 1;
    
    // Initialize with a demo user - using proper password format (salt:hash)
    // This is a pre-hashed representation of "password123"
    const demoSalt = "5b1ed2f96b8e4be184a84d1e8ced9f0a";
    const demoHash = "6979d0bbd415e5f064c743e21aabc6c84f048d5b8daf2a3a5c89bed4bd3b18dd0eeada398d8c33ec36d90a8900d706adce3c2af727fed0b7e6295ce017724018";
    
    const id = this.userId++;
    const user: User = { 
      id,
      username: "demo",
      password: `${demoSalt}:${demoHash}`,
      email: "demo@example.com",
      tier: "free",
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
    
    // Create usage limits for demo user
    const usageLimit: UsageLimit = {
      id: this.usageLimitId++,
      userId: id,
      monthlyTotal: 0,
      lastResetDate: new Date()
    };
    this.usageLimits.set(id, usageLimit);
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
    // Case-insensitive email lookup with added trim
    const normalizedEmail = email.toLowerCase().trim();
    console.log(`Looking up user by normalized email: "${normalizedEmail}"`);
    
    // Debug all users to help identify matching issues
    const allUsers = Array.from(this.users.values());
    const allEmails = allUsers.map(user => `"${user.email.toLowerCase().trim()}"`).join(", ");
    console.log(`All normalized emails in system: ${allEmails}`);
    
    return allUsers.find(
      (user) => user.email.toLowerCase().trim() === normalizedEmail
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userId++;
    
    // Normalize email to lowercase and trim whitespace
    const normalizedEmail = insertUser.email.toLowerCase().trim();
    console.log(`Creating user with normalized email: "${normalizedEmail}"`);
    
    // Apply defaults while preserving provided values
    const user: User = { 
      id,
      username: insertUser.username,
      password: insertUser.password,
      email: normalizedEmail,
      tier: insertUser.tier || "free",
      emailVerified: insertUser.emailVerified !== undefined ? insertUser.emailVerified : false,
      verificationCode: null,
      verificationCodeExpires: null,
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      isAdmin: insertUser.isAdmin !== undefined ? insertUser.isAdmin : false,
      discountPercentage: 0,
      discountExpiryDate: null
    };
    
    console.log(`Creating user: ${user.username}, Email: ${user.email}, Admin: ${user.isAdmin}, Tier: ${user.tier}`);
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
    console.log(`Looking for user with verification code: ${code}`);
    
    // Debug all verification codes
    const allUsers = Array.from(this.users.values());
    const allCodes = allUsers.map(user => {
      const isValid = user.verificationCodeExpires && user.verificationCodeExpires > now;
      return `${user.username}: "${user.verificationCode}" (valid: ${isValid})`;
    }).join(", ");
    
    console.log(`All verification codes: ${allCodes}`);
    
    return allUsers.find(
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
    
    console.log(`Setting verification code for user ${user.username} (${user.email}): "${code}", expires: ${expiresAt}`);
    
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
  
  async updateUserPassword(userId: number, newPassword: string): Promise<User> {
    const user = await this.getUser(userId);
    if (!user) {
      throw new Error(`User with id ${userId} not found`);
    }
    
    const updatedUser = { ...user, password: newPassword };
    this.users.set(userId, updatedUser);
    console.log(`Updated password for user: ${updatedUser.username}`);
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
  
  async getUserUsage(userId: number): Promise<{ used: number, limit: number | null, tier: string }> {
    const user = await this.getUser(userId);
    if (!user) {
      throw new Error(`User with id ${userId} not found`);
    }
    
    // Admin users always get unlimited usage regardless of tier
    if (user.isAdmin) {
      return {
        used: 0,
        limit: null, // null indicates unlimited usage
        tier: user.tier
      };
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
      
      // Set limits based on tier:
      // - Pro: unlimited (null)
      // - Personal: 5 
      // - Free: 2
      // - Instant: 1
      let limit: number | null;
      if (user.tier === 'pro') {
        limit = null; // unlimited
      } else if (user.tier === 'personal') {
        limit = 5; // 5 per month
      } else if (user.tier === 'instant') {
        limit = 1; // 1-time use
      } else {
        limit = 2; // Free tier (2 per month)
      }
      
      return {
        used: 0,
        limit,
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
    
    // Set limits based on tier type and admin status
    let limit: number | null;
    
    // Admin users always get unlimited usage
    if (user.isAdmin) {
      return {
        used: usageLimit.monthlyTotal,
        limit: null, // null indicates unlimited usage
        tier: user.tier
      };
    }
    
    // Set tier-specific limits
    if (user.tier === 'pro') {
      limit = null; // unlimited
    } else if (user.tier === 'personal') {
      limit = 5; // 5 per month
    } else if (user.tier === 'instant') {
      limit = 1; // 1-time use
    } else {
      limit = 2; // Free tier (2 per month)
    }
    
    return {
      used: usageLimit.monthlyTotal,
      limit,
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
    
    // Create a properly typed event object with defaults for optional fields
    const newEvent: UserEvent = {
      id,
      userId: event.userId || null,
      eventType: event.eventType,
      oldValue: event.oldValue || null,
      newValue: event.newValue || null,
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
      
      if (filter.startDate !== undefined) {
        const startDate = filter.startDate;
        events = events.filter(event => event.createdAt >= startDate);
      }
      
      if (filter.endDate !== undefined) {
        const endDate = filter.endDate;
        events = events.filter(event => event.createdAt <= endDate);
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
    // Use Array.from to work around the iterator compatibility issue
    Array.from(dateCountMap.entries()).forEach(([date, count]) => {
      registrationsByDate.push({ date, count });
    });
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
    
    // Use Array.from to work around the iterator compatibility issue
    Array.from(tierChanges.entries()).forEach(([key, count]) => {
      const [fromTier, toTier] = key.split(':');
      tierConversionRate.push({ fromTier, toTier, count });
    });
    
    // Sort by count (highest first)
    tierConversionRate.sort((a, b) => b.count - a.count);
    
    return {
      totalUsers,
      usersByTier,
      registrationsByDate,
      tierConversionRate
    };
  }

  // Promo Code Management Methods
  
  async createPromoCode(promoCode: InsertPromoCode): Promise<PromoCode> {
    const id = this.promoCodeId++;
    
    const now = new Date();
    const newPromoCode: PromoCode = {
      id,
      code: promoCode.code,
      description: promoCode.description || "",
      discountPercentage: promoCode.discountPercentage,
      maxUses: promoCode.maxUses || 100,
      usedCount: 0,
      isActive: promoCode.isActive !== undefined ? promoCode.isActive : true,
      startDate: promoCode.startDate || now,
      expiryDate: promoCode.expiryDate || null,
      createdAt: now,
      createdById: promoCode.createdById,
      targetTier: promoCode.targetTier || null,
      applyToFirstMonth: promoCode.applyToFirstMonth !== undefined ? promoCode.applyToFirstMonth : true,
    };
    
    this.promoCodes.set(id, newPromoCode);
    return newPromoCode;
  }
  
  async getPromoCode(id: number): Promise<PromoCode | undefined> {
    return this.promoCodes.get(id);
  }
  
  async getPromoCodeByCode(code: string): Promise<PromoCode | undefined> {
    const normalizedCode = code.toUpperCase();
    return Array.from(this.promoCodes.values()).find(
      promo => promo.code.toUpperCase() === normalizedCode
    );
  }
  
  async updatePromoCode(id: number, updates: Partial<PromoCode>): Promise<PromoCode> {
    const existingPromo = this.promoCodes.get(id);
    if (!existingPromo) {
      throw new Error(`Promo code with ID ${id} not found`);
    }
    
    const updatedPromo: PromoCode = {
      ...existingPromo,
      ...updates,
    };
    
    this.promoCodes.set(id, updatedPromo);
    return updatedPromo;
  }
  
  async getAllPromoCodes(): Promise<PromoCode[]> {
    return Array.from(this.promoCodes.values());
  }
  
  async getActivePromoCodes(): Promise<PromoCode[]> {
    const now = new Date();
    return Array.from(this.promoCodes.values()).filter(promo => 
      promo.isActive && 
      promo.startDate <= now && 
      (!promo.expiryDate || promo.expiryDate >= now) &&
      (!promo.usedCount || !promo.maxUses || promo.usedCount < promo.maxUses)
    );
  }
  
  async usePromoCode(code: string, userId: number, tier: string): Promise<{ 
    success: boolean, 
    discountPercentage?: number, 
    message?: string 
  }> {
    const promo = await this.getPromoCodeByCode(code);
    
    if (!promo) {
      return { success: false, message: "Invalid promotion code" };
    }
    
    // Check if code is active
    if (!promo.isActive) {
      return { success: false, message: "This promotion code is no longer active" };
    }
    
    // Check dates
    const now = new Date();
    if (promo.startDate > now) {
      return { success: false, message: "This promotion code is not yet valid" };
    }
    
    if (promo.expiryDate && promo.expiryDate < now) {
      return { success: false, message: "This promotion code has expired" };
    }
    
    // Check usage limits
    if (promo.usedCount && promo.maxUses && promo.usedCount >= promo.maxUses) {
      return { success: false, message: "This promotion code has reached its usage limit" };
    }
    
    // Check if user already used this code
    const existingUsage = Array.from(this.promoUsages.values()).find(
      usage => usage.promoCodeId === promo.id && usage.userId === userId
    );
    
    if (existingUsage) {
      return { success: false, message: "You have already used this promotion code" };
    }
    
    // Check if the tier matches target tier (if specified)
    if (promo.targetTier && promo.targetTier !== tier) {
      return { 
        success: false, 
        message: `This promotion code is only valid for ${promo.targetTier} tier subscriptions` 
      };
    }
    
    // All checks passed, record the usage
    const usageId = this.promoUsageId++;
    const promoUsage: PromoUsage = {
      id: usageId,
      promoCodeId: promo.id,
      userId,
      usedAt: now,
      appliedDiscount: promo.discountPercentage,
      targetTier: tier,
    };
    
    this.promoUsages.set(usageId, promoUsage);
    
    // Update promo code usage count
    const updatedPromo: PromoCode = {
      ...promo,
      usedCount: (promo.usedCount || 0) + 1
    };
    
    this.promoCodes.set(promo.id, updatedPromo);
    
    // Apply discount to user
    const user = await this.getUser(userId);
    if (user) {
      const thirtyDays = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds
      const expiryDate = new Date(now.getTime() + thirtyDays);
      
      await this.setUserDiscount(userId, promo.discountPercentage, 30);
    }
    
    return { 
      success: true, 
      discountPercentage: promo.discountPercentage,
      message: `Successfully applied ${promo.discountPercentage}% discount` 
    };
  }
  
  async getPromoUsageByUser(userId: number): Promise<PromoUsage[]> {
    return Array.from(this.promoUsages.values()).filter(
      usage => usage.userId === userId
    );
  }
  
  async getAllPromoUsages(): Promise<PromoUsage[]> {
    return Array.from(this.promoUsages.values());
  }
}

export const storage = new MemStorage();
