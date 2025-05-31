import { ImageAnnotatorClient } from '@google-cloud/vision';
import Anthropic from '@anthropic-ai/sdk';

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
// AI-powered WhatsApp message parsing using Anthropic Claude
async function parseWhatsAppWithAI(ocrText: string): Promise<{
  leftMessages: string[];
  rightMessages: string[];
}> {
  try {
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    const prompt = `You are an expert at parsing WhatsApp chat screenshots from OCR text. Your task is to extract messages and correctly identify who sent each message.

CRITICAL RULES:
1. In WhatsApp, messages appear in two columns:
   - LEFT SIDE (gray bubbles): Messages from the OTHER person (Alex in this case)
   - RIGHT SIDE (green bubbles): Messages from the USER (the phone owner)

2. Extract only actual MESSAGE CONTENT - ignore:
   - Headers like "Alex Leonard", "last seen today at"
   - Timestamps like "08:09", "19:42"
   - UI elements like "till 53%", arrows, icons
   - System messages, dates
   - Read receipts (√, ✓)

3. Reconstruct complete messages from fragments

Here is the OCR text from a WhatsApp screenshot:

${ocrText}

Return ONLY a JSON object with this exact format:
{
  "leftMessages": ["complete message 1", "complete message 2"],
  "rightMessages": ["complete message 1", "complete message 2"]
}`;

    const response = await anthropic.messages.create({
      model: 'claude-3-7-sonnet-20250219', // the newest Anthropic model is "claude-3-7-sonnet-20250219" which was released February 24, 2025
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }]
    });

    const content = response.content[0];
    if (content.type === 'text') {
      const jsonMatch = content.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          leftMessages: parsed.leftMessages || [],
          rightMessages: parsed.rightMessages || []
        };
      }
    }

    // Fallback if AI parsing fails
    return { leftMessages: [], rightMessages: [] };
    
  } catch (error) {
    console.error('AI parsing error:', error);
    // Fallback to empty arrays if AI parsing fails
    return { leftMessages: [], rightMessages: [] };
  }
}

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
    
    // Use AI-powered parsing instead of coordinate clustering
    const { leftMessages, rightMessages } = await parseWhatsAppWithAI(allText);
    
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

  // Extract blocks with coordinates and filter out UI elements more aggressively
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
    .filter(block => {
      if (!block) return false;
      
      // More aggressive UI filtering
      const text = block.text.toLowerCase();
      
      // Skip header elements more comprehensively
      if (text.includes('alex leonard') || text.includes('last seen') || text.includes('today at') || 
          text.includes('23:57') || text.includes('23:58') || text.match(/^\d{2}:\d{2}$/)) return false;
      
      // Skip obvious UI elements
      if (isUIElement(block.text)) return false;
      
      // Skip very short standalone elements
      if (block.text.length < 2) return false;
      
      return true;
    });

  if (blocks.length === 0) {
    return { leftMessages: [], rightMessages: [] };
  }

  // Step 1: Create a more intelligent clustering approach
  // First, separate blocks into rough left and right regions
  const allX = blocks.map(b => b.x);
  const minX = Math.min(...allX);
  const maxX = Math.max(...allX);
  const centerX = minX + ((maxX - minX) / 2);
  
  // Separate into left and right regions first
  const leftBlocks = blocks.filter(block => block.x < centerX);
  const rightBlocks = blocks.filter(block => block.x >= centerX);
  
  // Function to cluster blocks within a region into message bubbles
  const clusterRegion = (regionBlocks: any[]) => {
    if (regionBlocks.length === 0) return [];
    
    // Sort by Y position
    const sortedBlocks = [...regionBlocks].sort((a, b) => a.y - b.y);
    
    const bubbles: any[] = [];
    let currentBubble: any[] = [sortedBlocks[0]];
    
    for (let i = 1; i < sortedBlocks.length; i++) {
      const block = sortedBlocks[i];
      const lastBlock = currentBubble[currentBubble.length - 1];
      
      // Use much larger threshold for WhatsApp message bubbles
      const verticalGap = Math.abs(block.y - lastBlock.y);
      
      if (verticalGap <= 100) {
        // Same message bubble - be very generous with grouping
        currentBubble.push(block);
      } else {
        // New message bubble - only split on very large gaps
        if (currentBubble.length > 0) {
          // Sort words in bubble by X position for proper reading order
          const sortedBubble = currentBubble.sort((a, b) => a.x - b.x);
          bubbles.push(sortedBubble);
        }
        currentBubble = [block];
      }
    }
    
    // Add the last bubble
    if (currentBubble.length > 0) {
      const sortedBubble = currentBubble.sort((a, b) => a.x - b.x);
      bubbles.push(sortedBubble);
    }
    
    return bubbles;
  };
  
  const leftBubbles = clusterRegion(leftBlocks);
  const rightBubbles = clusterRegion(rightBlocks);

  // Step 2: Create messages from bubbles
  const leftMessages: string[] = [];
  const rightMessages: string[] = [];
  
  // Process left bubbles (other person's messages)
  for (const bubble of leftBubbles) {
    if (!bubble || bubble.length === 0) continue;
    
    const messageText = bubble.map((block: any) => block.text).join(' ')
      .replace(/^\d{1,2}:\d{2}\s*/, '') // Remove leading timestamps
      .replace(/\s*[√✓]+\s*$/, '') // Remove trailing read receipts
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
    
    if (messageText.length >= 3) {
      leftMessages.push(messageText);
    }
  }
  
  // Process right bubbles (user's messages)
  for (const bubble of rightBubbles) {
    if (!bubble || bubble.length === 0) continue;
    
    const messageText = bubble.map((block: any) => block.text).join(' ')
      .replace(/^\d{1,2}:\d{2}\s*/, '') // Remove leading timestamps
      .replace(/\s*[√✓]+\s*$/, '') // Remove trailing read receipts
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
    
    if (messageText.length >= 3) {
      rightMessages.push(messageText);
    }
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