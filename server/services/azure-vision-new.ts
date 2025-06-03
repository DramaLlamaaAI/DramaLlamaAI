import axios from 'axios';
import { classifyMessagesByVisualCues } from './simple-bubble-detection';

const AZURE_ENDPOINT = process.env.AZURE_VISION_ENDPOINT;
const AZURE_KEY = process.env.AZURE_VISION_KEY;

interface BoundingBox {
  x1: number;
  y1: number;
  text: string;
}

interface ExtractedMessage {
  text: string;
  speaker: string;
  x: number;
  y: number;
  confidence: number;
}

export async function extractTextFromImage(imageBuffer: Buffer): Promise<BoundingBox[]> {
  if (!AZURE_ENDPOINT || !AZURE_KEY) {
    throw new Error('Azure Vision credentials not configured');
  }

  console.log('Starting Azure Vision OCR analysis...');
  console.log('Endpoint:', AZURE_ENDPOINT);
  console.log('Image buffer size:', imageBuffer.length);

  // Submit image for analysis
  const submitResponse = await axios.post(
    `${AZURE_ENDPOINT}/vision/v3.2/read/analyze`,
    imageBuffer,
    {
      headers: {
        'Ocp-Apim-Subscription-Key': AZURE_KEY,
        'Content-Type': 'application/octet-stream'
      }
    }
  );

  const operationLocation = submitResponse.headers['operation-location'];
  if (!operationLocation) {
    throw new Error('No operation location found in Azure response');
  }

  console.log('Azure submission response status:', submitResponse.status);
  console.log('Polling Azure for OCR results...');

  // Poll for results
  let result;
  for (let i = 0; i < 10; i++) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    try {
      const { data } = await axios.get(operationLocation, {
        headers: { 'Ocp-Apim-Subscription-Key': AZURE_KEY }
      });
      
      console.log(`Attempt ${i + 1}: Status = ${data.status}`);
      
      if (data.status === 'succeeded') {
        result = data.analyzeResult.readResults;
        break;
      } else if (data.status === 'failed') {
        throw new Error('Azure Vision OCR failed');
      }
    } catch (error) {
      console.error(`Polling attempt ${i + 1} failed:`, error);
      if (i === 9) throw error;
    }
  }

  if (!result) {
    throw new Error('Azure Vision OCR did not complete within timeout');
  }

  console.log('Azure OCR completed successfully');

  // Extract lines with bounding box
  const lines: BoundingBox[] = [];
  result.forEach((page: any) => {
    console.log(`Azure found ${page.lines?.length || 0} text lines`);
    page.lines?.forEach((line: any) => {
      lines.push({
        text: line.text,
        x1: line.boundingBox[0], // Leftmost X coordinate
        y1: line.boundingBox[1]  // Topmost Y coordinate
      });
    });
  });

  return lines;
}

export async function processScreenshotMessages(
  imageBuffer: Buffer, 
  messageSide: 'LEFT' | 'RIGHT',
  myName: string,
  theirName: string
): Promise<{ leftMessages: ExtractedMessage[], rightMessages: ExtractedMessage[] }> {
  
  const lines = await extractTextFromImage(imageBuffer);
  
  if (lines.length === 0) {
    return { leftMessages: [], rightMessages: [] };
  }

  // Enhanced filtering for timestamps, dates, and noise
  const timestampPattern = /^\d{1,2}:\d{2}$/;
  const datePattern = /^\d{1,2}\s+(may|june|july|august)\s+\d{4}$/i;
  const noiseWords = new Set(['today', 'yesterday', 'may', 'june', 'july', 'august', '21', '2025', 'message', '...', '..', '.']);
  
  const contentLines = lines.filter(line => {
    const text = line.text.trim().toLowerCase();
    
    // Filter timestamps (hh:mm format)
    if (timestampPattern.test(text)) {
      console.log(`Filtering out timestamp: "${text}"`);
      return false;
    }
    
    // Filter delivery indicators
    if (/^(86v\/|87v\/|88\d\/|8:\d{2}\s*v\/|\d{1,2}\s*v\/|✓|✓✓)$/i.test(text)) {
      console.log(`Filtering out delivery indicator: "${text}"`);
      return false;
    }
    
    // Filter date patterns
    if (datePattern.test(text)) {
      console.log(`Filtering out date: "${text}"`);
      return false;
    }
    
    // Filter noise words
    if (noiseWords.has(text)) {
      console.log(`Filtering out noise word: "${text}"`);
      return false;
    }
    
    // Filter very short text
    if (text.length < 3) {
      console.log(`Filtering out short text: "${text}"`);
      return false;
    }
    
    return true;
  });

  console.log(`After enhanced filtering: ${contentLines.length} content lines`);

  if (contentLines.length === 0) {
    return { leftMessages: [], rightMessages: [] };
  }

  // Use simplified visual analysis to classify message bubbles
  const classifications = await classifyMessagesByVisualCues(imageBuffer, contentLines);
  
  // Group related text lines into complete messages
  const processedBubbles: Array<{
    text: string;
    x: number;
    y: number;
    isGreen: boolean;
    confidence: number;
  }> = [];
  
  // Sort lines by Y position for proper grouping
  const sortedClassifications = [...classifications].sort((a, b) => a.y - b.y);
  
  for (const item of sortedClassifications) {
    // Check if this line should be merged with the previous bubble
    const lastBubble = processedBubbles[processedBubbles.length - 1];
    if (lastBubble && 
        Math.abs(item.y - lastBubble.y) < 30 && 
        Math.abs(item.x - lastBubble.x) < 100 &&
        lastBubble.isGreen === item.isGreenBubble) {
      // Merge with previous bubble
      lastBubble.text += ' ' + item.text.trim();
    } else {
      // Create new bubble
      processedBubbles.push({
        text: item.text.trim(),
        x: item.x,
        y: item.y,
        isGreen: item.isGreenBubble,
        confidence: item.confidence
      });
    }
  }
  
  console.log(`Created ${processedBubbles.length} message bubbles using visual analysis`);
  
  // Count distribution
  const greenCount = processedBubbles.filter(b => b.isGreen).length;
  const grayCount = processedBubbles.filter(b => !b.isGreen).length;
  console.log(`Distribution: ${greenCount} green bubbles, ${grayCount} gray bubbles`);

  const leftMessages: ExtractedMessage[] = [];
  const rightMessages: ExtractedMessage[] = [];

  processedBubbles.forEach(bubble => {
    console.log(`BUBBLE: "${bubble.text}" | Green: ${bubble.isGreen} | Confidence: ${bubble.confidence}`);

    // Determine speaker based on bubble color
    // Green bubbles = sent messages (always the user)
    // Gray/dark bubbles = received messages (always the other person)
    let speaker: string;
    
    if (bubble.isGreen) {
      speaker = myName; // Green bubbles are always sent by the user
    } else {
      speaker = theirName; // Gray/dark bubbles are always from the other person
    }

    console.log(`→ Assigning to ${speaker} (${bubble.isGreen ? 'GREEN' : 'GRAY'} bubble)`);

    const message: ExtractedMessage = {
      text: bubble.text,
      speaker,
      x: bubble.x,
      y: bubble.y,
      confidence: bubble.confidence
    };

    // Organize messages by bubble type for proper display
    if (bubble.isGreen) {
      rightMessages.push(message); // Green/sent messages go to right
    } else {
      leftMessages.push(message); // Gray/received messages go to left
    }
  });

  console.log(`Processing completed: ${leftMessages.length} left messages, ${rightMessages.length} right messages`);

  return { leftMessages, rightMessages };
}