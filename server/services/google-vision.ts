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

// New function to extract text with positional information
export async function extractTextWithPositions(imageBuffer: Buffer): Promise<{
  leftMessages: string[];
  rightMessages: string[];
  allText: string;
}> {
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
      return { leftMessages: [], rightMessages: [], allText: '' };
    }

    // Get full text
    const allText = detections[0]?.description || '';
    
    // Skip the first detection (it's the full text) and process individual text blocks
    const textBlocks = detections.slice(1);
    
    if (textBlocks.length === 0) {
      return { leftMessages: [], rightMessages: [], allText };
    }

    // Calculate screen width from bounding boxes
    const allX = textBlocks
      .map(block => block.boundingPoly?.vertices || [])
      .flat()
      .map(vertex => vertex.x || 0)
      .filter(x => x > 0);
    
    const minX = Math.min(...allX);
    const maxX = Math.max(...allX);
    const screenWidth = maxX - minX;
    const centerX = minX + (screenWidth / 2);

    const leftMessages: string[] = [];
    const rightMessages: string[] = [];

    // Process each text block
    for (const block of textBlocks) {
      const text = block.description?.trim();
      if (!text || text.length < 2) continue;

      // Skip UI elements
      if (isUIElement(text)) continue;

      // Calculate average X position of this text block
      const vertices = block.boundingPoly?.vertices || [];
      if (vertices.length === 0) continue;

      const avgX = vertices.reduce((sum, vertex) => sum + (vertex.x || 0), 0) / vertices.length;

      // Determine if text is on left or right side
      if (avgX < centerX) {
        leftMessages.push(text);
      } else {
        rightMessages.push(text);
      }
    }

    return { leftMessages, rightMessages, allText };
  } catch (error) {
    console.error('Google Vision OCR with positions error:', error);
    throw new Error(`OCR processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Helper function to identify UI elements
function isUIElement(text: string): boolean {
  const trimmed = text.trim().toLowerCase();
  
  // Skip obvious UI elements
  if (trimmed.length < 2) return true;
  if (/^[\d:]+$/.test(trimmed)) return true; // Pure timestamps
  if (/^[\d\s%]+$/.test(trimmed)) return true; // Numbers and percentages
  if (/^[←→↑↓]+$/.test(trimmed)) return true; // Navigation arrows
  if (trimmed.includes('last seen')) return true;
  if (trimmed.includes('whatsapp')) return true;
  if (trimmed.includes('message')) return true;
  if (/^[✓√]+\s*$/.test(trimmed)) return true; // Read receipts only
  if (trimmed.length > 300) return true; // Probably corrupted
  
  return false;
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