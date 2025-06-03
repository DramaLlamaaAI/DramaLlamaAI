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
import { adminPromoCodeController } from "./controllers/admin-promo-code-controller";
import { referralCodeController } from "./controllers/referral-code-controller";
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
  
  app.post('/api/chat/import', chatUpload.array('file', 5), analysisController.importChatFiles);
  
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
