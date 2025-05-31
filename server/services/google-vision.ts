import { ImageAnnotatorClient } from '@google-cloud/vision';

// Initialize the client with credentials from environment
const vision = new ImageAnnotatorClient({
  credentials: JSON.parse(process.env.GOOGLE_CLOUD_CREDENTIALS || '{}'),
});

export async function extractTextFromImage(imageBuffer: Buffer): Promise<string> {
  try {
    const [result] = await vision.textDetection({
      image: {
        content: imageBuffer,
      },
    });

    const detections = result.textAnnotations;
    
    if (!detections || detections.length === 0) {
      return '';
    }

    // The first annotation contains the full text
    return detections[0]?.description || '';
  } catch (error) {
    console.error('Google Vision OCR error:', error);
    throw new Error(`OCR processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function extractTextFromMultipleImages(imageBuffers: Buffer[]): Promise<string[]> {
  const results: string[] = [];
  
  for (let i = 0; i < imageBuffers.length; i++) {
    try {
      const text = await extractTextFromImage(imageBuffers[i]);
      results.push(text);
      console.log(`Successfully extracted text from image ${i + 1}: ${text.length} characters`);
    } catch (error) {
      console.error(`Failed to extract text from image ${i + 1}:`, error);
      results.push(''); // Add empty string for failed extractions
    }
  }
  
  return results;
}