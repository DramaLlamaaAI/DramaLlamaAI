import express, { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
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
import { sendChatNotification } from "./services/chat-notification-service";
import { adminPromoCodeController } from "./controllers/admin-promo-code-controller";
import { referralCodeController } from "./controllers/referral-code-controller";
import { analyzeChatConversation } from "./services/anthropic-updated";
import session from "express-session";
import memoryStore from "memorystore";
import multer from "multer";

/**
 * Validates if extracted text appears to be a valid WhatsApp chat export
 */
function isValidWhatsAppFormat(text: string): boolean {
  if (!text || text.trim().length < 20) return false;
  
  const lines = text.split('\n').filter(line => line.trim().length > 0);
  if (lines.length < 3) return false;
  
  // More comprehensive WhatsApp patterns to handle various export formats
  const whatsappPatterns = [
    // Standard formats with dash separator
    /\d{1,2}\/\d{1,2}\/\d{2,4},?\s*\d{1,2}:\d{2}(\s*(AM|PM))?\s*-\s*.+:\s*.+/i,
    
    // Bracketed timestamp formats
    /\[\d{1,2}\/\d{1,2}\/\d{2,4},?\s*\d{1,2}:\d{2}(:\d{2})?(\s*(AM|PM))?\]\s*.+:\s*.+/i,
    
    // Time-only formats (continuation messages)
    /\d{1,2}:\d{2}(\s*(AM|PM))?\s*-\s*.+:\s*.+/i,
    
    // International date formats
    /\d{1,2}[\.\/\-]\d{1,2}[\.\/\-]\d{2,4},?\s*\d{1,2}:\d{2}.*-.*:\s*.+/i,
    
    // Message continuation lines (no timestamp but has colon)
    /^[^:\[\(]*:\s*.+/,
    
    // Lines that contain participant names and message indicators
    /\s*-\s*.+:\s*.+/
  ];
  
  let validLines = 0;
  let totalChecked = 0;
  
  // Check first 15 lines to determine format
  for (const line of lines.slice(0, Math.min(15, lines.length))) {
    if (line.trim().length < 5) continue; // Skip very short lines
    
    totalChecked++;
    
    // Check against WhatsApp patterns
    if (whatsappPatterns.some(pattern => pattern.test(line))) {
      validLines++;
    }
    // Also accept lines that clearly contain names and messages
    else if (line.includes(':') && line.trim().length > 10) {
      const colonIndex = line.indexOf(':');
      const beforeColon = line.substring(0, colonIndex).trim();
      const afterColon = line.substring(colonIndex + 1).trim();
      
      // If we have reasonable name and message content
      if (beforeColon.length > 0 && beforeColon.length < 50 && afterColon.length > 0) {
        validLines += 0.5; // Partial credit
      }
    }
  }
  
  const validPercentage = totalChecked > 0 ? validLines / totalChecked : 0;
  console.log(`WhatsApp validation: ${validLines}/${totalChecked} valid lines (${Math.round(validPercentage * 100)}%)`);
  
  // More lenient threshold - accept if 25% of lines match patterns and we have at least 2 clear matches
  return validLines >= 2 && validPercentage >= 0.25;
}

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
  
  // If user has not used their free trial yet, allow the request (now 5 analyses)
  if (!usage || usage.count < 5) {
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
  app.post('/api/analyze', checkTrialEligibility, analysisController.analyzeChat);
  app.post('/api/analyze/chat', checkTrialEligibility, analysisController.analyzeChat);
  app.post('/api/analyze/message', checkTrialEligibility, analysisController.analyzeMessage);
  app.post('/api/analyze/de-escalate', checkTrialEligibility, analysisController.deEscalateMessage);
  
  // These routes don't count against usage limits
  app.post('/api/analyze/detect-names', analysisController.detectNames);
  app.post('/api/ocr', analysisController.processOcr);
  app.post('/api/analyze/whatsapp-screenshot', analysisController.processWhatsAppScreenshot);
  
  // Chat import endpoint for WhatsApp export files
  const chatUpload = multer({ 
    storage: multer.memoryStorage(),
    limits: { 
      fileSize: 50 * 1024 * 1024, // 50MB limit for chat files
      files: 5 // Max 5 files
    },
    fileFilter: (req, file, cb) => {
      console.log('Chat file upload - processing file:', file.mimetype, file.originalname);
      
      // Accept text files and zip files
      if (file.mimetype === 'text/plain' || 
          file.mimetype === 'application/zip' ||
          file.originalname.toLowerCase().endsWith('.txt') ||
          file.originalname.toLowerCase().endsWith('.zip')) {
        cb(null, true);
        return;
      }
      
      console.log('Rejecting file - not a valid chat file:', file.mimetype, file.originalname);
      cb(new Error('Only .txt and .zip files are allowed'));
    }
  });
  
  app.post('/api/chat/import', checkTrialEligibility, chatUpload.array('file', 5), analysisController.importChatFiles);
  
  // Configure multer for image uploads
  const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { 
      fileSize: 10 * 1024 * 1024, // 10MB limit per file
      files: 10 // Max 10 files
    },
    fileFilter: (req, file, cb) => {
      console.log('Multer fileFilter - processing file:', file.mimetype, file.originalname, file.size);
      
      // Accept files with proper image MIME types
      if (file.mimetype.startsWith('image/')) {
        cb(null, true);
        return;
      }
      
      // Also accept files with image extensions, even if MIME type is wrong
      const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'];
      const fileExtension = file.originalname.toLowerCase().match(/\.[^.]*$/)?.[0];
      
      if (fileExtension && imageExtensions.includes(fileExtension)) {
        console.log('Accepting file based on extension:', fileExtension);
        cb(null, true);
        return;
      }
      
      console.log('Rejecting file - not an image:', file.mimetype, file.originalname);
      cb(new Error('Only image files are allowed'));
    }
  });

  // Separate multer configuration for text files (chat imports)
  const uploadText = multer({ 
    storage: multer.memoryStorage(),
    limits: { 
      fileSize: 10 * 1024 * 1024, // 10MB limit per file
      files: 1 // Single file for chat import
    },
    fileFilter: (req, file, cb) => {
      console.log('Text file filter - processing file:', file.mimetype, file.originalname);
      
      // Accept text files and zip files
      if (file.mimetype === 'text/plain' || 
          file.mimetype === 'application/zip' ||
          file.mimetype === 'application/x-zip-compressed' ||
          file.originalname.toLowerCase().endsWith('.txt') ||
          file.originalname.toLowerCase().endsWith('.zip')) {
        console.log('Accepting text/zip file:', file.originalname);
        cb(null, true);
        return;
      }
      
      console.log('Rejecting file - not a text or zip file:', file.mimetype, file.originalname);
      cb(new Error('Only .txt and .zip files are allowed for chat import'));
    }
  });

  // Multer error handler
  const handleMulterError = (error: any, req: Request, res: Response, next: NextFunction) => {
    console.error('Multer error:', error);
    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'File too large. Maximum size is 10MB per file.' });
      }
      if (error.code === 'LIMIT_FILE_COUNT') {
        return res.status(400).json({ error: 'Too many files. Maximum is 10 files.' });
      }
    }
    return res.status(400).json({ error: error.message || 'File upload error' });
  };

  // Test endpoint to verify basic connectivity
  app.get('/api/test-connection', (req: Request, res: Response) => {
    console.log('Test connection endpoint hit');
    res.json({ success: true, message: 'Server connection working' });
  });

  // Name detection endpoint for file uploads and JSON requests
  app.post('/api/analyze/detect-names', (req: Request, res: Response, next: NextFunction) => {
    console.log('Name detection middleware - Content-Type:', req.headers['content-type']);
    // Handle JSON requests (from test scripts)
    if (req.headers['content-type']?.includes('application/json')) {
      console.log('Skipping file upload middleware for JSON request');
      return next();
    }
    // Handle file uploads with text file filter
    console.log('Applying text file upload middleware');
    uploadText.single('file')(req, res, (err) => {
      if (err) {
        console.error('Multer error in name detection:', err);
        return res.status(400).json({ message: 'File upload error: ' + err.message });
      }
      next();
    });
  }, async (req: Request, res: Response) => {
    try {
      console.log('=== NAME DETECTION ENDPOINT DEBUG ===');
      console.log('Content-Type:', req.headers['content-type']);
      console.log('Has file:', !!req.file);
      console.log('File details:', req.file ? {
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size
      } : 'No file');
      console.log('Body keys:', Object.keys(req.body));
      console.log('Body content:', req.body);
      console.log('Has conversation in body:', !!req.body.conversation);
      
      let chatText = '';

      // Handle JSON request (from test scripts)
      if (req.body.conversation) {
        chatText = req.body.conversation;
        console.log('Using conversation from JSON body');
      }
      // Handle file upload
      else if (req.file) {
        const file = req.file;
        console.log('Processing uploaded file:', file.originalname);

        // Handle different file types
        if (file.originalname.toLowerCase().endsWith('.txt')) {
          chatText = file.buffer.toString('utf-8');
        } else if (file.originalname.toLowerCase().endsWith('.zip')) {
          const JSZip = require('jszip');
          const zip = new JSZip();
          const zipContents = await zip.loadAsync(file.buffer);
          
          const txtFiles = Object.keys(zipContents.files).filter(filename => 
            filename.toLowerCase().endsWith('.txt') && !zipContents.files[filename].dir
          );
          
          if (txtFiles.length === 0) {
            return res.status(400).json({ message: 'No .txt files found in ZIP archive' });
          }
          
          const txtFile = zipContents.files[txtFiles[0]];
          chatText = await txtFile.async('text');
        } else {
          return res.status(400).json({ message: 'Unsupported file type' });
        }
      } else {
        return res.status(400).json({ message: 'Missing required parameter: file or conversation' });
      }

      console.log('Chat text length:', chatText.length);

      // Use the existing name detection logic from the analysis controller
      const { detectParticipantNames } = await import('./controllers/analysis-controller');
      const detectedNames = await detectParticipantNames(chatText);
      
      console.log('Name detection result:', detectedNames);
      res.json(detectedNames);
    } catch (error) {
      console.error('Name detection error:', error);
      res.status(500).json({ message: 'Name detection failed', error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  // Azure OCR endpoint for base64 images (bypasses FormData issues)
  app.post('/api/ocr/azure-base64', checkTrialEligibility, async (req: Request, res: Response) => {
    try {
      console.log('Azure base64 OCR endpoint hit');
      console.log('Request body keys:', Object.keys(req.body || {}));
      console.log('Image data length:', req.body?.image?.length || 0);
      console.log('Parameters:', {
        leftSideName: req.body?.leftSideName,
        rightSideName: req.body?.rightSideName,
        filename: req.body?.filename
      });

      const { image, leftSideName, rightSideName, filename } = req.body;

      if (!image) {
        return res.status(400).json({ error: 'No image data provided' });
      }

      if (!leftSideName || !rightSideName) {
        return res.status(400).json({ error: 'Missing required parameters' });
      }

      console.log('Processing image with Azure Vision...');
      const { analyzeImageWithAzure } = await import('./services/azure-vision-clean');
      const result = await analyzeImageWithAzure(image, 'right', leftSideName, rightSideName);

      console.log('Azure processing completed successfully');
      console.log('Messages found:', result.messages.length);
      console.log('Raw text length:', result.rawText.length);

      res.json({
        success: true,
        results: [{
          rawText: result.rawText,
          messages: result.messages,
          imageWidth: result.imageWidth || 0
        }]
      });
    } catch (error) {
      console.error('Azure base64 OCR error:', error);
      res.status(500).json({ 
        error: 'Azure processing failed', 
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Test Azure connection without file upload
  app.get('/api/test-azure', async (req: Request, res: Response) => {
    try {
      console.log('Testing Azure Vision connection...');
      
      // Test with a simple 1x1 pixel image to verify Azure connection
      const testImageBase64 = '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/wB8=';
      
      const { analyzeImageWithAzure } = await import('./services/azure-vision');
      const result = await analyzeImageWithAzure(testImageBase64, 'right', 'Test', 'User');
      
      console.log('Azure test successful');
      res.json({ 
        success: true, 
        message: 'Azure Vision connection working',
        hasCredentials: true,
        testResult: {
          messagesFound: result.messages.length,
          rawTextLength: result.rawText.length
        }
      });
    } catch (error) {
      console.error('Azure test error:', error);
      res.status(500).json({ 
        error: 'Azure connection failed', 
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // New clean Azure OCR endpoint
  app.post('/api/ocr/azure-clean', upload.single('image'), async (req: Request, res: Response) => {
    try {
      const { messageSide, myName, theirName } = req.body;
      
      if (!req.file) {
        return res.status(400).json({ error: 'No image file provided' });
      }

      console.log('Clean Azure OCR endpoint hit');
      console.log('Parameters:', { messageSide, myName, theirName });
      console.log('Image size:', req.file.size);

      const { processScreenshotMessages } = await import('./services/azure-vision-new');
      const { leftMessages, rightMessages } = await processScreenshotMessages(
        req.file.buffer,
        messageSide as 'LEFT' | 'RIGHT',
        myName,
        theirName
      );

      res.json({
        success: true,
        results: [{
          messages: [...leftMessages, ...rightMessages],
          leftMessages: leftMessages.map(m => m.text),
          rightMessages: rightMessages.map(m => m.text),
          rawText: [...leftMessages, ...rightMessages].map(m => m.text).join('\n')
        }]
      });

    } catch (error) {
      console.error('Clean Azure OCR error:', error);
      res.status(500).json({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      });
    }
  });

  // Azure Computer Vision OCR endpoint
  app.post('/api/ocr/azure', checkTrialEligibility, (req: Request, res: Response, next: NextFunction) => {
    console.log('Azure OCR endpoint hit - before multer');
    next();
  }, upload.array('images', 10), handleMulterError, async (req: Request, res: Response) => {
    try {
      console.log('Azure OCR request received, processing', req.files?.length || 0, 'images');
      console.log('Request headers:', req.headers['content-type']);
      console.log('Request body params:', { messageSide: req.body.messageSide, meName: req.body.meName, themName: req.body.themName });
      const { analyzeImageWithAzure } = await import('./services/azure-vision');
      
      if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
        return res.status(400).json({ error: 'No images provided' });
      }
      
      // Extract message layout parameters
      const messageSide = req.body.messageSide || 'right'; // Default to right
      const meName = req.body.meName || 'You';
      const themName = req.body.themName || 'Other Person';
      
      const imageBuffers = (req.files as Express.Multer.File[]).map(file => file.buffer);
      console.log('Image buffers created, sizes:', imageBuffers.map(buf => buf.length));
      const results = [];
      
      for (let i = 0; i < imageBuffers.length; i++) {
        try {
          console.log(`Processing image ${i + 1}/${imageBuffers.length} with Azure...`);
          console.log('Converting to base64...');
          const base64Image = imageBuffers[i].toString('base64');
          console.log(`Base64 conversion complete, calling Azure with params: ${messageSide}, ${meName}, ${themName}`);
          const azureResult = await analyzeImageWithAzure(base64Image, messageSide, meName, themName);
          console.log('Azure processing completed successfully');
          results.push(azureResult);
          console.log(`Image ${i + 1}: ${azureResult.messages.length} messages extracted`);
        } catch (error) {
          console.error(`Failed to process image ${i + 1} with Azure:`, error);
          results.push({ messages: [], imageWidth: 0, rawText: '', error: error instanceof Error ? error.message : 'Unknown error' });
        }
      }
      
      console.log('Azure OCR processing complete, sending response');
      res.json({ 
        success: true, 
        results: results,
        totalImages: imageBuffers.length,
        successfulExtractions: results.filter(r => r.rawText && r.rawText.length > 0).length
      });
    } catch (error) {
      console.error('Azure OCR endpoint error:', error);
      res.status(500).json({ 
        error: 'Azure OCR processing failed', 
        message: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });

  // Google Cloud Vision OCR endpoint with positioning
  app.post('/api/ocr/google', (req: Request, res: Response, next: NextFunction) => {
    console.log('OCR endpoint hit - before multer');
    next();
  }, upload.array('images', 10), handleMulterError, async (req: Request, res: Response) => {
    try {
      console.log('OCR request received, processing', req.files?.length || 0, 'images');
      console.log('Request headers:', req.headers['content-type']);
      const { extractTextWithPositions } = await import('./services/google-vision');
      
      if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
        return res.status(400).json({ error: 'No images provided' });
      }
      
      const imageBuffers = (req.files as Express.Multer.File[]).map(file => file.buffer);
      console.log('Image buffers created, sizes:', imageBuffers.map(buf => buf.length));
      const results = [];
      
      for (let i = 0; i < imageBuffers.length; i++) {
        try {
          console.log(`Processing image ${i + 1}/${imageBuffers.length}...`);
          const positionData = await extractTextWithPositions(imageBuffers[i]);
          results.push(positionData);
          console.log(`Image ${i + 1}: ${positionData.leftMessages.length} left messages, ${positionData.rightMessages.length} right messages`);
        } catch (error) {
          console.error(`Failed to process image ${i + 1}:`, error);
          console.error('Full error details:', error);
          results.push({ leftMessages: [], rightMessages: [], allText: '' });
        }
      }
      
      console.log('OCR processing complete, sending response');
      res.json({ 
        success: true, 
        results: results,
        totalImages: imageBuffers.length,
        successfulExtractions: results.filter(r => r.allText.length > 0).length
      });
    } catch (error) {
      console.error('Google OCR endpoint error:', error);
      console.error('Full error stack:', error instanceof Error ? error.stack : error);
      res.status(500).json({ 
        error: 'OCR processing failed', 
        message: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });

  // Direct screenshot analysis - bypasses OCR extraction
  app.post('/api/analyze/screenshot-direct', upload.array('images', 10), handleMulterError, async (req: Request, res: Response) => {
    try {
      console.log('Direct screenshot analysis request received');
      
      if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
        return res.status(400).json({ error: 'No images provided' });
      }

      const results = [];
      const imageBuffers = (req.files as Express.Multer.File[]).map(file => file.buffer);
      
      for (let i = 0; i < imageBuffers.length; i++) {
        try {
          console.log(`Analyzing screenshot ${i + 1}/${imageBuffers.length} directly with Claude Vision...`);
          const base64Image = imageBuffers[i].toString('base64');
          
          // Import the analysis function
          const { analyzeWhatsAppScreenshot } = await import('./services/direct-analysis');
          const analysis = await analyzeWhatsAppScreenshot(base64Image);
          
          results.push({
            success: true,
            analysis: analysis,
            imageIndex: i
          });
          
        } catch (error) {
          console.error(`Failed to analyze screenshot ${i + 1}:`, error);
          results.push({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            imageIndex: i
          });
        }
      }
      
      res.json({
        success: true,
        results: results,
        totalImages: imageBuffers.length,
        successfulAnalyses: results.filter(r => r.success).length
      });
      
    } catch (error) {
      console.error('Direct screenshot analysis error:', error);
      res.status(500).json({
        error: 'Screenshot analysis failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
  
  // Helper function to extract participants from WhatsApp chat
  function extractParticipantsFromWhatsApp(chatText: string): string[] {
    const participants = new Set<string>();
    const lines = chatText.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.length < 10) continue;
      
      // Match different WhatsApp formats:
      // Format 1: "12/31/23, 10:30 PM - Name: message"
      // Format 2: "[12/31/23, 10:30:45 PM] Name: message"
      // Format 3: "10:30 - Name: message"
      
      let nameMatch = null;
      
      // Try format 1: timestamp - name: message
      nameMatch = trimmed.match(/^\d{1,2}\/\d{1,2}\/\d{2,4},?\s+\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM)?\s*-\s*([^:]+):/i);
      
      if (!nameMatch) {
        // Try format 2: [timestamp] name: message
        nameMatch = trimmed.match(/^\[\d{1,2}\/\d{1,2}\/\d{2,4},?\s+\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM)?\]\s*([^:]+):/i);
      }
      
      if (!nameMatch) {
        // Try format 3: time - name: message
        nameMatch = trimmed.match(/^\d{1,2}:\d{2}\s*-\s*([^:]+):/);
      }
      
      if (!nameMatch) {
        // Try simple format: name: message (with validation)
        if (trimmed.includes(':') && !trimmed.startsWith('http') && !trimmed.includes('www.')) {
          const colonIndex = trimmed.indexOf(':');
          const potentialName = trimmed.substring(0, colonIndex).trim();
          
          // Validate it looks like a name
          if (potentialName.length > 0 && potentialName.length < 50 && 
              !potentialName.match(/^\d/) && !potentialName.includes('/')) {
            nameMatch = [trimmed, potentialName];
          }
        }
      }
      
      if (nameMatch && nameMatch[1]) {
        let name = nameMatch[1].trim();
        
        // Clean up the name
        name = name.replace(/[^\w\s\-_.]/g, '').trim();
        
        // Skip if invalid or looks like a timestamp
        if (name.length > 1 && name.length < 50 && !name.match(/^\d+$/) && name !== 'You') {
          participants.add(name);
        }
      }
      
      // Stop once we have enough participants
      if (participants.size >= 10) break;
    }
    
    return Array.from(participants).slice(0, 10);
  }

  // ZIP file extraction route
  // Enhanced ZIP file processing for WhatsApp exports with direct analysis
  app.post('/api/analyze-zip', upload.single('file'), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file provided' });
      }

      const file = req.file;
      console.log('Processing ZIP file for analysis:', file.originalname, 'Size:', file.size, 'bytes');

      // Validate file is a ZIP archive
      if (!file.originalname.toLowerCase().endsWith('.zip') && file.mimetype !== 'application/zip') {
        return res.status(400).json({ 
          error: 'Please upload a valid ZIP file (.zip extension required)' 
        });
      }

      // Extract chat content from ZIP
      const JSZip = await import('jszip');
      const zip = new JSZip.default();
      
      try {
        const zipContents = await zip.loadAsync(file.buffer);
        console.log('ZIP loaded successfully. Files found:', Object.keys(zipContents.files).length);

        // Find WhatsApp chat files (.txt files)
        const chatFiles = Object.keys(zipContents.files).filter(filename => {
          const zipFile = zipContents.files[filename];
          return !zipFile.dir && (
            filename.toLowerCase().endsWith('.txt') ||
            filename.toLowerCase().includes('chat') ||
            filename.toLowerCase().includes('whatsapp')
          );
        });

        if (chatFiles.length === 0) {
          return res.status(400).json({
            error: 'No chat files found in ZIP archive. Please ensure your WhatsApp export contains text files.'
          });
        }

        console.log('Found potential chat files:', chatFiles);

        // Extract and validate chat content
        let extractedChat = '';
        let extractedFileName = '';
        
        for (const filename of chatFiles) {
          try {
            const zipFile = zipContents.files[filename];
            let content = await zipFile.async('text');
            
            // Clean up content
            content = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
            
            // Remove BOM if present
            if (content.charCodeAt(0) === 0xFEFF) {
              content = content.substring(1);
            }

            // Validate WhatsApp format
            if (isValidWhatsAppFormat(content) && content.length > 100) {
              extractedChat = content;
              extractedFileName = filename;
              console.log(`Valid WhatsApp chat found: ${filename} (${content.length} characters)`);
              break;
            }
          } catch (fileError) {
            console.error(`Error extracting file ${filename}:`, fileError);
            continue;
          }
        }

        if (!extractedChat) {
          return res.status(400).json({
            error: 'No valid WhatsApp chat content found in the ZIP file. Please check your export format.'
          });
        }

        // Parse participant names from chat
        const participants = extractParticipantsFromWhatsApp(extractedChat);
        
        if (participants.length < 2) {
          return res.status(400).json({
            error: 'Could not identify at least two participants in the chat. Please ensure the chat contains messages from multiple people.'
          });
        }
        
        const me = participants[0];
        const them = participants[1];
        
        if (!me || !them) {
          return res.status(400).json({
            error: 'Could not identify participants in the chat. Please ensure the chat contains messages from at least two people.'
          });
        }

        // Return extracted content for frontend analysis
        console.log(`ZIP extraction successful: ${extractedFileName} (${extractedChat.length} characters)`);
        console.log(`Participants detected: ${me}, ${them}`);

        res.json({
          success: true,
          extractedFrom: extractedFileName,
          text: extractedChat,
          participants: { me, them },
          chatLength: extractedChat.length,
          messageCount: extractedChat.split('\n').filter(line => 
            line.trim() && (line.includes(' - ') || line.includes(': '))
          ).length
        });

      } catch (zipError) {
        console.error('ZIP processing error:', zipError);
        return res.status(400).json({
          error: 'Failed to process ZIP file. Please ensure it\'s a valid WhatsApp export.',
          details: zipError instanceof Error ? zipError.message : 'Unknown error'
        });
      }

    } catch (error) {
      console.error('ZIP analysis endpoint error:', error);
      res.status(500).json({ 
        error: 'Server error processing ZIP file',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Legacy extraction endpoint for compatibility
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
      
      // Check if file is actually a ZIP by looking at magic bytes
      if (fileBuffer.length < 4 || 
          !(fileBuffer[0] === 0x50 && fileBuffer[1] === 0x4B && 
            (fileBuffer[2] === 0x03 || fileBuffer[2] === 0x05))) {
        console.log('File magic bytes:', fileBuffer.slice(0, 10));
        return res.status(400).json({ 
          error: 'The uploaded file is not a valid ZIP archive. Please ensure you\'re uploading a WhatsApp chat export (.zip file).' 
        });
      }
      
      // Process with JSZip
      const JSZip = await import('jszip');
      const zip = new JSZip.default();
      
      try {
        // Load ZIP content
        const zipContents = await zip.loadAsync(fileBuffer);
        console.log('Files in ZIP:', Object.keys(zipContents.files).length);
        
        // Find and validate .txt files in the ZIP
        let textContent = '';
        let foundTextFile = false;
        let extractedFileName = '';
        
        for (const filename of Object.keys(zipContents.files)) {
          const zipFile = zipContents.files[filename];
          
          console.log('Processing file in ZIP:', filename, zipFile.dir ? '(directory)' : '(file)');
          
          // Skip directories and non-text files
          if (zipFile.dir || !(filename.endsWith('.txt') || filename.includes('_chat'))) continue;
          
          try {
            // Extract the text content with better encoding handling
            let extractedText = '';
            try {
              extractedText = await zipFile.async('text');
            } catch (encodingError) {
              console.log('UTF-8 extraction failed, trying binary approach for:', filename);
              const binaryData = await zipFile.async('uint8array');
              extractedText = new TextDecoder('utf-8', { fatal: false }).decode(binaryData);
            }
            
            // Clean up the content
            extractedText = extractedText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
            if (extractedText.charCodeAt(0) === 0xFEFF) {
              extractedText = extractedText.substring(1); // Remove BOM
            }
            
            // Validate the extracted text content
            if (!extractedText || extractedText.trim().length === 0) {
              console.log('Empty or invalid text file:', filename);
              continue;
            }
            
            // Check if it looks like a WhatsApp chat export
            const isValidWhatsAppChat = isValidWhatsAppFormat(extractedText);
            if (!isValidWhatsAppChat) {
              console.log('Text file does not appear to be a valid WhatsApp chat:', filename);
              continue;
            }
            
            textContent = extractedText;
            foundTextFile = true;
            extractedFileName = filename;
            console.log('Successfully validated text file in ZIP:', filename, 'with', textContent.length, 'characters');
            break;
          } catch (fileErr) {
            console.error('Error extracting file from ZIP:', filename, fileErr);
          }
        }
        
        if (!foundTextFile) {
          return res.status(400).json({ 
            error: 'No valid WhatsApp chat file found in the ZIP archive. Please ensure the export contains a readable chat text file.' 
          });
        }
        
        // Final comprehensive validation before sending
        if (!textContent || textContent.trim().length < 50) {
          return res.status(400).json({ 
            error: 'Extracted chat content is too short or invalid. Please check your WhatsApp export file.' 
          });
        }
        
        // Additional validation: Check for actual conversation content
        // Look for various message patterns in WhatsApp exports
        const messageLines = textContent.split('\n').filter(line => {
          const trimmed = line.trim();
          if (trimmed.length < 10) return false;
          
          // Check for different WhatsApp message formats:
          // Format 1: "12/31/23, 10:30 PM - Name: message"
          // Format 2: "[12/31/23, 10:30:45 PM] Name: message"
          // Format 3: "10:30 - Name: message"
          // Format 4: "Name (12/31/23): message"
          
          return trimmed.includes(':') && (
            /\d{1,2}\/\d{1,2}\/\d{2,4}.*-.*:/.test(trimmed) ||
            /\[\d{1,2}\/\d{1,2}\/\d{2,4}.*\].*:/.test(trimmed) ||
            /\d{1,2}:\d{2}.*-.*:/.test(trimmed) ||
            /.*\(\d{1,2}\/\d{1,2}\/\d{2,4}\):/.test(trimmed) ||
            (trimmed.includes(' - ') && trimmed.includes(':'))
          );
        });
        
        if (messageLines.length < 3) {
          return res.status(400).json({ 
            error: 'The extracted file does not contain enough conversation messages. Please verify this is a valid WhatsApp chat export.' 
          });
        }
        
        // Validate that the extracted content has proper WhatsApp message format
        // Support multiple WhatsApp export formats
        const hasValidTimestamps = messageLines.some(line => 
          /\d{1,2}\/\d{1,2}\/\d{2,4}/.test(line) || 
          /\d{1,2}:\d{2}/.test(line) ||
          /\[\d{1,2}\/\d{1,2}\/\d{2,4}/.test(line) ||
          /\d{4}-\d{2}-\d{2}/.test(line) ||
          /\d{1,2}\/\d{1,2}\/\d{4}, \d{1,2}:\d{2}/.test(line)
        );
        
        // Also check for WhatsApp specific patterns
        const hasWhatsAppPatterns = textContent.includes(' - ') || 
                                   textContent.includes(': ') ||
                                   /\d{1,2}\/\d{1,2}\/\d{2,4},? \d{1,2}:\d{2}/.test(textContent);
        
        if (!hasValidTimestamps && !hasWhatsAppPatterns && messageLines.length < 10) {
          return res.status(400).json({ 
            error: 'The extracted content does not appear to be a valid WhatsApp chat export. Please ensure you are uploading the correct file format.' 
          });
        }
        
        // Check for suspicious extraction artifacts
        const suspiciousPatterns = [
          'corrupted', 'failed to read', 'error reading', 'binary data',
          'null', 'undefined', 'extraction failed', 'parse error'
        ];
        
        const hasSuspiciousContent = suspiciousPatterns.some(pattern => 
          textContent.toLowerCase().includes(pattern)
        );
        
        if (hasSuspiciousContent) {
          return res.status(400).json({ 
            error: 'ZIP extraction failed or produced corrupted data. Please try exporting your chat again and ensure the file is not damaged.' 
          });
        }
        
        console.log(`ZIP extraction successful: ${extractedFileName}, ${textContent.length} chars, ${messageLines.length} message lines`);
        console.log(`First few lines of extracted content:`, textContent.split('\n').slice(0, 3).join(' | '));
        
        res.json({ 
          text: textContent,
          extractedFrom: extractedFileName,
          validated: true,
          messageCount: messageLines.length
        });
      } catch (zipErr) {
        console.error('Error processing ZIP archive:', zipErr);
        return res.status(400).json({ 
          error: 'The file appears to be corrupted or encoded. Please ensure you\'re uploading a valid WhatsApp chat export (.zip file).',
          details: zipErr instanceof Error ? zipErr.message : 'Unknown ZIP processing error'
        });
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
  app.post('/api/create-payment-intent', paymentController.createPaymentIntent);
  
  // Deep Dive credit management
  app.get('/api/user/deep-dive-credits', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      
      const credits = await storage.getUserDeepDiveCredits(userId);
      res.json({ credits });
    } catch (error) {
      console.error('Error fetching Deep Dive credits:', error);
      res.status(500).json({ error: 'Failed to fetch credits' });
    }
  });
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
  
  // Live chat feature announcement email
  app.post('/api/admin/email/chat-announcement', isAuthenticated, isAdmin, async (req: Request, res: Response) => {
    try {
      const { testEmail } = req.body;
      
      // Email content for the live chat feature announcement
      const subject = "🎉 New Feature: Live Chat Support Now Available!";
      const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>New Live Chat Feature</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            margin: 0;
            padding: 0;
            background-color: #f8f9fa;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header {
            background: linear-gradient(135deg, #ec4899, #f472b6);
            color: white;
            padding: 30px 20px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 28px;
            font-weight: 600;
        }
        .content {
            padding: 30px 20px;
        }
        .feature-highlight {
            background-color: #fef7ff;
            border-left: 4px solid #ec4899;
            padding: 20px;
            margin: 20px 0;
            border-radius: 0 8px 8px 0;
        }
        .feature-highlight h3 {
            margin-top: 0;
            color: #ec4899;
            font-size: 20px;
        }
        .cta-button {
            display: inline-block;
            background: linear-gradient(135deg, #ec4899, #f472b6);
            color: white;
            padding: 14px 28px;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 600;
            margin: 20px 0;
            transition: transform 0.2s;
        }
        .cta-button:hover {
            transform: translateY(-2px);
        }
        .benefits {
            display: grid;
            gap: 15px;
            margin: 25px 0;
        }
        .benefit {
            display: flex;
            align-items: flex-start;
            gap: 12px;
        }
        .benefit-icon {
            background-color: #ec4899;
            color: white;
            width: 24px;
            height: 24px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 14px;
            flex-shrink: 0;
            margin-top: 2px;
        }
        .footer {
            background-color: #f8f9fa;
            padding: 20px;
            text-align: center;
            color: #6b7280;
            font-size: 14px;
        }
        .social-links {
            margin: 15px 0;
        }
        .social-links a {
            color: #ec4899;
            text-decoration: none;
            margin: 0 10px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎉 Live Chat Support is Here!</h1>
            <p style="margin: 10px 0 0 0; font-size: 18px; opacity: 0.9;">Get instant help from our team</p>
        </div>
        
        <div class="content">
            <div class="feature-highlight">
                <h3>💬 Introducing Live Chat Support</h3>
                <p>We're excited to announce that you can now chat directly with our support team! No more waiting for email responses - get instant help when you need it most.</p>
            </div>
            
            <h3>✨ What you can use live chat for:</h3>
            <div class="benefits">
                <div class="benefit">
                    <div class="benefit-icon">?</div>
                    <div>
                        <strong>Technical Support</strong><br>
                        Having trouble with chat analysis or features? We're here to help!
                    </div>
                </div>
                <div class="benefit">
                    <div class="benefit-icon">💡</div>
                    <div>
                        <strong>How-to Questions</strong><br>
                        Need guidance on uploading files or understanding your results?
                    </div>
                </div>
                <div class="benefit">
                    <div class="benefit-icon">⚡</div>
                    <div>
                        <strong>Quick Answers</strong><br>
                        Get instant responses about subscriptions, features, and account issues
                    </div>
                </div>
                <div class="benefit">
                    <div class="benefit-icon">🎯</div>
                    <div>
                        <strong>Feature Requests</strong><br>
                        Share your ideas and feedback directly with our team
                    </div>
                </div>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="https://dramallama.ai" class="cta-button" style="color: white;">Start Chatting Now →</a>
            </div>
            
            <div style="background-color: #f0f9ff; padding: 20px; border-radius: 8px; margin: 25px 0;">
                <h4 style="margin-top: 0; color: #0369a1;">📍 How to find live chat:</h4>
                <ol style="margin: 10px 0; padding-left: 20px;">
                    <li>Visit <a href="https://dramallama.ai" style="color: #ec4899;">dramallama.ai</a></li>
                    <li>Look for the chat widget in the bottom-right corner</li>
                    <li>Click to start your conversation with our team</li>
                </ol>
            </div>
            
            <p style="margin-top: 30px;">Our team is available during business hours to help make your Drama Llama experience even better. We're committed to providing you with the support you deserve!</p>
            
            <p><strong>Thank you for being part of the Drama Llama community! 🦙💖</strong></p>
        </div>
        
        <div class="footer">
            <p><strong>Drama Llama AI</strong><br>
            Your AI-powered conversation analysis platform</p>
            
            <div class="social-links">
                <a href="mailto:support@dramallama.ai">support@dramallama.ai</a>
            </div>
            
            <p style="font-size: 12px; margin-top: 15px;">
                This email was sent to inform you about our new live chat feature. 
                If you have any questions, feel free to use our new live chat support!
            </p>
        </div>
    </div>
</body>
</html>`;

      const textContent = `
🎉 Live Chat Support is Now Available!

We're excited to announce that you can now chat directly with our support team at Drama Llama AI!

✨ What you can use live chat for:
• Technical Support - Having trouble with chat analysis or features? We're here to help!
• How-to Questions - Need guidance on uploading files or understanding your results?
• Quick Answers - Get instant responses about subscriptions, features, and account issues
• Feature Requests - Share your ideas and feedback directly with our team

📍 How to find live chat:
1. Visit dramallama.ai
2. Look for the chat widget in the bottom-right corner
3. Click to start your conversation with our team

Our team is available during business hours to help make your Drama Llama experience even better. We're committed to providing you with the support you deserve!

Thank you for being part of the Drama Llama community! 🦙💖

---
Drama Llama AI
Your AI-powered conversation analysis platform
support@dramallama.ai
`;

      if (testEmail) {
        // Send test email using Resend
        const { Resend } = await import('resend');
        const resend = new Resend(process.env.RESEND_API_KEY);
        
        const emailData = {
          from: 'support@dramallama.ai',
          to: testEmail,
          subject: subject,
          text: textContent,
          html: htmlContent,
        };
        
        const emailResult = await resend.emails.send(emailData);
        
        return res.json({
          success: true,
          message: `Test email sent successfully to ${testEmail}`,
          emailResult
        });
      } else {
        // Send to all users
        const users = await storage.getAllUsers();
        const emailAddresses = users
          .filter((user: any) => user.email && user.emailVerified)
          .map((user: any) => user.email);
        
        if (emailAddresses.length === 0) {
          return res.status(400).json({ error: 'No verified email addresses found' });
        }
        
        // Send bulk emails using Resend
        const { Resend } = await import('resend');
        const resend = new Resend(process.env.RESEND_API_KEY);
        
        const emailPromises = emailAddresses.map(email => {
          return resend.emails.send({
            from: 'support@dramallama.ai',
            to: email,
            subject: subject,
            text: textContent,
            html: htmlContent,
          });
        });
        
        const emailResult = await Promise.allSettled(emailPromises);
        
        return res.json({
          success: true,
          message: `Live chat announcement sent to ${emailAddresses.length} users`,
          emailResult
        });
      }
      
    } catch (error) {
      console.error('Error sending live chat announcement:', error);
      res.status(500).json({ 
        error: 'Failed to send live chat announcement',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
  
  // Promo code management - commented out for now until admin controller is fully implemented
  // Will be implemented in the admin controller
  
  // Public promo code routes
  app.get('/api/promo-codes/active', isAuthenticated, isAdmin, promoCodeController.getAllActive);
  app.post('/api/promo-codes/redeem', promoCodeController.redeemCode);
  
  // Admin promo code routes
  app.get('/api/admin/promo-codes', isAuthenticated, isAdmin, adminPromoCodeController.getAllPromoCodes);
  app.post('/api/admin/promo-codes', isAuthenticated, isAdmin, adminPromoCodeController.createPromoCode);
  app.put('/api/admin/promo-codes/:id', isAuthenticated, isAdmin, adminPromoCodeController.updatePromoCode);
  
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
  
  // Referral code routes
  app.post('/api/admin/referral-codes', isAuthenticated, isAdmin, referralCodeController.createReferralCode);
  app.get('/api/admin/referral-codes', isAuthenticated, isAdmin, referralCodeController.getAllReferralCodes);
  app.get('/api/admin/referral-codes/stats/:id?', isAuthenticated, isAdmin, referralCodeController.getReferralStats);
  app.put('/api/admin/referral-codes/:id', isAuthenticated, isAdmin, referralCodeController.updateReferralCode);
  app.get('/api/referral-codes/validate/:code', referralCodeController.validateReferralCode);
  
  // Serve static files from attached_assets directory
  app.use('/attached_assets', express.static('attached_assets'));
  
  // Create HTTP server
  const httpServer = createServer(app);

  // Add WebSocket server for live chat
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  // Store connected clients
  const connectedClients = new Map<WebSocket, { isAdmin: boolean; userName: string; }>();
  
  wss.on('connection', (ws) => {
    console.log('New WebSocket connection established');
    
    // Initialize client data
    connectedClients.set(ws, { isAdmin: false, userName: 'Anonymous' });
    
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        console.log('Received WebSocket message:', message.type);
        
        if (message.type === 'user_connected') {
          // Update user info
          const clientData = connectedClients.get(ws);
          if (clientData) {
            clientData.userName = message.userName || 'Anonymous';
            connectedClients.set(ws, clientData);
          }
          
          // Notify admin about new user connection
          const adminMessage = {
            type: 'chat_message',
            id: Date.now().toString(),
            message: `${message.userName || 'Anonymous User'} connected to live chat`,
            timestamp: new Date().toISOString(),
            isUser: false,
            isAdmin: true
          };
          
          // Send notification to admin clients only
          connectedClients.forEach((clientData, client) => {
            if (client !== ws && client.readyState === WebSocket.OPEN && clientData.isAdmin) {
              client.send(JSON.stringify(adminMessage));
            }
          });
          
        } else if (message.type === 'chat_message') {
          // Broadcast message to all connected clients
          const broadcastMessage = {
            type: 'chat_message',
            id: message.id,
            message: message.message,
            timestamp: message.timestamp,
            isUser: message.isUser,
            isAdmin: message.isAdmin || false,
            userName: message.userName
          };
          
          console.log(`Broadcasting chat message from ${message.userName}: ${message.message}`);
          
          // Send to all connected clients except sender
          connectedClients.forEach((clientData, client) => {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify(broadcastMessage));
            }
          });
          
          // Send email notification for user messages (not admin messages)
          if (message.isUser && !message.isAdmin) {
            sendChatNotification({
              userName: message.userName || 'Anonymous User',
              userEmail: message.userEmail,
              message: message.message,
              timestamp: new Date(message.timestamp)
            }).catch(error => {
              console.error('Failed to send chat notification email:', error);
            });
          }
          
          // Log message for admin notification purposes
          console.log(`Live chat message: [${message.userName}] ${message.message}`);
          
        } else if (message.type === 'admin_login') {
          // Mark this connection as admin
          const clientData = connectedClients.get(ws);
          if (clientData) {
            clientData.isAdmin = true;
            clientData.userName = 'Admin';
            connectedClients.set(ws, clientData);
            console.log('Admin connected to live chat');
          }
        } else if (message.type === 'end_conversation') {
          // Handle conversation ending - clean up server-side data
          console.log(`Admin ended conversation: ${message.conversationId}`);
          
          // Notify all clients that this conversation has ended
          const endMessage = {
            type: 'conversation_ended',
            conversationId: message.conversationId,
            timestamp: message.timestamp
          };
          
          connectedClients.forEach((clientData, client) => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify(endMessage));
            }
          });
        }
        
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
      }
    });
    
    ws.on('close', () => {
      console.log('WebSocket connection closed');
      connectedClients.delete(ws);
    });
    
    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      connectedClients.delete(ws);
    });
  });
  
  console.log('WebSocket server initialized on /ws path');

  return httpServer;
}
