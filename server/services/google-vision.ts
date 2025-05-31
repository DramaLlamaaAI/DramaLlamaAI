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

// New function to extract text with positional information using document detection
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

    // Use regular text detection but apply intelligent parsing
    const [result] = await vision!.textDetection({
      image: {
        content: imageBuffer,
      },
    });

    const detections = result.textAnnotations;
    
    if (!detections || detections.length === 0) {
      return { leftMessages: [], rightMessages: [], allText: '' };
    }

    // Get full text for pattern analysis
    const allText = detections[0]?.description || '';
    
    // Use the full text and apply WhatsApp message parsing
    const { leftMessages, rightMessages } = parseWhatsAppMessages(allText, detections.slice(1));

    return { leftMessages, rightMessages, allText };
  } catch (error) {
    console.error('Google Vision OCR with positions error:', error);
    throw new Error(`OCR processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Parse WhatsApp messages using full text and positional data
function parseWhatsAppMessages(fullText: string, textBlocks: any[]): {
  leftMessages: string[];
  rightMessages: string[];
} {
  // Calculate screen dimensions and midpoint
  const allX = textBlocks
    .map(block => block.boundingPoly?.vertices || [])
    .flat()
    .map(vertex => vertex.x || 0)
    .filter(x => x > 0);
  
  if (allX.length === 0) {
    return { leftMessages: [], rightMessages: [] };
  }
  
  const minX = Math.min(...allX);
  const maxX = Math.max(...allX);
  const centerX = minX + ((maxX - minX) / 2);

  // Group text blocks by position
  const leftBlocks: Array<{text: string, x: number, y: number}> = [];
  const rightBlocks: Array<{text: string, x: number, y: number}> = [];

  for (const block of textBlocks) {
    const text = block.description?.trim();
    if (!text || text.length < 1 || isUIElement(text)) continue;

    const vertices = block.boundingPoly?.vertices || [];
    if (vertices.length === 0) continue;

    const avgX = vertices.reduce((sum: number, vertex: any) => sum + (vertex.x || 0), 0) / vertices.length;
    const avgY = vertices.reduce((sum: number, vertex: any) => sum + (vertex.y || 0), 0) / vertices.length;

    if (avgX < centerX) {
      leftBlocks.push({ text, x: avgX, y: avgY });
    } else {
      rightBlocks.push({ text, x: avgX, y: avgY });
    }
  }

  // Apply intelligent message reconstruction
  const reconstructMessages = (blocks: Array<{text: string, x: number, y: number}>): string[] => {
    if (blocks.length === 0) return [];
    
    // Sort by Y position first
    const sortedBlocks = blocks.sort((a, b) => a.y - b.y);
    
    // Group into message lines with more aggressive clustering
    const messageLines: string[][] = [];
    let currentLine: Array<{text: string, x: number, y: number}> = [];
    let lastY = sortedBlocks[0].y;
    
    for (const block of sortedBlocks) {
      // Use much larger threshold to group words in same message bubble
      if (Math.abs(block.y - lastY) > 80) { // Increased threshold
        if (currentLine.length > 0) {
          // Sort by X position for proper word order
          const sortedLine = currentLine.sort((a, b) => a.x - b.x);
          messageLines.push(sortedLine.map(b => b.text));
        }
        currentLine = [block];
      } else {
        currentLine.push(block);
      }
      lastY = block.y;
    }
    
    // Add the last line
    if (currentLine.length > 0) {
      const sortedLine = currentLine.sort((a, b) => a.x - b.x);
      messageLines.push(sortedLine.map(b => b.text));
    }
    
    // Merge lines into complete messages
    const messages: string[] = [];
    let currentMessage: string[] = [];
    
    for (const line of messageLines) {
      const lineText = line.join(' ').trim();
      
      // If line looks like start of new message (has timestamp pattern or is very short)
      if (lineText.match(/^\d{1,2}:\d{2}/) || (currentMessage.length > 0 && lineText.length < 8)) {
        // Finish current message
        if (currentMessage.length > 0) {
          const messageText = currentMessage.join(' ')
            .replace(/^\d{1,2}:\d{2}\s*/, '')
            .replace(/\s*\d{1,2}:\d{2}\s*$/, '')
            .replace(/[✓√]+\s*$/, '')
            .replace(/\s+/g, ' ')
            .trim();
          
          if (messageText.length >= 3 && !isUIElement(messageText)) {
            messages.push(messageText);
          }
        }
        currentMessage = [lineText];
      } else {
        currentMessage.push(lineText);
      }
    }
    
    // Add final message
    if (currentMessage.length > 0) {
      const messageText = currentMessage.join(' ')
        .replace(/^\d{1,2}:\d{2}\s*/, '')
        .replace(/\s*\d{1,2}:\d{2}\s*$/, '')
        .replace(/[✓√]+\s*$/, '')
        .replace(/\s+/g, ' ')
        .trim();
      
      if (messageText.length >= 3 && !isUIElement(messageText)) {
        messages.push(messageText);
      }
    }
    
    return messages;
  };

  return {
    leftMessages: reconstructMessages(leftBlocks),
    rightMessages: reconstructMessages(rightBlocks)
  };
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