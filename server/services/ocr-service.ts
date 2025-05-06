import Tesseract from 'tesseract.js';

// Process image with OCR to extract text
export async function processImage(base64Image: string): Promise<string> {
  try {
    // Convert base64 to image data that Tesseract can use
    const imageBuffer = Buffer.from(base64Image, 'base64');
    
    // Process with Tesseract
    const { data } = await Tesseract.recognize(
      imageBuffer,
      'eng', // language
      {
        logger: m => console.log(m) // Optional logger for debugging
      }
    );
    
    // Return extracted text
    return data.text;
  } catch (error: any) {
    console.error('OCR Error:', error);
    throw new Error('Failed to extract text from image');
  }
}
