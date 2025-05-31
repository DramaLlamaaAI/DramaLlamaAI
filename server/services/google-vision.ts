import { ImageAnnotatorClient } from '@google-cloud/vision';

// Initialize the client with credentials from environment
let vision: ImageAnnotatorClient | null = null;

function initializeVisionClient() {
  try {
    const credentials = process.env.GOOGLE_CLOUD_CREDENTIALS;
    if (!credentials) {
      throw new Error('GOOGLE_CLOUD_CREDENTIALS environment variable is not set');
    }
    
    // Parse credentials with better error handling
    let parsedCredentials;
    try {
      parsedCredentials = JSON.parse(credentials);
    } catch (parseError) {
      console.error('Failed to parse Google Cloud credentials. Please check the JSON format in your secrets.');
      throw new Error('Invalid JSON format in GOOGLE_CLOUD_CREDENTIALS');
    }
    
    vision = new ImageAnnotatorClient({
      credentials: parsedCredentials
    });
    
    console.log('Google Cloud Vision client initialized successfully');
    return true;
  } catch (error) {
    console.error('Failed to initialize Google Cloud Vision client:', error);
    vision = null;
    return false;
  }
}

export async function extractTextFromImage(imageBuffer: Buffer): Promise<string> {
  try {
    // Initialize client if not already done
    if (!vision) {
      const initialized = initializeVisionClient();
      if (!initialized) {
        throw new Error('Google Cloud Vision client could not be initialized');
      }
    }

    const [result] = await vision!.textDetection({
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