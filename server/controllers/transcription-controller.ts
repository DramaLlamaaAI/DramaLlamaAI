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
    
    // Try using OpenAI Whisper API for audio transcription
    try {
      console.log("Using OpenAI Whisper for audio transcription");
      
      // Check if OpenAI API key is available
      if (!process.env.OPENAI_API_KEY) {
        throw new Error("OpenAI API key is not available");
      }
      
      // Create a readable stream from the temp file
      const audioReadStream = fs.createReadStream(tempFilePath);
      
      // Use OpenAI's transcription API (Whisper)
      const transcription = await openai.audio.transcriptions.create({
        file: audioReadStream,
        model: "whisper-1",
        language: "en", // Assuming English is the primary language
        prompt: enhancedPrompt
      });
      
      // Process the transcription result
      const processedText = transcription.text
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
        provider: "openai-whisper"
      });
      
    } catch (openaiError) {
      console.error("OpenAI Whisper transcription error:", openaiError);
      
      // Fall back to a simple Claude text response if OpenAI fails
      try {
        console.log("Falling back to Claude for text-only response");
        
        const claudeResponse = await anthropic.messages.create({
          model: "claude-3-7-sonnet-20250219",
          max_tokens: 1024,
          messages: [
            {
              role: "user",
              content: "I attempted to record audio for transcription, but the service encountered an error. Please provide a friendly, helpful message explaining that there was an issue with the audio transcription service and suggesting I try again."
            }
          ]
        });
        
        // Extract the message from Claude
        let claudeMessage = "There was an issue transcribing your audio. Please try again with a clearer recording.";
        for (const content of claudeResponse.content) {
          if (content.type === 'text') {
            claudeMessage = content.text
              .replace(/^I'm sorry to hear that/i, "")
              .replace(/^I apologize/i, "")
              .replace(/Claude/g, "Drama Llama")
              .trim();
            break;
          }
        }
        
        // Clean up the temporary file
        if (fs.existsSync(tempFilePath)) {
          fs.unlinkSync(tempFilePath);
        }
        
        return res.status(200).json({
          transcript: claudeMessage,
          success: false,
          provider: "claude-text"
        });
      } catch (claudeError) {
        console.error("Claude fallback error:", claudeError);
        
        // Clean up the temporary file
        if (fs.existsSync(tempFilePath)) {
          fs.unlinkSync(tempFilePath);
        }
        
        // If all else fails, return a generic error message
        return res.status(500).json({ 
          error: 'Transcription service error', 
          details: "We're having trouble with our transcription service. Please try again later."
        });
      }
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