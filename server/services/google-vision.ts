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

    // Group text blocks by proximity to form complete messages
    const leftBlocks: Array<{text: string, x: number, y: number}> = [];
    const rightBlocks: Array<{text: string, x: number, y: number}> = [];

    // First, categorize and prepare blocks with positions
    for (const block of textBlocks) {
      const text = block.description?.trim();
      if (!text || text.length < 1) continue;

      // Skip obvious UI elements
      if (isUIElement(text)) continue;

      const vertices = block.boundingPoly?.vertices || [];
      if (vertices.length === 0) continue;

      const avgX = vertices.reduce((sum, vertex) => sum + (vertex.x || 0), 0) / vertices.length;
      const avgY = vertices.reduce((sum, vertex) => sum + (vertex.y || 0), 0) / vertices.length;

      // Categorize by side
      if (avgX < centerX) {
        leftBlocks.push({ text, x: avgX, y: avgY });
      } else {
        rightBlocks.push({ text, x: avgX, y: avgY });
      }
    }

    // Group nearby text blocks into complete messages using clustering
    const groupTextBlocks = (blocks: Array<{text: string, x: number, y: number}>): string[] => {
      if (blocks.length === 0) return [];
      
      // Sort blocks by Y position (top to bottom)
      const sortedBlocks = blocks.sort((a, b) => a.y - b.y);
      
      // Create message clusters based on vertical gaps
      const clusters: Array<Array<{text: string, x: number, y: number}>> = [];
      let currentCluster: Array<{text: string, x: number, y: number}> = [sortedBlocks[0]];
      
      for (let i = 1; i < sortedBlocks.length; i++) {
        const currentBlock = sortedBlocks[i];
        const previousBlock = sortedBlocks[i - 1];
        
        // If there's a significant vertical gap, start a new cluster (new message bubble)
        const verticalGap = Math.abs(currentBlock.y - previousBlock.y);
        
        if (verticalGap > 50) { // 50px gap indicates new message bubble
          clusters.push(currentCluster);
          currentCluster = [currentBlock];
        } else {
          currentCluster.push(currentBlock);
        }
      }
      
      // Don't forget the last cluster
      if (currentCluster.length > 0) {
        clusters.push(currentCluster);
      }
      
      // Convert clusters to message strings
      const messages: string[] = [];
      
      for (const cluster of clusters) {
        // Sort cluster blocks by X position (left to right) for proper word order
        const sortedCluster = cluster.sort((a, b) => a.x - b.x);
        const messageWords = sortedCluster.map(block => block.text).filter(text => text.trim().length > 0);
        
        if (messageWords.length > 0) {
          const messageText = messageWords.join(' ').trim();
          
          // Filter out obvious UI elements and very short fragments
          if (messageText.length >= 3 && !isUIElement(messageText)) {
            // Clean up the message text
            const cleanedMessage = messageText
              .replace(/^\d{1,2}:\d{2}\s*/, '') // Remove leading timestamps
              .replace(/\s*\d{1,2}:\d{2}\s*$/, '') // Remove trailing timestamps
              .replace(/[✓√]+\s*$/, '') // Remove read receipts
              .replace(/\s+/g, ' ') // Normalize whitespace
              .trim();
            
            if (cleanedMessage.length >= 3) {
              messages.push(cleanedMessage);
            }
          }
        }
      }
      
      return messages;
    };

    const finalLeftMessages = groupTextBlocks(leftBlocks);
    const finalRightMessages = groupTextBlocks(rightBlocks);

    return { leftMessages: finalLeftMessages, rightMessages: finalRightMessages, allText };
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