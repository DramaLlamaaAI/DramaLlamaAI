import express, { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { analysisController } from "./controllers/analysis-controller";
import { authController } from "./controllers/auth-controller";
import { paymentController } from "./controllers/payment-controller";
import { transcriptionUpload, transcribeAudio } from "./controllers/transcription-controller";
import { adminController, isAdmin } from "./controllers/admin-controller";
import { adminDiscountController } from "./controllers/admin-discount-controller";
import { adminEmailController } from "./controllers/admin-email-controller";
import { promoCodeController } from "./controllers/promo-code-controller";
import { promoCodeReportController } from "./controllers/promo-code-report-controller";
import session from "express-session";
import memoryStore from "memorystore";

// Middleware to check if the user is authenticated
const isAuthenticated = (req: Request, res: Response, next: NextFunction) => {
  if (req.session && req.session.userId) {
    next();
  } else {
    res.status(401).json({ error: "Authentication required" });
  }
};

// Middleware to check free trial eligibility for anonymous users
const checkTrialEligibility = async (req: Request, res: Response, next: NextFunction) => {
  // If user is authenticated, allow the request
  if (req.session && req.session.userId) {
    return next();
  }
  
  // Check if device ID is provided
  const deviceId = req.headers['x-device-id'] as string;
  if (!deviceId) {
    return res.status(400).json({ error: "Device ID required for anonymous usage" });
  }
  
  // Check anonymous usage
  const usage = await storage.getAnonymousUsage(deviceId);
  
  // If user has not used their free trial yet, allow the request
  if (!usage || usage.count < 1) {
    next();
  } else {
    // User has used their free trial
    res.status(403).json({ 
      error: "Free trial already used",
      message: "Please sign up or log in to continue using Drama Llama."
    });
  }
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up session middleware
  const MemoryStore = memoryStore(session);
  
  // Debug current environment
  console.log("Environment setup:", {
    nodeEnv: process.env.NODE_ENV,
    isDevelopment: process.env.NODE_ENV === 'development',
    isProduction: process.env.NODE_ENV === 'production'
  });
  
  // Add trust proxy to handle cookies properly
app.set('trust proxy', 1);

// Configure session based on environment
const isProduction = process.env.NODE_ENV === 'production';
app.use(session({
    secret: process.env.SESSION_SECRET || 'drama-llama-secret',
    resave: true, // Force session to be saved back to store
    saveUninitialized: true, // Create session for all visitors
    cookie: { 
      secure: false, // Allow non-secure cookies for development
      sameSite: 'lax', // Fix cross-site cookie issues
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      httpOnly: true, // Only accessible via HTTP
      path: '/' // Available across the entire site
    },
    store: new MemoryStore({
      checkPeriod: 86400000 // Prune expired entries every 24h
    })
  }));
  
  // Authentication routes
  app.post('/api/auth/register', authController.register);
  app.post('/api/auth/login', authController.login);
  app.post('/api/auth/logout', authController.logout);
  app.get('/api/auth/user', authController.getCurrentUser);
  app.post('/api/auth/check-trial', authController.trackAnonymousUsage);
  
  // Email verification routes
  app.post('/api/auth/verify-email', authController.verifyEmail);
  app.post('/api/auth/resend-verification', authController.resendVerification);
  
  // Password reset routes
  app.post('/api/auth/forgot-password', authController.forgotPassword);
  app.post('/api/auth/reset-password', authController.resetPassword);
  
  // User usage data
  app.get('/api/user/usage', authController.getUserUsage);
  
  // DEBUG: Temporary route to help with admin login issues (remove in production)
  app.get('/api/debug/users', async (req: Request, res: Response) => {
    if (process.env.NODE_ENV !== 'development') {
      return res.status(403).json({ error: 'Debug routes only available in development' });
    }
    
    const users = await storage.getAllUsers();
    const safeUsers = users.map(user => {
      // Include password hash format for debugging
      return {
        id: user.id,
        username: user.username,
        email: user.email,
        tier: user.tier,
        isAdmin: user.isAdmin,
        emailVerified: user.emailVerified,
        passwordFormat: user.password.includes(':') ? 'Correct (salt:hash)' : 'Invalid (no salt separator)'
      };
    });
    
    res.json(safeUsers);
  });
  
  // Analysis routes with trial eligibility check
  app.post('/api/analyze/chat', checkTrialEligibility, analysisController.analyzeChat);
  app.post('/api/analyze/message', checkTrialEligibility, analysisController.analyzeMessage);
  app.post('/api/analyze/de-escalate', checkTrialEligibility, analysisController.deEscalateMessage);
  
  // These routes don't count against usage limits
  app.post('/api/analyze/detect-names', analysisController.detectNames);
  app.post('/api/ocr', analysisController.processOcr);
  
  // ZIP file extraction route
  app.post('/api/extract-chat', async (req: Request, res: Response) => {
    try {
      const { file } = req.body;
      
      if (!file) {
        return res.status(400).json({ error: 'No file provided' });
      }
      
      // Handle base64 with or without data URL prefix
      let fileBuffer;
      if (file.includes('base64,')) {
        // Extract base64 part from data URL
        fileBuffer = Buffer.from(file.split('base64,')[1], 'base64');
      } else {
        // Use as-is if it's already just base64
        fileBuffer = Buffer.from(file, 'base64');
      }
      
      console.log('ZIP file size:', fileBuffer.length, 'bytes');
      
      // Process with JSZip
      const JSZip = await import('jszip');
      const zip = new JSZip.default();
      
      try {
        // Load ZIP content
        const zipContents = await zip.loadAsync(fileBuffer);
        console.log('Files in ZIP:', Object.keys(zipContents.files).length);
        
        // Find a .txt file in the ZIP
        let textContent = '';
        let foundTextFile = false;
        
        for (const filename of Object.keys(zipContents.files)) {
          const zipFile = zipContents.files[filename];
          
          console.log('Processing file in ZIP:', filename, zipFile.dir ? '(directory)' : '(file)');
          
          // Skip directories and non-text files
          if (zipFile.dir || !(filename.endsWith('.txt') || filename.includes('_chat'))) continue;
          
          try {
            // Extract the text content
            textContent = await zipFile.async('text');
            foundTextFile = true;
            console.log('Found text file in ZIP:', filename, 'with', textContent.length, 'characters');
            break;
          } catch (fileErr) {
            console.error('Error extracting file from ZIP:', filename, fileErr);
          }
        }
        
        if (!foundTextFile) {
          return res.status(400).json({ error: 'No chat text file found in the ZIP archive' });
        }
        
        res.json({ text: textContent });
      } catch (zipErr) {
        console.error('Error processing ZIP archive:', zipErr);
        return res.status(400).json({ error: 'Invalid ZIP file format' });
      }
    } catch (error) {
      console.error('Error extracting chat from ZIP:', error);
      res.status(500).json({ error: 'Failed to extract chat from ZIP file' });
    }
  });
  
  // Audio transcription route (Pro feature)
  // Allow trial users to use this feature without authentication for better user experience
  app.post('/api/transcribe', transcriptionUpload, transcribeAudio);
  
  // Payment routes
  app.post('/api/create-subscription', isAuthenticated, paymentController.createSubscription);
  // Stripe webhook endpoint with specialized body parsing for signature verification
  const stripeWebhookMiddleware = (req: Request, res: Response, next: NextFunction) => {
    if (req.headers['content-type'] === 'application/json') {
      let rawBody = '';
      req.on('data', chunk => { rawBody += chunk; });
      req.on('end', () => {
        if (rawBody) {
          (req as any).rawBody = rawBody;
          req.body = JSON.parse(rawBody);
        }
        next();
      });
    } else {
      next();
    }
  };

  app.post('/api/webhook', stripeWebhookMiddleware, paymentController.handleWebhook);
  
  // Admin routes (require admin access)
  app.get('/api/admin/users', isAuthenticated, isAdmin, adminController.getAllUsers);
  app.put('/api/admin/user/tier', isAuthenticated, isAdmin, adminController.updateUserTier);
  app.put('/api/admin/user/admin', isAuthenticated, isAdmin, adminController.makeUserAdmin);
  app.put('/api/admin/user/discount', isAuthenticated, isAdmin, adminController.setUserDiscount);
  
  // Advanced discount and bulk actions
  app.post('/api/admin/users/bulk-discount', isAuthenticated, isAdmin, adminDiscountController.applyBulkDiscount);
  app.post('/api/admin/discount-campaigns', isAuthenticated, isAdmin, adminDiscountController.createDiscountCampaign);
  
  // Subscription management
  app.get('/api/admin/subscriptions/:id', isAuthenticated, isAdmin, adminDiscountController.getSubscription);
  app.put('/api/admin/subscriptions/update', isAuthenticated, isAdmin, adminDiscountController.updateSubscription);
  app.put('/api/admin/subscriptions/cancel', isAuthenticated, isAdmin, adminDiscountController.cancelSubscription);
  app.put('/api/admin/subscriptions/reactivate', isAuthenticated, isAdmin, adminDiscountController.reactivateSubscription);
  
  // Email notifications
  app.post('/api/admin/email/send', isAuthenticated, isAdmin, adminEmailController.sendBulkEmails);
  
  // Promo code management - commented out for now until admin controller is fully implemented
  // Will be implemented in the admin controller
  
  // Public promo code routes
  app.get('/api/promo-codes/active', isAuthenticated, isAdmin, promoCodeController.getAllActive);
  app.post('/api/promo-codes/redeem', promoCodeController.redeemCode);
  
  // Promo code reporting
  app.get('/api/admin/promo-codes/report', isAuthenticated, isAdmin, promoCodeReportController.getPromoCodeUsageReport);
  
  // Analytics routes (require admin access)
  app.get('/api/admin/analytics', isAuthenticated, isAdmin, async (req: Request, res: Response) => {
    try {
      const analyticsData = await storage.getAnalyticsSummary();
      res.status(200).json(analyticsData);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to retrieve analytics data' });
    }
  });
  
  app.get('/api/admin/events', isAuthenticated, isAdmin, async (req: Request, res: Response) => {
    try {
      const { userId, eventType, startDate, endDate } = req.query;
      
      // Create filter object
      const filter: { 
        userId?: number;
        eventType?: string;
        startDate?: Date;
        endDate?: Date;
      } = {};
      
      // Add filters if provided
      if (userId) filter.userId = Number(userId);
      if (eventType) filter.eventType = eventType as string;
      if (startDate) filter.startDate = new Date(startDate as string);
      if (endDate) filter.endDate = new Date(endDate as string);
      
      const events = await storage.getUserEvents(filter);
      res.status(200).json(events);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to retrieve events data' });
    }
  });
  
  // Protected routes that require authentication
  app.get('/api/user/analyses', isAuthenticated, async (req: Request, res: Response) => {
    try {
      // We're guaranteed to have userId because of the isAuthenticated middleware
      const userId = req.session!.userId!;
      const analyses = await storage.getUserAnalyses(userId);
      res.json(analyses);
    } catch (error) {
      console.error("Error fetching analyses:", error);
      res.status(500).json({ error: "Failed to fetch analyses" });
    }
  });
  
  // Promo code routes
  app.post('/api/promo-codes/redeem', promoCodeController.redeemCode);
  app.get('/api/promo-codes/active', isAuthenticated, isAdmin, promoCodeController.getAllActive);
  app.get('/api/user/promo-usage', isAuthenticated, promoCodeController.getUserPromoUsage);
  
  // Update create-subscription endpoint to handle promo codes (called from checkout page)
  app.post('/api/create-subscription', async (req: Request, res: Response) => {
    try {
      const { plan, promoCode } = req.body;
      
      // Get base price for the plan
      const prices = {
        'free': 0,
        'personal': 499,  // £4.99
        'pro': 999,       // £9.99
        'deepdive': 1999  // £19.99
      };
      
      const selectedPlan = plan?.toLowerCase() || 'personal';
      const baseAmount = prices[selectedPlan as keyof typeof prices] || prices.personal;
      
      // Initialize response with original price
      const response: any = {
        originalAmount: baseAmount,
        finalAmount: baseAmount,
        hasDiscount: false,
        clientSecret: "mock_client_secret_" + Date.now()
      };
      
      // If user is authenticated and promo code provided, apply discount
      if (req.session?.userId && promoCode) {
        const userId = req.session.userId;
        const tier = selectedPlan;
        
        const discountResult = await storage.usePromoCode(promoCode, userId, tier);
        
        if (discountResult.success && discountResult.discountPercentage) {
          // Calculate discounted amount
          const discountAmount = Math.round(baseAmount * (discountResult.discountPercentage / 100));
          const finalAmount = baseAmount - discountAmount;
          
          // Update response with discount info
          response.hasDiscount = true;
          response.discountPercentage = discountResult.discountPercentage;
          response.finalAmount = finalAmount;
          
          // In a real implementation, we would create a Stripe Payment Intent here
          // with the discounted amount
        }
      }
      
      res.json(response);
    } catch (error: any) {
      console.error("Error creating subscription:", error);
      res.status(500).json({ error: error.message });
    }
  });
  
  // Create HTTP server
  const httpServer = createServer(app);

  return httpServer;
}
