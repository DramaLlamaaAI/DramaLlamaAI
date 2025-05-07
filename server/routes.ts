import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { analysisController } from "./controllers/analysis-controller";
import { authController } from "./controllers/auth-controller";
import { transcriptionUpload, transcribeAudio } from "./controllers/transcription-controller";
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
  app.use(session({
    secret: process.env.SESSION_SECRET || 'drama-llama-secret',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: process.env.NODE_ENV === 'production' },
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
  
  // User usage data
  app.get('/api/user/usage', authController.getUserUsage);
  
  // Analysis routes with trial eligibility check
  app.post('/api/analyze/chat', checkTrialEligibility, analysisController.analyzeChat);
  app.post('/api/analyze/message', checkTrialEligibility, analysisController.analyzeMessage);
  app.post('/api/analyze/vent', checkTrialEligibility, analysisController.ventMessage);
  
  // These routes don't count against usage limits
  app.post('/api/analyze/detect-names', analysisController.detectNames);
  app.post('/api/ocr', analysisController.processOcr);
  
  // Audio transcription route (Pro feature)
  app.post('/api/transcribe', isAuthenticated, transcriptionUpload, transcribeAudio);
  
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
  
  // Create HTTP server
  const httpServer = createServer(app);

  return httpServer;
}
