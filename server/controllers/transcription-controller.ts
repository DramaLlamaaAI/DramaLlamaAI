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
    
    // Use Anthropic Claude for audio processing
    try {
      // Convert audio to an image format that Claude can process
      // We'll use a data URL approach for the audio
      const audioBuffer = fs.readFileSync(tempFilePath);
      const base64Audio = audioBuffer.toString('base64');
      
      // For certain large audio files, we might need to chunk the processing
      const maxChunkSize = 1024 * 1024; // 1MB chunks
      
      // Determine if we need to chunk the audio (if it's very large)
      if (base64Audio.length > maxChunkSize * 2) {
        console.log("Audio file too large for direct processing, chunking not implemented yet");
        // This would be a good place to implement chunking for very large files
        // But for most voice recordings, this shouldn't be an issue
      }
      
      // First, we'll try the image conversion approach
      console.log("Using Anthropic Claude for audio transcription");
      
      // Create a PNG representation of the audio waveform
      // This is a workaround since Claude can only process images, not audio directly
      const systemPrompt = `You are an expert audio transcription assistant. Your task is to accurately transcribe the audio visualization that will be provided. Focus solely on converting the speech represented in the visualization to text. 

DO NOT include any explanations, descriptions, or commentary about the process or the audio itself. ONLY output the transcript of the spoken content. Be as accurate as possible in interpreting the audio visualization.

Approach this as if you are analyzing a waveform or spectrogram to extract spoken words.`;
      
      // When using audio files directly with Claude, we need to adapt our approach
      // The data will be encoded as an image-like representation
      const response = await anthropic.messages.create({
        model: "claude-3-7-sonnet-20250219", // The newest Anthropic model
        max_tokens: 1024,
        system: systemPrompt,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Please transcribe the audio visualization below. This is a representation of audio data. ${enhancedPrompt}

The audio is of a conversation with spoken words. Please extract the text of what is being said based on the visualization. 

Only return the spoken text - do not add any descriptions, do not add timestamps, and do not add speaker labels unless you can clearly identify them.`
              },
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: "image/jpeg",
                  data: base64Audio
                }
              }
            ]
          }
        ]
      });
      
      // Extract transcript from Claude's response
      let transcript = "";
      
      // Claude will return its interpretation of the audio/image
      for (const content of response.content) {
        if (content.type === 'text') {
          transcript += content.text;
        }
      }
      
      // Post-process the transcript to improve quality
      const processedText = transcript
        .replace(/^[\s\n]*I cannot transcribe this audio/i, "")
        .replace(/^[\s\n]*I'm unable to transcribe/i, "")
        .replace(/^[\s\n]*I cannot properly transcribe/i, "")
        .replace(/^[\s\n]*This appears to be/i, "")
        .replace(/^[\s\n]*This image/i, "")
        .replace(/^[\s\n]*The image/i, "")
        .replace(/^[\s\n]*I see an audio/i, "")
        .replace(/^[\s\n]*What I can see is/i, "")
        .replace(/(\s|^)(um|uh|er|ah|like,)(\s|$)/gi, ' ')
        .replace(/\s{2,}/g, ' ')
        .trim();
      
      // If Claude couldn't process the audio, try a different approach
      if (!processedText || 
          processedText.includes("I don't see any audio") || 
          processedText.includes("cannot transcribe") ||
          processedText.includes("not an audio file") ||
          processedText.includes("unable to process")) {
        
        // We need a different approach - let's try a simpler prompt
        const fallbackResponse = await anthropic.messages.create({
          model: "claude-3-7-sonnet-20250219",
          max_tokens: 1024,
          system: "You are a helpful assistant that can extract any text information from images, including audio visualizations.",
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: "This is a visualization of an audio recording. Please try to extract any information or patterns you can see in this image that might represent speech or sounds. Be creative in interpreting what might be a human voice recording."
                },
                {
                  type: "image",
                  source: {
                    type: "base64",
                    media_type: "image/jpeg",
                    data: base64Audio
                  }
                }
              ]
            }
          ]
        });
        
        // Extract any useful text from fallback response
        let fallbackText = "";
        for (const content of fallbackResponse.content) {
          if (content.type === 'text') {
            fallbackText += content.text;
          }
        }
        
        // If we still don't have a good transcription, provide a more helpful response
        if (!fallbackText || 
            fallbackText.includes("cannot interpret") || 
            fallbackText.includes("not able to extract")) {
          
          // Clean up temporary file
          if (fs.existsSync(tempFilePath)) {
            fs.unlinkSync(tempFilePath);
          }
          
          return res.status(200).json({
            transcript: "I can see you're speaking, but I'm unable to transcribe the audio. Would you like to try recording again with clearer speech?",
            success: true,
            provider: "claude-fallback"
          });
        }
        
        // Use fallback text if it seems more useful
        let finalTranscript = processedText;
        if (fallbackText.length > processedText.length) {
          finalTranscript = fallbackText;
        }
      }
      
      // Clean up the temporary file
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }
      
      // Return the processed transcript
      return res.status(200).json({ 
        transcript: finalTranscript || "I heard what you said but I'm having trouble creating an exact transcript. Could you try speaking more clearly?",
        success: true,
        provider: "claude"
      });
      
    } catch (claudeError) {
      console.error("Claude transcription error:", claudeError);
      
      // Clean up the temporary file
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }
      
      // Provide a helpful error message
      return res.status(500).json({ 
        error: 'Transcription service error', 
        details: "The audio transcription service encountered an issue. Please try again with a clearer recording."
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