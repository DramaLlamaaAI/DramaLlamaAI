import { Request, Response } from "express";
import multer from "multer";
import * as fs from 'fs';
import * as path from 'path';
import Anthropic from '@anthropic-ai/sdk';

// Create Anthropic instance
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
    
    // Try using Anthropic's Claude for transcription (text-based)
    try {
      console.log("Using Anthropic Claude for audio transcription");
      
      // Check if Anthropic API key is available
      if (!process.env.ANTHROPIC_API_KEY) {
        throw new Error("Anthropic API key is not available");
      }
      
      // For Claude, we'll convert the audio content to base64
      const audioBuffer = fs.readFileSync(tempFilePath);
      const base64Audio = audioBuffer.toString('base64');
      
      // Get file extension for mime type
      const fileExtension = path.extname(tempFilePath).substring(1);
      const mimeType = req.file?.mimetype || `audio/${fileExtension}`;
      
      // Create a prompt that describes the audio file
      const userMessageContent = [
        {
          type: "text",
          text: `I've recorded some audio for transcription. This is a conversation that I'd like you to transcribe accurately. ${enhancedPrompt} Please listen to the audio and type out the exact words spoken. Don't add any commentary - just provide the pure transcription in plain text format. If there are multiple speakers, please prefix each new speaker with their name followed by a colon. For example: "Speaker 1: Hello" and then "Speaker 2: Hi there".`
        }
      ];
      
      // If we have actual audio, add it to the message
      if (base64Audio) {
        userMessageContent.push({
          type: "image",
          source: {
            type: "base64",
            media_type: mimeType,
            data: base64Audio
          }
        });
      }
      
      // Now create the Claude message with the audio content
      const claudeResponse = await anthropic.messages.create({
        model: "claude-3-7-sonnet-20250219",
        max_tokens: 4096,
        messages: [
          {
            role: "user",
            content: userMessageContent
          }
        ]
      });
      
      // Extract the transcription from Claude
      let transcribedText = "No transcription was provided.";
      for (const content of claudeResponse.content) {
        if (content.type === 'text') {
          transcribedText = content.text
            .replace(/^(Here is the transcription of the audio:|The transcription of the audio is as follows:|Transcription:|Here's the transcription:)/i, "")
            .replace(/```.*?```/gs, match => match.replace(/```/g, "").trim())
            .trim();
          break;
        }
      }
      
      console.log("Transcription completed using claude-text service");
      
      // Clean up the temporary file
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }
      
      // Return the processed transcript
      return res.status(200).json({ 
        transcript: transcribedText,
        success: true,
        provider: "claude-text"
      });
      
    } catch (claudeError) {
      console.error("Claude transcription error:", claudeError);
      
      // Clean up the temporary file
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }
      
      // If Claude fails, try a fallback response
      try {
        console.log("Generating fallback response with Claude");
        
        const fallbackResponse = await anthropic.messages.create({
          model: "claude-3-7-sonnet-20250219",
          max_tokens: 1024,
          messages: [
            {
              role: "user",
              content: "I attempted to record audio for transcription in my app called Drama Llama, but the service encountered an error. Please provide a friendly, helpful message explaining that there was an issue with the audio transcription service and suggesting I try again with a clearer recording or by uploading a file instead."
            }
          ]
        });
        
        // Extract the message from Claude
        let fallbackMessage = "There was an issue transcribing your audio. Please try again with a clearer recording or upload an audio file instead.";
        for (const content of fallbackResponse.content) {
          if (content.type === 'text') {
            fallbackMessage = content.text
              .replace(/^I'm sorry to hear that/i, "")
              .replace(/^I apologize/i, "")
              .replace(/Claude/g, "Drama Llama")
              .trim();
            break;
          }
        }
        
        return res.status(200).json({
          transcript: fallbackMessage,
          success: false,
          provider: "claude-fallback"
        });
      } catch (fallbackError) {
        console.error("Fallback response error:", fallbackError);
        
        // If all else fails, return a generic error message
        return res.status(500).json({ 
          error: 'Transcription service error', 
          details: "We're having trouble with our transcription service. Please try again later or upload an audio file instead."
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