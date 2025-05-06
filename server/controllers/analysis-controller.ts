import { Request, Response } from 'express';
import { analyzeChatConversation, analyzeMessage, ventMessage, detectParticipants } from '../services/openai-service';
import { processImage } from '../services/ocr-service';
import { TIER_LIMITS } from '@shared/schema';

// For mock demo purposes - in real app this would use auth and database
const getUserTier = (req: Request): string => {
  // This would typically use session/token to get user info
  return 'free';
};

// Track a user's analysis usage - in real app this would update database
const trackUsage = async (req: Request): Promise<void> => {
  // This would increment usage count in database
  console.log('Usage tracked');
};

// Check if user has reached their usage limit
const checkUsageLimit = async (req: Request): Promise<boolean> => {
  // This would check against database
  // For demo, we'll assume they haven't reached limit
  return true;
};

export const analysisController = {
  // Analyze chat conversation
  analyzeChat: async (req: Request, res: Response) => {
    try {
      const { conversation, me, them } = req.body;
      
      if (!conversation || !me || !them) {
        return res.status(400).json({ message: 'Missing required parameters' });
      }
      
      // Check if user has reached usage limit
      const canUseFeature = await checkUsageLimit(req);
      if (!canUseFeature) {
        return res.status(403).json({ message: 'Usage limit reached' });
      }
      
      // Get user tier
      const tier = getUserTier(req);
      
      // Track usage
      await trackUsage(req);
      
      // Process analysis
      const result = await analyzeChatConversation(conversation, me, them, tier);
      res.json(result);
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ message: error.message || 'Internal server error' });
    }
  },
  
  // Analyze single message
  analyzeMessage: async (req: Request, res: Response) => {
    try {
      const { message, author } = req.body;
      
      if (!message || !author) {
        return res.status(400).json({ message: 'Missing required parameters' });
      }
      
      // Check if user has reached usage limit
      const canUseFeature = await checkUsageLimit(req);
      if (!canUseFeature) {
        return res.status(403).json({ message: 'Usage limit reached' });
      }
      
      // Get user tier
      const tier = getUserTier(req);
      
      // Track usage
      await trackUsage(req);
      
      // Process analysis
      const result = await analyzeMessage(message, author, tier);
      res.json(result);
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ message: error.message || 'Internal server error' });
    }
  },
  
  // Vent mode - rewrite emotional message
  ventMessage: async (req: Request, res: Response) => {
    try {
      const { message } = req.body;
      
      if (!message) {
        return res.status(400).json({ message: 'Missing required parameters' });
      }
      
      // Check if user has reached usage limit
      const canUseFeature = await checkUsageLimit(req);
      if (!canUseFeature) {
        return res.status(403).json({ message: 'Usage limit reached' });
      }
      
      // Track usage
      await trackUsage(req);
      
      // Process vent
      const result = await ventMessage(message);
      res.json(result);
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ message: error.message || 'Internal server error' });
    }
  },
  
  // Detect participant names
  detectNames: async (req: Request, res: Response) => {
    try {
      const { conversation } = req.body;
      
      if (!conversation) {
        return res.status(400).json({ message: 'Missing required parameters' });
      }
      
      // Process name detection
      const result = await detectParticipants(conversation);
      res.json(result);
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ message: error.message || 'Internal server error' });
    }
  },
  
  // Process OCR on uploaded image
  processOcr: async (req: Request, res: Response) => {
    try {
      const { image } = req.body;
      
      if (!image) {
        return res.status(400).json({ message: 'Missing image data' });
      }
      
      // Process OCR
      const text = await processImage(image);
      res.json({ text });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ message: error.message || 'Failed to process image' });
    }
  }
};
