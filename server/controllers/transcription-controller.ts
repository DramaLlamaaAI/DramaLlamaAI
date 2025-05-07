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
  limits: { fileSize: 25 * 1024 * 1024 } // 25MB limit
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
      // Call OpenAI's transcription API
      const transcription = await openai.audio.transcriptions.create({
        file: fs.createReadStream(tempFilePath),
        model: "whisper-1",
        language: "en",
        response_format: "json",
      });

      // Clean up the temporary file
      fs.unlinkSync(tempFilePath);

      // Return the transcript
      return res.status(200).json({ 
        transcript: transcription.text,
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