import { Request, Response } from "express";
import OpenAI from "openai";
import multer from "multer";
import * as fs from 'fs';
import * as path from 'path';

// Create OpenAI instance
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
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
  try {
    // Check if file exists
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file provided' });
    }

    // Create a temporary file path to save the audio
    const tempDir = path.join(__dirname, '../tmp');
    
    // Ensure temp directory exists
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    const tempFilePath = path.join(tempDir, `recording-${Date.now()}.webm`);
    
    // Write buffer to temporary file
    fs.writeFileSync(tempFilePath, req.file.buffer);
    
    try {
      console.log(`Processing audio file: ${req.file.originalname}, size: ${req.file.size} bytes, mimetype: ${req.file.mimetype}`);
      
      // Get context information if provided
      let contextInfo: {speakerLabels?: string[]} = {};
      let speakerPrompt = "This is a conversation between two people discussing personal matters or relationships.";
      
      if (req.body.context) {
        try {
          contextInfo = JSON.parse(req.body.context);
          if (contextInfo.speakerLabels && contextInfo.speakerLabels.length >= 2) {
            speakerPrompt = `This is a conversation between ${contextInfo.speakerLabels[0]} and ${contextInfo.speakerLabels[1]}.`;
          }
        } catch (e) {
          console.warn("Could not parse context info:", e);
        }
      }
      
      // Enhanced prompt for better accuracy
      const enhancedPrompt = `${speakerPrompt} The conversation might include emotional language, questions and responses, agreements or disagreements. Common words may include: relationship, feeling, communication, upset, understand, listening, sorry, think, believe, want, need.`;
      
      // Call OpenAI's transcription API with enhanced parameters
      const transcription = await openai.audio.transcriptions.create({
        file: fs.createReadStream(tempFilePath),
        model: "whisper-1", // Using the best available Whisper model
        language: "en",
        response_format: "verbose_json", // Get more detailed results
        temperature: 0.0,  // Lower temperature for more accurate transcription
        prompt: enhancedPrompt,
      });
      
      console.log("Transcription successful, processing result");

      // Clean up the temporary file
      fs.unlinkSync(tempFilePath);
      
      // Post-process the transcript to improve quality
      let processedText = transcription.text;
      
      // Apply basic noise filtering to remove common transcription artifacts
      processedText = processedText
        .replace(/(\s|^)(um|uh|er|ah|like,)(\s|$)/gi, ' ')
        .replace(/\s{2,}/g, ' ')
        .trim();
      
      // Return the processed transcript
      return res.status(200).json({ 
        transcript: processedText,
        success: true
      });
    } catch (error: any) {
      // Clean up file in case of error
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }
      
      console.error("OpenAI transcription error:", error);
      
      return res.status(500).json({ 
        error: 'Error during transcription process', 
        details: error.message 
      });
    }
  } catch (error: any) {
    console.error("Server error during transcription:", error);
    return res.status(500).json({ 
      error: 'Server error during transcription', 
      details: error.message 
    });
  }
};