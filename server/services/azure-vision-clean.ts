import axios from 'axios';
import sharp from 'sharp';

interface AzureTextLine {
  text: string;
  boundingBox: number[];
}

interface AzureOCRResult {
  status?: string;
  analyzeResult?: {
    readResults: {
      lines: AzureTextLine[];
    }[];
  };
}

interface ExtractedMessage {
  text: string;
  speaker: string;
  x: number;
  y: number;
  confidence: number;
}

export async function analyzeImageWithAzure(
  base64Image: string, 
  messageSide: string = 'right',
  leftSideName: string = 'Left Person',
  rightSideName: string = 'Right Person'
): Promise<{
  messages: ExtractedMessage[];
  imageWidth: number;
  rawText: string;
}> {
  console.log('Azure Vision: Starting analysis with params:', { messageSide, leftSideName, rightSideName });
  
  const endpoint = process.env.AZURE_VISION_ENDPOINT;
  const subscriptionKey = process.env.AZURE_VISION_KEY;

  if (!endpoint || !subscriptionKey) {
    throw new Error('Azure Vision credentials not configured');
  }

  try {
    console.log('Starting Azure Vision OCR analysis...');
    console.log('Endpoint:', endpoint);
    console.log('Image size (base64):', base64Image.length);

    // Remove data URL prefix if present and validate
    const cleanBase64 = base64Image.replace(/^data:image\/[a-z]+;base64,/, '');
    console.log('Clean base64 size:', cleanBase64.length);
    
    // Validate base64 format
    if (!cleanBase64 || cleanBase64.length < 100) {
      throw new Error('Invalid or too small image data');
    }
    
    // Check if base64 is valid
    if (!/^[A-Za-z0-9+/]*={0,2}$/.test(cleanBase64)) {
      throw new Error('Invalid base64 format');
    }
    
    // Convert base64 to buffer
    const imageBuffer = Buffer.from(cleanBase64, 'base64');
    console.log('Image buffer size:', imageBuffer.length);
    
    // Validate image size (Azure has limits)
    if (imageBuffer.length > 50 * 1024 * 1024) { // 50MB limit
      throw new Error('Image too large for Azure Vision API');
    }
    
    if (imageBuffer.length < 1024) { // Too small
      throw new Error('Image too small to process');
    }

    // Validate and potentially resize image for Azure API requirements
    console.log('Processing image for Azure Vision API...');
    let processedBuffer = imageBuffer;
    
    try {
      const metadata = await sharp(imageBuffer).metadata();
      console.log(`Original image dimensions: ${metadata.width}x${metadata.height}`);
      
      // Azure requires images between 50x50 and 10000x10000 pixels
      if (!metadata.width || !metadata.height || 
          metadata.width < 50 || metadata.height < 50 ||
          metadata.width > 10000 || metadata.height > 10000) {
        
        console.log('Resizing image to meet Azure requirements...');
        
        // Calculate new dimensions while maintaining aspect ratio
        let newWidth = metadata.width || 100;
        let newHeight = metadata.height || 100;
        
        // If too small, scale up proportionally
        if (newWidth < 50 || newHeight < 50) {
          const scale = Math.max(50 / newWidth, 50 / newHeight);
          newWidth = Math.round(newWidth * scale);
          newHeight = Math.round(newHeight * scale);
        }
        
        // If too large, scale down proportionally
        if (newWidth > 10000 || newHeight > 10000) {
          const scale = Math.min(10000 / newWidth, 10000 / newHeight);
          newWidth = Math.round(newWidth * scale);
          newHeight = Math.round(newHeight * scale);
        }
        
        console.log(`Resizing to: ${newWidth}x${newHeight}`);
        
        processedBuffer = await sharp(imageBuffer)
          .resize(newWidth, newHeight)
          .jpeg({ quality: 85 })
          .toBuffer();
          
        console.log('Image resized successfully, new size:', processedBuffer.length);
      }
    } catch (sharpError) {
      console.warn('Sharp processing failed, using original image:', sharpError);
      processedBuffer = imageBuffer;
    }

    // Step 1: Submit image for analysis
    const cleanEndpoint = endpoint.endsWith('/') ? endpoint.slice(0, -1) : endpoint;
    const analyzeUrl = `${cleanEndpoint}/vision/v3.2/read/analyze`;
    console.log('Making request to:', analyzeUrl);
    
    const submitResponse = await axios.post(analyzeUrl, processedBuffer, {
      headers: {
        'Ocp-Apim-Subscription-Key': subscriptionKey,
        'Content-Type': 'application/octet-stream'
      },
      timeout: 30000
    });
    
    console.log('Azure submission response status:', submitResponse.status);

    const operationLocation = submitResponse.headers['operation-location'];
    if (!operationLocation) {
      throw new Error('No operation location returned from Azure');
    }

    // Step 2: Poll for results
    console.log('Polling Azure for OCR results...');
    let result: AzureOCRResult | undefined;
    let attempts = 0;
    const maxAttempts = 60;

    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      attempts++;
      
      try {
        const resultResponse = await axios.get(operationLocation, {
          headers: {
            'Ocp-Apim-Subscription-Key': subscriptionKey
          },
          timeout: 10000
        });
        
        result = resultResponse.data as AzureOCRResult;
        console.log(`Attempt ${attempts}: Status = ${result.status}`);
        
        if (result.status === 'succeeded') {
          console.log('Azure OCR completed successfully');
          break;
        } else if (result.status === 'failed') {
          throw new Error('Azure OCR processing failed');
        }
        
      } catch (pollError) {
        console.error(`Polling attempt ${attempts} failed:`, pollError);
        if (attempts === maxAttempts) {
          throw new Error('Failed to get results from Azure after maximum attempts');
        }
      }
    }

    if (!result || result.status !== 'succeeded' || !result.analyzeResult) {
      throw new Error('Azure OCR did not complete successfully');
    }

    // Step 3: Process results with coordinate-based speaker assignment
    const lines = result.analyzeResult.readResults[0]?.lines || [];
    console.log(`Azure found ${lines.length} text lines`);
    
    if (lines.length === 0) {
      console.log('No text found in image');
      return {
        messages: [],
        imageWidth: 0,
        rawText: 'No text detected in image'
      };
    }

    // Calculate image midpoint for left/right detection
    const allXCoordinates = lines.flatMap(line => [line.boundingBox[0], line.boundingBox[2], line.boundingBox[4], line.boundingBox[6]]);
    const minX = Math.min(...allXCoordinates);
    const maxX = Math.max(...allXCoordinates);
    const estimatedImageWidth = maxX - minX;
    
    console.log(`Image analysis: minX=${minX}, maxX=${maxX}, estimatedWidth=${estimatedImageWidth}`);

    // First pass: filter out timestamps and get valid content lines
    const contentLines = [];
    for (const line of lines) {
      const text = line.text.trim();
      if (!text || text.length < 2) continue;
      
      // Filter out timestamps and delivery indicators
      const timestampPattern = /^\d{1,2}:\d{2}(\s*(AM|PM))?\s*[\/\s]*$/;
      const deliveryPattern = /^(86V\/|87V\/|884\/|8:\d{2}\s*V\/|\d{1,2}\s*V\/|✓|✓✓)$/;
      const shortPattern = /^[\/\s\d]{1,6}$/;
      
      if (timestampPattern.test(text) || deliveryPattern.test(text) || shortPattern.test(text)) {
        console.log(`Filtering out timestamp/delivery indicator: "${text}"`);
        continue;
      }
      
      const x = Math.min(line.boundingBox[0], line.boundingBox[2], line.boundingBox[4], line.boundingBox[6]);
      const y = Math.min(line.boundingBox[1], line.boundingBox[3], line.boundingBox[5], line.boundingBox[7]);
      
      contentLines.push({ text, x, y, originalLine: line });
    }

    console.log(`After filtering: ${contentLines.length} content lines`);

    // Group lines into message bubbles based on Y proximity and X position
    const messageGroups = [];
    for (const contentLine of contentLines) {
      let foundGroup = false;
      
      // Look for existing group within 25px vertically and similar X position (within 100px)
      for (const group of messageGroups) {
        const yDiff = Math.abs(contentLine.y - group.avgY);
        const xDiff = Math.abs(contentLine.x - group.avgX);
        
        if (yDiff < 25 && xDiff < 100) {
          group.lines.push(contentLine);
          group.text += ' ' + contentLine.text;
          group.avgY = group.lines.reduce((sum, l) => sum + l.y, 0) / group.lines.length;
          group.avgX = group.lines.reduce((sum, l) => sum + l.x, 0) / group.lines.length;
          foundGroup = true;
          break;
        }
      }
      
      if (!foundGroup) {
        messageGroups.push({
          lines: [contentLine],
          text: contentLine.text,
          avgX: contentLine.x,
          avgY: contentLine.y
        });
      }
    }

    console.log(`Grouped into ${messageGroups.length} message bubbles`);

    // Use clustering approach: group messages by X coordinate similarity
    const xCoordinates = messageGroups.map(g => g.avgX);
    xCoordinates.sort((a, b) => a - b);
    
    console.log(`X coordinates sorted: ${xCoordinates.join(', ')}`);
    
    // Find the natural gap in X coordinates to split left/right
    let bestGap = 0;
    let splitPoint = 0;
    
    for (let i = 1; i < xCoordinates.length; i++) {
      const gap = xCoordinates[i] - xCoordinates[i-1];
      if (gap > bestGap) {
        bestGap = gap;
        splitPoint = (xCoordinates[i-1] + xCoordinates[i]) / 2;
      }
    }
    
    console.log(`Best gap: ${bestGap}, Split point: ${splitPoint}`);

    const messages: ExtractedMessage[] = [];
    
    for (const group of messageGroups) {
      const text = group.text.trim();
      if (!text) continue;
      
      console.log(`BUBBLE: "${text}" | X: ${group.avgX} | Y: ${group.avgY} | Split: ${splitPoint}`);
      
      let speaker: string;
      if (group.avgX < splitPoint) {
        speaker = leftSideName;
        console.log(`→ Assigning to LEFT: ${leftSideName}`);
      } else {
        speaker = rightSideName;
        console.log(`→ Assigning to RIGHT: ${rightSideName}`);
      }
      
      messages.push({
        text,
        speaker,
        x: group.avgX,
        y: group.avgY,
        confidence: 0.9
      });
    }

    // Sort messages by Y position (top to bottom)
    messages.sort((a, b) => a.y - b.y);

    return {
      messages,
      imageWidth: estimatedImageWidth,
      rawText: lines.map(line => line.text).join('\n')
    };

  } catch (error: any) {
    console.error('Azure Vision OCR error:', error);
    
    if (error.response) {
      console.error('Azure error response:', {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data,
        headers: error.response.headers
      });
      
      // Handle specific Azure error codes
      if (error.response.status === 401) {
        throw new Error('Azure Vision authentication failed. Please check your subscription key.');
      } else if (error.response.status === 403) {
        throw new Error('Azure Vision access denied. Please verify your subscription and endpoint region.');
      } else if (error.response.status === 400) {
        const errorCode = error.response.headers['ms-azure-ai-errorcode'];
        if (errorCode === 'InvalidImage') {
          throw new Error('Image format not supported. Please ensure the image is a valid JPEG or PNG.');
        }
        throw new Error(`Azure Vision request error: ${error.response.data?.error?.message || 'Invalid request'}`);
      }
    }
    
    throw new Error(`Azure Vision analysis failed: ${error.message}`);
  }
}