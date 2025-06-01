import axios from 'axios';

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

  // Calculate image boundaries
  const allX = lines.map(line => line.x1);
  const minX = Math.min(...allX);
  const maxX = Math.max(...allX);
  const threshold = (minX + maxX) / 2;

  console.log(`Image analysis: minX=${minX}, maxX=${maxX}, threshold=${threshold}`);

  const leftMessages: ExtractedMessage[] = [];
  const rightMessages: ExtractedMessage[] = [];

  lines.forEach((line, index) => {
    const text = line.text.trim();
    
    // Filter out timestamps and delivery indicators
    const timestampPattern = /^\d{1,2}:\d{2}[\s\/]*$/;
    const deliveryPattern = /^(86V\/|87V\/|88\d\/|✓|✓✓)$/;
    
    if (timestampPattern.test(text) || deliveryPattern.test(text)) {
      console.log(`Filtering out timestamp/delivery indicator: "${text}"`);
      return;
    }

    // Skip very short text that's likely noise
    if (text.length < 2) return;

    console.log(`Text: "${text}" | X: ${line.x1} | Y: ${line.y1} | Threshold: ${threshold}`);

    // Determine speaker based on coordinate and user preference
    let speaker: string;
    const isLeftSide = line.x1 < threshold;
    
    if (messageSide === 'LEFT') {
      // User's messages are on the left
      speaker = isLeftSide ? myName : theirName;
    } else {
      // User's messages are on the right
      speaker = isLeftSide ? theirName : myName;
    }

    console.log(`Assigning to ${speaker} (${isLeftSide ? 'LEFT' : 'RIGHT'} side)`);

    const message: ExtractedMessage = {
      text,
      speaker,
      x: line.x1,
      y: line.y1,
      confidence: 0.9
    };

    if (isLeftSide) {
      leftMessages.push(message);
    } else {
      rightMessages.push(message);
    }
  });

  console.log(`Processing completed: ${leftMessages.length} left messages, ${rightMessages.length} right messages`);

  return { leftMessages, rightMessages };
}