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

  // Filter out timestamps and delivery indicators first
  const contentLines = lines.filter(line => {
    const text = line.text.trim();
    const timestampPattern = /^\d{1,2}:\d{2}[\s\/]*$/;
    const deliveryPattern = /^(86V\/|87V\/|88\d\/|8:\d{2}\s*V\/|\d{1,2}\s*V\/|✓|✓✓)$/;
    
    if (timestampPattern.test(text) || deliveryPattern.test(text) || text.length < 2) {
      console.log(`Filtering out timestamp/delivery indicator: "${text}"`);
      return false;
    }
    return true;
  });

  console.log(`After filtering: ${contentLines.length} content lines`);

  if (contentLines.length === 0) {
    return { leftMessages: [], rightMessages: [] };
  }

  // Use clustering approach: find natural gap in X coordinates
  const xCoordinates = contentLines.map(line => line.x1).sort((a, b) => a - b);
  console.log(`X coordinates sorted: ${xCoordinates.join(', ')}`);
  
  // Analyze the coordinate distribution to find natural clusters
  // Look for the leftmost message (likely the actual left side)
  const leftmostX = Math.min(...xCoordinates);
  const rightmostX = Math.max(...xCoordinates);
  
  // Count messages in different ranges to identify the actual left vs right distribution
  const quarterPoint = leftmostX + (rightmostX - leftmostX) * 0.25;
  const leftQuarterCount = xCoordinates.filter(x => x <= quarterPoint).length;
  
  console.log(`Leftmost: ${leftmostX}, Rightmost: ${rightmostX}, Quarter point: ${quarterPoint}, Left quarter count: ${leftQuarterCount}`);
  
  // If there's only 1-2 messages in the leftmost quarter, that's likely the true left side
  let splitPoint;
  if (leftQuarterCount <= 2) {
    // Use a point that separates the isolated left messages from the rest
    splitPoint = quarterPoint + 20; // Give some buffer
    console.log(`Using isolated left detection, split point: ${splitPoint}`);
  } else {
    // Fall back to gap analysis
    let bestGap = 0;
    splitPoint = 0;
    
    for (let i = 1; i < xCoordinates.length; i++) {
      const gap = xCoordinates[i] - xCoordinates[i-1];
      if (gap > bestGap) {
        bestGap = gap;
        splitPoint = (xCoordinates[i-1] + xCoordinates[i]) / 2;
      }
    }
    console.log(`Using gap analysis, best gap: ${bestGap}, split point: ${splitPoint}`);
  }
  
  console.log(`Final split point: ${splitPoint}`);

  const leftMessages: ExtractedMessage[] = [];
  const rightMessages: ExtractedMessage[] = [];

  contentLines.forEach(line => {
    const text = line.text.trim();
    
    console.log(`BUBBLE: "${text}" | X: ${line.x1} | Y: ${line.y1} | Split: ${splitPoint}`);

    // Determine speaker based on split point and user preference
    let speaker: string;
    const isLeftSide = line.x1 < splitPoint;
    
    if (messageSide === 'LEFT') {
      // User's messages are on the left
      speaker = isLeftSide ? myName : theirName;
    } else {
      // User's messages are on the right
      speaker = isLeftSide ? theirName : myName;
    }

    console.log(`→ Assigning to ${speaker} (${isLeftSide ? 'LEFT' : 'RIGHT'} side)`);

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