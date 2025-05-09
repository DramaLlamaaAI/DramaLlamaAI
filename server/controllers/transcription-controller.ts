import { Request, Response } from "express";
import OpenAI from "openai";
import multer from "multer";
import * as fs from 'fs';
import * as path from 'path';
import Anthropic from '@anthropic-ai/sdk';

// Create OpenAI instance
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  organization: process.env.OPENAI_ORG_ID, // Support for organization ID if provided
  // Project API keys use the standard OpenAI API URL
});

// Create Anthropic instance for fallback
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Configure multer for file uploads (store in memory)
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB limit
  fileFilter: (req, file, cb) => {
    // Accept common audio formats to ensure compatibility
    const acceptedTypes = ['audio/webm', 'audio/mp4', 'audio/mpeg', 'audio/wav', 'audio/ogg', 'video/webm'];
    if (acceptedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(null, false);
      console.warn(`Rejected file with mime type: ${file.mimetype}`);
    }
  }
});

export const transcriptionUpload = upload.single('audio');

export const transcribeAudio = async (req: Request, res: Response) => {
  // Create a temporary file path for the audio
  let tempFilePath = '';
  
  try {
    // Check if file exists
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file provided' });
    }

    // Create a temporary file path to save the audio
    const tempDir = path.join(process.cwd(), 'tmp');
    
    // Ensure temp directory exists
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    // Determine the appropriate file extension based on MIME type
    let fileExtension = 'webm';
    const mimeType = req.file.mimetype || '';
    
    if (mimeType.includes('mp4') || mimeType.includes('mp3') || mimeType.includes('mpeg')) {
      fileExtension = 'mp3';
    } else if (mimeType.includes('wav')) {
      fileExtension = 'wav';
    } else if (mimeType.includes('ogg')) {
      fileExtension = 'ogg';
    }
    
    tempFilePath = path.join(tempDir, `recording-${Date.now()}.${fileExtension}`);
    
    // Write buffer to temporary file
    fs.writeFileSync(tempFilePath, req.file.buffer);
    
    console.log(`Processing audio file: ${req.file.originalname}, size: ${req.file.size} bytes, mimetype: ${req.file.mimetype}`);
    
    // Define proper type for context info
    interface ContextInfo {
      isConversation?: boolean;
      speakerCount?: number;
      speakerLabels?: string[];
    }
    
    // Get context information if provided
    let contextInfo: ContextInfo = {};
    let speakerPrompt = "This is a conversation between two people discussing personal matters or relationships.";
    
    if (req.body.context) {
      try {
        const parsedContext = JSON.parse(req.body.context);
        contextInfo = parsedContext as ContextInfo;
        
        if (contextInfo.speakerLabels && contextInfo.speakerLabels.length >= 2) {
          speakerPrompt = `This is a conversation between ${contextInfo.speakerLabels[0]} and ${contextInfo.speakerLabels[1]}.`;
        }
      } catch (e) {
        console.warn("Could not parse context info:", e);
      }
    }
    
    // Enhanced prompt for better accuracy
    const enhancedPrompt = `${speakerPrompt} The conversation might include emotional language, questions and responses, agreements or disagreements. Common words may include: relationship, feeling, communication, upset, understand, listening, sorry, think, believe, want, need.`;
    
    // Make sure file exists and is readable before sending to API
    if (!fs.existsSync(tempFilePath)) {
      throw new Error("Failed to save temporary audio file for processing");
    }
    
    // Try OpenAI transcription first 
    try {
      // Log the details before sending to OpenAI
      console.log(`Sending file to OpenAI: ${tempFilePath}`);
      
      // Log API key prefix for debugging (safe to log just the prefix)
      const apiKeyPrefix = process.env.OPENAI_API_KEY?.substring(0, 10) + '...';
      console.log(`Using OpenAI API key with prefix: ${apiKeyPrefix}`);
      
      // Call OpenAI's transcription API with enhanced parameters
      const transcription = await openai.audio.transcriptions.create({
        file: fs.createReadStream(tempFilePath),
        model: "whisper-1", // Using the best available Whisper model
        language: "en", 
        response_format: "verbose_json", // Get more detailed results
        temperature: 0.0,  // Lower temperature for more accurate transcription
        prompt: enhancedPrompt,
      });
      
      console.log("OpenAI transcription successful");
      
      // Post-process the transcript to improve quality
      let processedText = transcription.text;
      
      // Apply basic noise filtering to remove common transcription artifacts
      processedText = processedText
        .replace(/(\s|^)(um|uh|er|ah|like,)(\s|$)/gi, ' ')
        .replace(/\s{2,}/g, ' ')
        .trim();
      
      // Clean up the temporary file
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }
      
      // Return the processed transcript
      return res.status(200).json({ 
        transcript: processedText,
        success: true,
        provider: "openai"
      });
    } catch (openaiError) {
      console.warn("OpenAI transcription failed:", openaiError);
      console.log("Falling back to text-based transcription method...");
      
      // Clean up the temporary file since we'll take a different approach
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }
      
      // Unable to process audio directly, return helpful error
      return res.status(500).json({ 
        error: 'Transcription service currently unavailable', 
        details: "The audio transcription service is experiencing issues. Please try again later."
      });
    }
  } catch (error: any) {
    // Clean up any temporary files
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }
    
    console.error("Error during transcription:", error);
    return res.status(500).json({ 
      error: 'Server error during transcription', 
      details: error.message 
    });
  }
};