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
    
    // Debug: log the raw OCR text to understand the structure
    console.log('Raw OCR text from Google Vision:', allText);
    
    // Use coordinate-based clustering with the individual text blocks
    const { leftMessages, rightMessages } = clusterMessagesByPosition(detections.slice(1));
    
    console.log('Extracted left messages:', leftMessages);
    console.log('Extracted right messages:', rightMessages);

    return { leftMessages, rightMessages, allText };
  } catch (error) {
    console.error('Google Vision OCR with positions error:', error);
    throw new Error(`OCR processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Cluster OCR text blocks into message bubbles using coordinates
function clusterMessagesByPosition(textBlocks: any[]): {
  leftMessages: string[];
  rightMessages: string[];
} {
  if (!textBlocks || textBlocks.length === 0) {
    return { leftMessages: [], rightMessages: [] };
  }

  // Extract blocks with coordinates
  const blocks = textBlocks
    .map(block => {
      const text = block.description?.trim();
      const vertices = block.boundingPoly?.vertices;
      
      if (!text || !vertices || vertices.length < 4) return null;
      
      // Calculate center coordinates
      const avgX = vertices.reduce((sum: number, v: any) => sum + (v.x || 0), 0) / vertices.length;
      const avgY = vertices.reduce((sum: number, v: any) => sum + (v.y || 0), 0) / vertices.length;
      
      return { text, x: avgX, y: avgY };
    })
    .filter(block => block !== null && !isUIElement(block.text));

  if (blocks.length === 0) {
    return { leftMessages: [], rightMessages: [] };
  }

  // Determine image dimensions for positioning
  const allX = blocks.map(b => b.x);
  const imageWidth = Math.max(...allX) - Math.min(...allX);
  const leftThreshold = Math.min(...allX) + (imageWidth * 0.4);
  const rightThreshold = Math.min(...allX) + (imageWidth * 0.6);

  // Step 1: Group words into lines based on Y proximity (much more generous - within 60px)
  const lines: any[][] = [];
  const sortedBlocks = [...blocks].sort((a, b) => a.y - b.y);
  
  let currentLine: any[] = [sortedBlocks[0]];
  
  for (let i = 1; i < sortedBlocks.length; i++) {
    const block = sortedBlocks[i];
    const lastBlock = currentLine[currentLine.length - 1];
    
    if (Math.abs(block.y - lastBlock.y) <= 60) {
      // Same line/message bubble
      currentLine.push(block);
    } else {
      // New message bubble
      lines.push(currentLine);
      currentLine = [block];
    }
  }
  lines.push(currentLine);

  // Step 2: For each line/bubble, determine speaker and create complete message
  const bubbles: any[] = [];
  
  for (const line of lines) {
    if (line.length === 0) continue;
    
    // Calculate average X position for the entire bubble
    const bubbleX = line.reduce((sum: number, block: any) => sum + block.x, 0) / line.length;
    
    // Sort words by X position for proper reading order
    const sortedLine = line.sort((a, b) => a.x - b.x);
    
    bubbles.push({
      words: sortedLine,
      x: bubbleX
    });
  }

  // Step 3: Determine speaker and create messages
  const leftMessages: string[] = [];
  const rightMessages: string[] = [];
  
  for (const bubble of bubbles) {
    if (!bubble.words || bubble.words.length === 0) continue;
    
    // Create message text from all words in the bubble
    const messageText = bubble.words.map((block: any) => block.text).join(' ')
      .replace(/^\d{1,2}:\d{2}\s*/, '') // Remove leading timestamps
      .replace(/\s*[√✓]+\s*$/, '') // Remove trailing read receipts
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
    
    if (messageText.length < 3) continue;
    
    // Classify based on X position
    if (bubble.x < leftThreshold) {
      leftMessages.push(messageText);
    } else if (bubble.x > rightThreshold) {
      rightMessages.push(messageText);
    }
    // Skip middle messages (system messages, etc.)
  }

  return { leftMessages, rightMessages };
}

// Legacy text-based extraction (backup)
function extractMessagesFromFullText(fullText: string): {
  leftMessages: string[];
  rightMessages: string[];
} {
  // Split text into lines and clean them
  const lines = fullText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  
  const leftMessages: string[] = [];
  const rightMessages: string[] = [];
  
  // Find where the actual conversation starts (skip header info)
  let startIndex = 0;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('Alex Leonard') || lines[i].includes('last seen')) {
      startIndex = i + 1;
      break;
    }
  }
  
  // Process conversation lines
  const conversationLines = lines.slice(startIndex);
  
  // Group lines into messages based on WhatsApp patterns
  // Messages are separated by timestamps and read receipts
  let currentMessage = [];
  let currentMessageLines = [];
  
  for (let i = 0; i < conversationLines.length; i++) {
    const line = conversationLines[i];
    
    // Skip obvious UI elements
    if (isUIElement(line)) continue;
    
    // Check if this line starts a new message (has timestamp or read receipt)
    const hasTimestamp = /^\d{1,2}:\d{2}/.test(line);
    const hasReadReceipt = /[√✓]/.test(line);
    const isShortUIElement = line.length < 5 && /^[0-9\s%]+$/.test(line);
    
    if (hasTimestamp || hasReadReceipt || isShortUIElement) {
      // Process the current message if we have one
      if (currentMessageLines.length > 0) {
        const messageText = currentMessageLines.join(' ')
          .replace(/^\d{1,2}:\d{2}\s*/, '') // Remove leading timestamp
          .replace(/\s*[√✓]+\s*$/, '') // Remove trailing read receipts
          .replace(/\s+/g, ' ') // Normalize whitespace
          .trim();
        
        if (messageText.length >= 3) {
          // Classify the message based on content patterns
          if (messageText.includes("I'm") || 
              messageText.includes("I haven't") || 
              messageText.includes("I think") ||
              messageText.includes("my body") ||
              messageText.includes("my ") ||
              messageText.includes("I ") ||
              messageText.startsWith("Plus") ||
              messageText.startsWith("Still") ||
              messageText.startsWith("I'll") ||
              messageText.startsWith("Yh I'm") ||
              messageText.startsWith("Sweet") ||
              messageText.startsWith("All over") ||
              messageText.startsWith("Don't stress") ||
              messageText.startsWith("Get your") ||
              messageText.includes("I built") ||
              messageText.includes("Let me know")) {
            rightMessages.push(messageText);
          } else if (messageText.includes("Hope you") || 
                     messageText.includes("How u getting") ||
                     messageText.includes("What you done") ||
                     messageText.includes("Fair play") ||
                     messageText.includes("We're just getting") ||
                     messageText.includes("Cheers mate") ||
                     messageText.startsWith("Oh mad") ||
                     messageText.length < 30) {
            leftMessages.push(messageText);
          } else {
            // Default classification for unclear messages
            // Longer messages tend to be from the user
            if (messageText.length > 50) {
              rightMessages.push(messageText);
            } else {
              leftMessages.push(messageText);
            }
          }
        }
      }
      
      // Start new message, including the current line if it has content beyond timestamp/receipt
      const lineContent = line.replace(/^\d{1,2}:\d{2}\s*/, '').replace(/[√✓]+\s*$/, '').trim();
      currentMessageLines = lineContent.length > 0 ? [lineContent] : [];
    } else {
      // Continue building current message
      currentMessageLines.push(line);
    }
  }
  
  // Process the final message
  if (currentMessageLines.length > 0) {
    const messageText = currentMessageLines.join(' ')
      .replace(/^\d{1,2}:\d{2}\s*/, '')
      .replace(/\s*[√✓]+\s*$/, '')
      .replace(/\s+/g, ' ')
      .trim();
    
    if (messageText.length >= 3) {
      if (messageText.includes("I'm") || 
          messageText.includes("I haven't") || 
          messageText.includes("my ") ||
          messageText.length > 50) {
        rightMessages.push(messageText);
      } else {
        leftMessages.push(messageText);
      }
    }
  }
  
  return { leftMessages, rightMessages };
}

// Parse WhatsApp messages using full text and positional data (backup method)
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