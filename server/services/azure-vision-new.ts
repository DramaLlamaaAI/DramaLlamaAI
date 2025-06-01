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

  // Step 1: Filter out timestamps and delivery indicators
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

  // Step 2: Group lines into message bubbles based on Y proximity and X similarity
  const bubbles: Array<{
    lines: typeof contentLines;
    centerX: number;
    centerY: number;
    text: string;
    boundingBox: { minX: number; maxX: number; minY: number; maxY: number };
    side?: 'left' | 'right';
  }> = [];

  for (const line of contentLines) {
    // Calculate line's center position for bubble grouping
    const lineX = line.x1;
    const lineY = line.y1;
    
    // Find existing bubble within proximity (50px Y, 100px X tolerance)
    let foundBubble = false;
    for (const bubble of bubbles) {
      const yDiff = Math.abs(lineY - bubble.centerY);
      const xDiff = Math.abs(lineX - bubble.centerX);
      
      if (yDiff < 50 && xDiff < 100) {
        // Add line to existing bubble
        bubble.lines.push(line);
        bubble.text += ' ' + line.text.trim();
        
        // Recalculate bubble center and bounds
        const allX = bubble.lines.map(l => l.x1);
        const allY = bubble.lines.map(l => l.y1);
        bubble.centerX = allX.reduce((sum, x) => sum + x, 0) / allX.length;
        bubble.centerY = allY.reduce((sum, y) => sum + y, 0) / allY.length;
        bubble.boundingBox = {
          minX: Math.min(...allX),
          maxX: Math.max(...allX),
          minY: Math.min(...allY),
          maxY: Math.max(...allY)
        };
        foundBubble = true;
        break;
      }
    }
    
    // Create new bubble if no match found
    if (!foundBubble) {
      bubbles.push({
        lines: [line],
        centerX: lineX,
        centerY: lineY,
        text: line.text.trim(),
        boundingBox: { minX: lineX, maxX: lineX, minY: lineY, maxY: lineY }
      });
    }
  }

  console.log(`Grouped into ${bubbles.length} message bubbles`);

  // Step 3: Use k-means clustering to automatically detect left/right groups
  const bubbleCenters = bubbles.map(b => b.centerX).sort((a, b) => a - b);
  console.log(`Bubble center X coordinates: ${bubbleCenters.join(', ')}`);
  
  if (bubbleCenters.length < 2) {
    console.log('Not enough bubbles for clustering, assigning all to left');
    bubbles.forEach(bubble => {
      bubble.side = 'left';
    });
  } else {
    // Simple k-means clustering for 2 groups (left/right)
    let leftCenter = bubbleCenters[0];
    let rightCenter = bubbleCenters[bubbleCenters.length - 1];
    
    console.log(`Initial cluster centers: left=${leftCenter}, right=${rightCenter}`);
    
    // Iterate k-means algorithm
    for (let iteration = 0; iteration < 10; iteration++) {
      const leftGroup: number[] = [];
      const rightGroup: number[] = [];
      
      // Assign each bubble to nearest cluster center
      bubbleCenters.forEach(x => {
        const distToLeft = Math.abs(x - leftCenter);
        const distToRight = Math.abs(x - rightCenter);
        
        if (distToLeft < distToRight) {
          leftGroup.push(x);
        } else {
          rightGroup.push(x);
        }
      });
      
      // Calculate new cluster centers
      const newLeftCenter = leftGroup.length > 0 ? 
        leftGroup.reduce((sum, x) => sum + x, 0) / leftGroup.length : leftCenter;
      const newRightCenter = rightGroup.length > 0 ? 
        rightGroup.reduce((sum, x) => sum + x, 0) / rightGroup.length : rightCenter;
      
      // Check for convergence
      const leftShift = Math.abs(newLeftCenter - leftCenter);
      const rightShift = Math.abs(newRightCenter - rightCenter);
      
      console.log(`Iteration ${iteration + 1}: left=${newLeftCenter} (shift: ${leftShift}), right=${newRightCenter} (shift: ${rightShift})`);
      console.log(`Left group: ${leftGroup.length} bubbles, Right group: ${rightGroup.length} bubbles`);
      
      leftCenter = newLeftCenter;
      rightCenter = newRightCenter;
      
      if (leftShift < 1 && rightShift < 1) {
        console.log('K-means converged');
        break;
      }
    }
    
    // Calculate split point as midpoint between final cluster centers
    const splitPoint = (leftCenter + rightCenter) / 2;
    console.log(`Final cluster centers: left=${leftCenter}, right=${rightCenter}, split=${splitPoint}`);
    
    // Assign bubbles to sides based on final clustering
    bubbles.forEach(bubble => {
      const distToLeft = Math.abs(bubble.centerX - leftCenter);
      const distToRight = Math.abs(bubble.centerX - rightCenter);
      bubble.side = distToLeft < distToRight ? 'left' : 'right';
    });
  }

  const leftMessages: ExtractedMessage[] = [];
  const rightMessages: ExtractedMessage[] = [];

  bubbles.forEach(bubble => {
    const clusterSide = bubble.side || 'left';
    console.log(`BUBBLE: "${bubble.text}" | Center X: ${bubble.centerX} | Cluster: ${clusterSide}`);

    // Determine speaker based on cluster assignment and user preference
    let speaker: string;
    const isLeftCluster = clusterSide === 'left';
    
    if (messageSide === 'LEFT') {
      // User's messages are on the left
      speaker = isLeftCluster ? myName : theirName;
    } else {
      // User's messages are on the right
      speaker = isLeftCluster ? theirName : myName;
    }

    console.log(`→ Assigning to ${speaker} (${clusterSide.toUpperCase()} cluster)`);

    const message: ExtractedMessage = {
      text: bubble.text,
      speaker,
      x: bubble.centerX,
      y: bubble.centerY,
      confidence: 0.9
    };

    if (isLeftCluster) {
      leftMessages.push(message);
    } else {
      rightMessages.push(message);
    }
  });

  console.log(`Processing completed: ${leftMessages.length} left messages, ${rightMessages.length} right messages`);

  return { leftMessages, rightMessages };
}