import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { analysisController } from "./controllers/analysis-controller";
import { authController } from "./controllers/auth-controller";
import { paymentController } from "./controllers/payment-controller";
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
  
  // Email verification routes
  app.post('/api/auth/verify-email', authController.verifyEmail);
  app.post('/api/auth/resend-verification', authController.resendVerification);
  
  // User usage data
  app.get('/api/user/usage', authController.getUserUsage);
  
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
  app.post('/api/webhook', paymentController.handleWebhook);
  
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
