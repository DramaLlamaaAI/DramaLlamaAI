import { 
  users, analyses, usageLimits, userEvents, promoCodes, promoUsage, systemSettings,
  type User, type InsertUser, 
  type Analysis, type InsertAnalysis, 
  type UsageLimit, type InsertUsageLimit,
  type UserEvent, type InsertUserEvent,
  type PromoCode, type InsertPromoCode,
  type PromoUsage, type InsertPromoUsage,
  type SystemSetting, type InsertSystemSetting
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
  getAllUsersWithPromoInfo(): Promise<(User & { promoCode?: string; promoUsedAt?: Date })[]>;
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
    anonymousStats: {
      totalAnonymousUsers: number;
      totalAnonymousAnalyses: number;
      averageAnalysesPerAnonymousUser: number;
    };
  }>;
  
  // System Settings for Beta Mode
  getSystemSetting(key: string): Promise<SystemSetting | undefined>;
  setSystemSetting(key: string, value: string, description?: string, updatedById?: number): Promise<SystemSetting>;
  getAllSystemSettings(): Promise<SystemSetting[]>;
  isBetaModeEnabled(): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private analyses: Map<number, Analysis>;
  private usageLimits: Map<number, UsageLimit>;
  private anonymousUsage: Map<string, AnonymousUsage>;
  private userEvents: Map<number, UserEvent>;
  private promoCodes: Map<number, PromoCode>;
  private promoUsages: Map<number, PromoUsage>;
  private systemSettings: Map<string, SystemSetting>;
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
    this.systemSettings = new Map();
    this.userId = 1;
    this.analysisId = 1;
    this.usageLimitId = 1;
    this.userEventId = 1;
    this.promoCodeId = 1;
    this.promoUsageId = 1;
    
    // Initialize beta mode as enabled by default
    this.systemSettings.set('beta_mode', {
      id: 1,
      settingKey: 'beta_mode',
      settingValue: 'true',
      description: 'Enable beta mode with unlimited access for registered users',
      updatedAt: new Date(),
      updatedById: null
    });
    
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

  async getAllUsersWithPromoInfo(): Promise<(User & { promoCode?: string; promoUsedAt?: Date })[]> {
    const users = Array.from(this.users.values());
    const usersWithPromo = users.map(user => {
      // Find promo usage for this user
      const promoUsage = Array.from(this.promoUsages.values()).find(usage => usage.userId === user.id);
      
      if (promoUsage) {
        // Find the promo code details
        const promoCode = this.promoCodes.get(promoUsage.promoCodeId);
        return {
          ...user,
          promoCode: promoCode?.code || 'Unknown',
          promoUsedAt: promoUsage.usedAt
        };
      }
      
      return user;
    });
    
    return usersWithPromo;
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
        limit = 5; // Free tier (5 per month)
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
      limit = null; // Basic tier (free but logged in) - unlimited analysis
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
    
    // Calculate user usage stats
    const currentMonth = new Date();
    currentMonth.setDate(1);
    currentMonth.setHours(0, 0, 0, 0);
    
    const analyses = Array.from(this.analyses.values());
    
    const userUsageStats = users.map(user => {
      const userAnalyses = analyses.filter(analysis => analysis.userId === user.id);
      const monthAnalyses = userAnalyses.filter(analysis => 
        analysis.createdAt >= currentMonth
      );
      
      return {
        id: user.id,
        username: user.username,
        email: user.email,
        tier: user.tier,
        total_analyses: userAnalyses.length,
        month_analyses: monthAnalyses.length,
        last_analysis: userAnalyses.length > 0 
          ? userAnalyses[userAnalyses.length - 1].createdAt.toISOString()
          : null
      };
    }).sort((a, b) => b.total_analyses - a.total_analyses);
    
    // Calculate anonymous user statistics
    const anonymousUsers = Array.from(this.anonymousUsage.values());
    const totalAnonymousUsers = anonymousUsers.length;
    const totalAnonymousAnalyses = anonymousUsers.reduce((sum, user) => sum + user.count, 0);
    const averageAnalysesPerAnonymousUser = totalAnonymousUsers > 0 
      ? Math.round((totalAnonymousAnalyses / totalAnonymousUsers) * 100) / 100 
      : 0;

    return {
      totalUsers,
      usersByTier,
      registrationsByDate,
      tierConversionRate,
      anonymousStats: {
        totalAnonymousUsers,
        totalAnonymousAnalyses,
        averageAnalysesPerAnonymousUser
      }
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

// Implementation of IStorage using PostgreSQL database
import { db } from './db';
import { eq, and, desc, or, gte, lte, sql } from 'drizzle-orm';
import connect from 'connect-pg-simple';
import session from 'express-session';

export class DatabaseStorage implements IStorage {
  private sessionStore: session.Store;
  
  constructor() {
    // Create PostgreSQL session store
    const PostgresStore = connect(session);
    this.sessionStore = new PostgresStore({
      conObject: {
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false },
      },
      createTableIfMissing: true,
    });
  }

  // User Management
  async getUser(id: number): Promise<User | undefined> {
    const results = await db.select().from(users).where(eq(users.id, id));
    return results[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const results = await db.select().from(users).where(eq(users.username, username));
    return results[0];
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const normalizedEmail = email.toLowerCase().trim();
    const results = await db.select().from(users).where(eq(users.email, normalizedEmail));
    return results[0];
  }

  async getUserByVerificationCode(code: string): Promise<User | undefined> {
    const results = await db
      .select()
      .from(users)
      .where(
        and(
          eq(users.verificationCode, code),
          gte(users.verificationCodeExpires as any, new Date())
        )
      );
    return results[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    // Normalize email
    const normalizedEmail = insertUser.email.toLowerCase().trim();
    
    const results = await db
      .insert(users)
      .values({
        ...insertUser,
        email: normalizedEmail,
      })
      .returning();
    
    // Create usage limits for the new user
    await db.insert(usageLimits).values({
      userId: results[0].id,
      monthlyTotal: 0,
      lastResetDate: new Date(),
    });
    
    return results[0];
  }

  async updateUserTier(userId: number, tier: string): Promise<User> {
    const oldUser = await this.getUser(userId);
    
    if (!oldUser) {
      throw new Error(`User with ID ${userId} not found`);
    }
    
    // Track tier change event
    await this.trackUserEvent({
      userId,
      eventType: 'tier_change',
      oldValue: oldUser.tier,
      newValue: tier
    });
    
    const results = await db
      .update(users)
      .set({ tier })
      .where(eq(users.id, userId))
      .returning();
    
    return results[0];
  }

  async updateUserPassword(userId: number, newPassword: string): Promise<User> {
    const results = await db
      .update(users)
      .set({ password: newPassword })
      .where(eq(users.id, userId))
      .returning();
    
    return results[0];
  }

  async updateStripeCustomerId(userId: number, customerId: string): Promise<User> {
    const results = await db
      .update(users)
      .set({ stripeCustomerId: customerId })
      .where(eq(users.id, userId))
      .returning();
    
    return results[0];
  }

  async updateStripeSubscriptionId(userId: number, subscriptionId: string): Promise<User> {
    const results = await db
      .update(users)
      .set({ stripeSubscriptionId: subscriptionId })
      .where(eq(users.id, userId))
      .returning();
    
    return results[0];
  }

  async setVerificationCode(userId: number, code: string, expiresInMinutes: number): Promise<User> {
    const expiryDate = new Date();
    expiryDate.setMinutes(expiryDate.getMinutes() + expiresInMinutes);
    
    const results = await db
      .update(users)
      .set({
        verificationCode: code,
        verificationCodeExpires: expiryDate
      })
      .where(eq(users.id, userId))
      .returning();
    
    return results[0];
  }

  async verifyEmail(userId: number): Promise<User> {
    const results = await db
      .update(users)
      .set({
        emailVerified: true,
        verificationCode: null,
        verificationCodeExpires: null
      })
      .where(eq(users.id, userId))
      .returning();
    
    return results[0];
  }

  // Admin Management
  async getAllUsers(): Promise<User[]> {
    return db.select().from(users);
  }

  async getAllUsersWithPromoInfo(): Promise<(User & { promoCode?: string; promoUsedAt?: Date })[]> {
    const result = await db
      .select({
        id: users.id,
        username: users.username,
        password: users.password,
        tier: users.tier,
        email: users.email,
        emailVerified: users.emailVerified,
        verificationCode: users.verificationCode,
        verificationCodeExpires: users.verificationCodeExpires,
        stripeCustomerId: users.stripeCustomerId,
        stripeSubscriptionId: users.stripeSubscriptionId,
        isAdmin: users.isAdmin,
        discountPercentage: users.discountPercentage,
        discountExpiryDate: users.discountExpiryDate,
        country: users.country,
        promoCode: promoCodes.code,
        promoUsedAt: promoUsage.usedAt,
      })
      .from(users)
      .leftJoin(promoUsage, eq(users.id, promoUsage.userId))
      .leftJoin(promoCodes, eq(promoUsage.promoCodeId, promoCodes.id));

    return result;
  }

  async setUserAdmin(userId: number, isAdmin: boolean): Promise<User> {
    const results = await db
      .update(users)
      .set({ isAdmin })
      .where(eq(users.id, userId))
      .returning();
    
    return results[0];
  }

  async setUserDiscount(userId: number, discountPercentage: number, expiryDays: number = 30): Promise<User> {
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + expiryDays);
    
    const results = await db
      .update(users)
      .set({
        discountPercentage,
        discountExpiryDate: expiryDate
      })
      .where(eq(users.id, userId))
      .returning();
    
    return results[0];
  }

  // Analysis Management
  async saveAnalysis(analysis: InsertAnalysis): Promise<Analysis> {
    const results = await db
      .insert(analyses)
      .values(analysis)
      .returning();
    
    // Update usage count
    await this.incrementUserUsage(analysis.userId);
    
    return results[0];
  }

  async getUserAnalyses(userId: number): Promise<Analysis[]> {
    return db
      .select()
      .from(analyses)
      .where(eq(analyses.userId, userId))
      .orderBy(desc(analyses.createdAt));
  }

  // Usage Tracking
  async getUserUsage(userId: number): Promise<{ used: number, limit: number | null, tier: string }> {
    const user = await this.getUser(userId);
    
    if (!user) {
      throw new Error(`User with ID ${userId} not found`);
    }
    
    let usageLimit = await db
      .select()
      .from(usageLimits)
      .where(eq(usageLimits.userId, userId))
      .then(results => results[0]);
    
    if (!usageLimit) {
      // Create usage limit if it doesn't exist
      usageLimit = await db
        .insert(usageLimits)
        .values({
          userId,
          monthlyTotal: 0,
          lastResetDate: new Date()
        })
        .returning()
        .then(results => results[0]);
    }
    
    // Check if we need to reset the monthly usage
    const now = new Date();
    const lastReset = usageLimit.lastResetDate;
    if (lastReset.getMonth() !== now.getMonth() || lastReset.getFullYear() !== now.getFullYear()) {
      usageLimit = await db
        .update(usageLimits)
        .set({
          monthlyTotal: 0,
          lastResetDate: now
        })
        .where(eq(usageLimits.userId, userId))
        .returning()
        .then(results => results[0]);
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
      limit = null; // Basic tier (free but logged in) - unlimited analysis
    }
    
    return {
      used: usageLimit.monthlyTotal,
      limit,
      tier: user.tier
    };
  }

  async incrementUserUsage(userId: number): Promise<void> {
    let usageLimit = await db
      .select()
      .from(usageLimits)
      .where(eq(usageLimits.userId, userId))
      .then(results => results[0]);
    
    if (!usageLimit) {
      // Create usage limit if it doesn't exist
      await db.insert(usageLimits).values({
        userId,
        monthlyTotal: 1,
        lastResetDate: new Date()
      });
    } else {
      // Update usage count
      await db
        .update(usageLimits)
        .set({ monthlyTotal: usageLimit.monthlyTotal + 1 })
        .where(eq(usageLimits.userId, userId));
    }
  }

  // Anonymous Usage Tracking
  async getAnonymousUsage(deviceId: string): Promise<AnonymousUsage | undefined> {
    // For anonymous usage, we'll track it in a server-side cache
    // In a real production environment, you would use a database table for this
    return undefined;
  }

  async incrementAnonymousUsage(deviceId: string): Promise<AnonymousUsage> {
    // Since we're moving to a database, we should implement this properly
    // For now, return a dummy value
    return {
      deviceId,
      count: 1,
      lastUsed: new Date()
    };
  }

  // User Events
  async trackUserEvent(event: InsertUserEvent): Promise<UserEvent> {
    const results = await db
      .insert(userEvents)
      .values(event)
      .returning();
    
    return results[0];
  }

  async getUserEvents(filter?: { 
    userId?: number, 
    eventType?: string, 
    startDate?: Date, 
    endDate?: Date 
  }): Promise<UserEvent[]> {
    let query = db.select().from(userEvents);
    
    if (filter) {
      const conditions = [];
      
      if (filter.userId !== undefined) {
        conditions.push(eq(userEvents.userId, filter.userId));
      }
      
      if (filter.eventType) {
        conditions.push(eq(userEvents.eventType, filter.eventType));
      }
      
      if (filter.startDate) {
        conditions.push(gte(userEvents.createdAt, filter.startDate));
      }
      
      if (filter.endDate) {
        conditions.push(lte(userEvents.createdAt, filter.endDate));
      }
      
      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }
    }
    
    return query.orderBy(desc(userEvents.createdAt));
  }

  async getAnalyticsSummary(): Promise<{
    totalUsers: number;
    usersByTier: { [tier: string]: number };
    registrationsByDate: { date: string; count: number }[];
    tierConversionRate: { fromTier: string; toTier: string; count: number }[];
  }> {
    // Get total users count
    const totalUsers = await db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .then(result => result[0].count);
    
    // Get users by tier
    const usersByTierResult = await db
      .select({
        tier: users.tier,
        count: sql<number>`count(*)`
      })
      .from(users)
      .groupBy(users.tier);
    
    const usersByTier: { [tier: string]: number } = {};
    usersByTierResult.forEach(row => {
      usersByTier[row.tier] = Number(row.count);
    });
    
    // Get registrations by date
    const registrationEventsResult = await db
      .select({
        date: sql<string>`to_char(${userEvents.createdAt}, 'YYYY-MM-DD')`,
        count: sql<number>`count(*)`
      })
      .from(userEvents)
      .where(eq(userEvents.eventType, 'registration'))
      .groupBy(sql`to_char(${userEvents.createdAt}, 'YYYY-MM-DD')`)
      .orderBy(sql`to_char(${userEvents.createdAt}, 'YYYY-MM-DD')`);
    
    const registrationsByDate = registrationEventsResult.map(row => ({
      date: row.date,
      count: Number(row.count)
    }));
    
    // Get tier conversion rates
    const tierChangeEventsResult = await db
      .select({
        oldTier: userEvents.oldValue,
        newTier: userEvents.newValue,
        count: sql<number>`count(*)`
      })
      .from(userEvents)
      .where(eq(userEvents.eventType, 'tier_change'))
      .groupBy(userEvents.oldValue, userEvents.newValue);
    
    const tierConversionRate = tierChangeEventsResult.map(row => ({
      fromTier: row.oldTier || 'unknown',
      toTier: row.newTier || 'unknown',
      count: Number(row.count)
    }));
    
    return {
      totalUsers: Number(totalUsers),
      usersByTier,
      registrationsByDate,
      tierConversionRate
    };
  }

  // Promo Codes
  async createPromoCode(promoCode: InsertPromoCode): Promise<PromoCode> {
    const results = await db
      .insert(promoCodes)
      .values(promoCode)
      .returning();
    
    return results[0];
  }

  async getPromoCode(id: number): Promise<PromoCode | undefined> {
    const results = await db
      .select()
      .from(promoCodes)
      .where(eq(promoCodes.id, id));
    
    return results[0];
  }

  async getPromoCodeByCode(code: string): Promise<PromoCode | undefined> {
    const results = await db
      .select()
      .from(promoCodes)
      .where(eq(promoCodes.code, code));
    
    return results[0];
  }

  async updatePromoCode(id: number, updates: Partial<PromoCode>): Promise<PromoCode> {
    const results = await db
      .update(promoCodes)
      .set(updates)
      .where(eq(promoCodes.id, id))
      .returning();
    
    return results[0];
  }

  async getAllPromoCodes(): Promise<PromoCode[]> {
    return db.select().from(promoCodes);
  }

  async getActivePromoCodes(): Promise<PromoCode[]> {
    const now = new Date();
    
    return db
      .select()
      .from(promoCodes)
      .where(
        and(
          eq(promoCodes.isActive, true),
          or(
            sql`${promoCodes.expiryDate} IS NULL`,
            gte(promoCodes.expiryDate as any, now)
          ),
          lte(promoCodes.startDate, now)
        )
      );
  }

  async usePromoCode(code: string, userId: number, tier: string): Promise<{ 
    success: boolean, 
    discountPercentage?: number, 
    message?: string 
  }> {
    const promoCode = await this.getPromoCodeByCode(code);
    
    if (!promoCode) {
      return { success: false, message: "Promo code not found" };
    }
    
    if (!promoCode.isActive) {
      return { success: false, message: "Promo code is not active" };
    }
    
    const now = new Date();
    
    if (promoCode.startDate > now) {
      return { success: false, message: "Promo code is not yet valid" };
    }
    
    if (promoCode.expiryDate && promoCode.expiryDate < now) {
      return { success: false, message: "Promo code has expired" };
    }
    
    if (promoCode.maxUses && promoCode.usedCount >= promoCode.maxUses) {
      return { success: false, message: "Promo code usage limit reached" };
    }
    
    if (promoCode.targetTier && promoCode.targetTier !== tier) {
      return { success: false, message: `Promo code only valid for ${promoCode.targetTier} tier` };
    }
    
    // Check if user has already used this promo code
    const existingUsage = await db
      .select()
      .from(promoUsage)
      .where(
        and(
          eq(promoUsage.promoCodeId, promoCode.id),
          eq(promoUsage.userId, userId)
        )
      )
      .then(results => results[0]);
    
    if (existingUsage) {
      return { success: false, message: "You have already used this promo code" };
    }
    
    // Record usage
    await db.insert(promoUsage).values({
      promoCodeId: promoCode.id,
      userId,
      appliedDiscount: promoCode.discountPercentage,
      targetTier: tier
    });
    
    // Update promo code usage count
    await db
      .update(promoCodes)
      .set({ usedCount: promoCode.usedCount + 1 })
      .where(eq(promoCodes.id, promoCode.id));
    
    return { 
      success: true, 
      discountPercentage: promoCode.discountPercentage 
    };
  }

  async getPromoUsageByUser(userId: number): Promise<PromoUsage[]> {
    return db
      .select()
      .from(promoUsage)
      .where(eq(promoUsage.userId, userId));
  }

  async getAllPromoUsages(): Promise<PromoUsage[]> {
    return db.select().from(promoUsage);
  }
}

export const storage = new DatabaseStorage();
