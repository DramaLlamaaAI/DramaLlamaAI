import { Request, Response } from 'express';
import { analyzeChatConversation, analyzeMessage, deEscalateMessage, detectParticipants, processImageOcr } from '../services/anthropic-updated';
import { TIER_LIMITS } from '@shared/schema';
import { filterChatAnalysisByTier, filterMessageAnalysisByTier, filterDeEscalateResultByTier } from '../services/tier-service';
import { storage } from '../storage';
import { extractRedFlagsCount } from '../services/anthropic-helpers';
import { enhanceAnalysisWithQuotes } from '../services/analysis-enhancer';

// Get the user's tier from the authenticated session
const getUserTier = (req: Request): string => {
  // Regular authentication flow
  if (req.session && req.session.userId) {
    // For authenticated users, we'll get their tier from storage
    // But we'll return 'free' if we're unable to find it
    return req.session.userTier || 'free';
  } else {
    // For anonymous users
    return 'free';
  }
};

// Track a user's analysis usage
const trackUsage = async (req: Request): Promise<void> => {
  try {
    if (req.session && req.session.userId) {
      // Track usage for authenticated users
      await storage.incrementUserUsage(req.session.userId);
    } else if (req.body.deviceId) {
      // Track usage for anonymous users
      await storage.incrementAnonymousUsage(req.body.deviceId);
    }
    console.log('Usage tracked successfully');
  } catch (error) {
    console.error('Error tracking usage:', error);
  }
};

// Check if user has reached their usage limit
const checkUsageLimit = async (req: Request): Promise<boolean> => {
  try {
    if (req.session && req.session.userId) {
      // Check usage limits for authenticated users
      const usage = await storage.getUserUsage(req.session.userId);
      
      // If limit is null or undefined, user has unlimited usage (admin or pro tier)
      if (usage.limit === null || usage.limit === undefined || usage.limit === Infinity) {
        return true; // No limit for admin/pro users
      }
      
      // For users with limits, check if they've reached their limit
      return usage.used < usage.limit;
    } else if (req.body.deviceId) {
      // Check usage limits for anonymous users
      const anonUsage = await storage.getAnonymousUsage(req.body.deviceId);
      if (!anonUsage) return true; // First time user
      
      // Anonymous users get 2 free analyses per month
      return anonUsage.count < 2;
    }
    return true; // Allow access if we can't determine usage
  } catch (error) {
    console.error('Error checking usage limit:', error);
    return false; // Fail closed - if we can't check, don't allow
  }
};

// Filter conversation by date if date filter is provided
const filterConversationByDate = (conversation: string, dateFilter?: { fromDate?: string; toDate?: string }): string => {
  if (!dateFilter || (!dateFilter.fromDate && !dateFilter.toDate)) {
    return conversation;
  }
  
  // This regex matches common date/time formats in chat exports (especially WhatsApp)
  // Format examples: "1/2/23, 3:45 PM", "2023-01-02 15:45", "[02/01/2023, 15:45:21]", etc.
  const dateRegex = /(?:\[?\s*(\d{1,4}[-/\.]\d{1,2}[-/\.]\d{1,4})[,\s]+(\d{1,2}:\d{1,2}(?::\d{1,2})?(?:\s*[AP]M)?)\s*\]?)|((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{4},?\s+\d{1,2}:\d{1,2}(?::\d{1,2})?(?:\s*[AP]M)?)/i;
  
  const fromDate = dateFilter.fromDate ? new Date(dateFilter.fromDate) : null;
  const toDate = dateFilter.toDate ? new Date(dateFilter.toDate) : null;
  
  // Split the conversation into lines and filter by date
  const lines = conversation.split('\n');
  const filteredLines = lines.filter(line => {
    // Try to extract date from line
    const match = line.match(dateRegex);
    if (!match) return true; // If no date found, include the line
    
    let messageDate: Date | null = null;
    
    // Handle different date formats
    if (match[1] && match[2]) {
      // Format: 1/2/23, 3:45 PM or 2023-01-02 15:45
      const datePart = match[1];
      const timePart = match[2];
      
      // Try to parse the date, handling different separators (/, -, .)
      const parts = datePart.split(/[-/.]/);
      if (parts.length === 3) {
        // Determine if year is first (YYYY-MM-DD) or last (MM/DD/YYYY or DD/MM/YYYY)
        const isYearFirst = parts[0].length === 4;
        const year = isYearFirst ? parts[0] : parts[2];
        const month = isYearFirst ? parts[1] : parts[0];
        const day = isYearFirst ? parts[2] : parts[1];
        
        // Convert to full year if needed (23 -> 2023)
        const fullYear = year.length === 2 ? `20${year}` : year;
        
        // Create date string in a standardized format
        const dateString = `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T${timePart.replace(/\s*([AP]M)$/i, '')}`;
        messageDate = new Date(dateString);
      }
    } else if (match[3]) {
      // Format: Month Day, Year HH:MM (e.g., "January 2, 2023 3:45 PM")
      messageDate = new Date(match[3]);
    }
    
    // If we couldn't parse the date, include the line
    if (!messageDate || isNaN(messageDate.getTime())) return true;
    
    // Filter based on date range
    if (fromDate && messageDate < fromDate) return false;
    if (toDate && messageDate > toDate) return false;
    
    return true;
  });
  
  // If no messages matched our date filter, return the original conversation
  if (filteredLines.length === 0 || (filteredLines.length === 1 && filteredLines[0].trim() === '')) {
    console.log('No messages matched the date filter, using original conversation');
    return conversation;
  }
  
  return filteredLines.join('\n');
};

export const analysisController = {
  // Analyze chat conversation
  analyzeChat: async (req: Request, res: Response) => {
    try {
      const { conversation, me, them, dateFilter } = req.body;
      
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
      console.log(`CHAT ANALYSIS USING TIER: ${tier}`);
      console.log(`DevMode header: ${req.headers['x-dev-mode']}, DevTier header: ${req.headers['x-dev-tier']}`);
      
      // Track usage
      await trackUsage(req);
      
      // Filter conversation by date if date filter is provided
      const filteredConversation = filterConversationByDate(conversation, dateFilter);
      
      let filteredResults: any;
      
      try {
        console.log(`Using tier ${tier} for chat analysis request`);
        
        // For free tier, we need to detect red flags
        // To do this properly, we'll run both a free tier analysis AND a personal tier analysis
        let analysis;
        let personalAnalysis = null;
        
        if (tier === 'free') {
          console.log('Running additional personal tier analysis to detect red flags for free tier');
          
          // First get the free tier analysis
          analysis = await analyzeChatConversation(filteredConversation, me, them, 'free');
          
          // Then get a personal tier analysis to extract red flags count
          // This is critical for data integrity - we need the actual red flags count
          try {
            console.log('Running dedicated personal tier analysis to get accurate red flags count');
            // Make sure we use a clean request for the personal tier analysis
            personalAnalysis = await analyzeChatConversation(filteredConversation, me, them, 'personal');
            console.log('Successfully ran personal tier analysis for red flags detection');
            
            // Verify that we got red flags data
            if (personalAnalysis && personalAnalysis.redFlags) {
              console.log(`Found ${personalAnalysis.redFlags.length} red flags in personal tier analysis`);
            } else {
              console.log('No red flags found in personal tier analysis');
            }
          } catch (personalError) {
            console.error('Failed to run personal analysis for red flags:', personalError);
          }
        } else {
          // Regular analysis for other tiers
          analysis = await analyzeChatConversation(filteredConversation, me, them, tier);
        }
        
        console.log(`Chat analysis complete, applying tier filter: ${tier}`);
        // Filter results based on user's tier
        filteredResults = filterChatAnalysisByTier(analysis, tier);
        
        // For Pro tier, enhance red flags with conversation-specific insights
        if (tier === 'pro' || tier === 'instant') {
          // Pass the entire conversation text to help with context-specific analysis
          const conversationText = req.body.text || '';
          
          // Apply enhanced red flag detection with conversation-specific insights
          filteredResults = enhanceAnalysisWithQuotes(filteredResults);
          
          console.log('Enhanced Pro tier analysis with conversation-specific red flag insights');
        }
        
        // For free tier, add red flag types from personal analysis
        if (tier === 'free') {
          console.log('Has redFlags in raw analysis:', !!personalAnalysis?.redFlags);
          
          if (personalAnalysis?.redFlags && personalAnalysis.redFlags.length > 0) {
            // Get unique red flag types using a simple filter approach
            const redFlagTypes = personalAnalysis.redFlags
              .map(flag => flag.type)
              .filter((value, index, self) => self.indexOf(value) === index);
            
            console.log(`Raw red flags count: ${personalAnalysis.redFlags.length}`);
            console.log(`Unique red flag types: ${redFlagTypes.length}`);
            console.log('Adding basic red flag types to free tier analysis');
            
            // Add the list of red flag types and set redFlagsDetected flag to the free tier results
            (filteredResults as any).redFlagTypes = redFlagTypes;
            (filteredResults as any).redFlagsDetected = true;
            
            // Add sample quotes from the personal analysis to show examples (limited for free tier)
            const sampleQuotes = [];
            
            // Extract quotes from different possible sources in the red flags
            for (const flag of personalAnalysis.redFlags) {
              // Case 1: Flag has examples array
              if (flag.examples && flag.examples.length > 0) {
                sampleQuotes.push({
                  type: flag.type,
                  quote: flag.examples[0].text,
                  participant: flag.examples[0].from || flag.participant || 'Unknown'
                });
              } 
              // Case 2: Try to get a quote from the description
              else if (flag.description && flag.description.includes('"')) {
                const quoteMatch = flag.description.match(/"([^"]*)"/);
                if (quoteMatch && quoteMatch[1]) {
                  sampleQuotes.push({
                    type: flag.type,
                    quote: quoteMatch[1],
                    participant: flag.participant || 'Unknown'
                  });
                }
              }
              
              // Limit to 2 sample quotes
              if (sampleQuotes.length >= 2) break;
            }
              
            if (sampleQuotes.length > 0) {
              (filteredResults as any).sampleQuotes = sampleQuotes;
            }
          } else {
            // Fallback to health score when no personal analysis is available
            console.log('No red flags in personal analysis, using fallback logic');
            
            const defaultRedFlagTypes = [];
            
            if (analysis.healthScore) {
              // For very low health scores, add potential red flags
              if (analysis.healthScore.score < 40) {
                defaultRedFlagTypes.push('communication issues', 'potential conflict');
              }
              // For moderately low health scores
              else if (analysis.healthScore.score < 60) {
                defaultRedFlagTypes.push('communication issues');
              }
            }
            
            if (defaultRedFlagTypes.length > 0) {
              console.log('Setting default red flag types based on health score');
              (filteredResults as any).redFlagTypes = defaultRedFlagTypes;
              (filteredResults as any).redFlagsDetected = true;
            } else {
              (filteredResults as any).redFlagsDetected = false;
            }
          }
        }
        
        // Log some info about what we're returning
        console.log(`Returning chat analysis with overall tone: "${filteredResults.toneAnalysis.overallTone.substring(0, 30)}..."`);
        console.log('Has redFlagsCount in results:', 'redFlagsCount' in filteredResults);
        console.log('Filtered results structure:', Object.keys(filteredResults));
      } catch (analysisError) {
        console.error('Error in analysis controller layer:', analysisError);
        
        // Instead of fallback data, return a proper error response
        return res.status(422).json({
          error: "We couldn't analyze your conversation. Please try submitting again with a clearer conversation format. If the problem persists, please contact support via Facebook."
        });
      }
      
      res.json(filteredResults);
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
      const analysis = await analyzeMessage(message, author, tier);
      
      // Filter results based on user's tier
      const filteredResults = filterMessageAnalysisByTier(analysis, tier);
      
      res.json(filteredResults);
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ message: error.message || 'Internal server error' });
    }
  },
  
  // De-escalate mode - rewrite emotional message
  deEscalateMessage: async (req: Request, res: Response) => {
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
      
      // Get user tier
      const tier = getUserTier(req);
      
      // Track usage
      await trackUsage(req);
      
      // Process de-escalation with tier-specific features
      const result = await deEscalateMessage(message, tier);
      
      // Filter results based on user tier
      const filteredResult = filterDeEscalateResultByTier(result, tier);
      res.json(filteredResult);
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
      
      // Process OCR using Anthropic
      const text = await processImageOcr(image);
      res.json({ text });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ message: error.message || 'Failed to process image' });
    }
  }
};
