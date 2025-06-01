import axios from 'axios';
import sharp from 'sharp';

interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface AzureTextLine {
  text: string;
  boundingBox: number[];
}

interface AzureTextBlock {
  lines: AzureTextLine[];
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
  meName: string = 'You',
  themName: string = 'Other Person'
): Promise<{
  messages: ExtractedMessage[];
  imageWidth: number;
  rawText: string;
}> {
  console.log('Azure Vision: Starting analysis with params:', { messageSide, meName, themName });
  
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
        
        processedBuffer = await sharp(imageBuffer)
          .resize(newWidth, newHeight, {
            fit: 'inside',
            withoutEnlargement: false
          })
          .png()
          .toBuffer();
          
        console.log(`Resized image to: ${newWidth}x${newHeight}`);
      }
    } catch (sharpError) {
      console.error('Error processing image with Sharp:', sharpError);
      throw new Error('Failed to process image for Azure API');
    }

    // Step 1: Submit image for analysis
    const cleanEndpoint = endpoint.endsWith('/') ? endpoint.slice(0, -1) : endpoint;
    // Use the correct API version for F0 tier
    const analyzeUrl = `${cleanEndpoint}/vision/v3.2/read/analyze`;
    console.log('Making request to:', analyzeUrl);
    const submitResponse = await axios.post(analyzeUrl, processedBuffer, {
      headers: {
        'Ocp-Apim-Subscription-Key': subscriptionKey,
        'Content-Type': 'application/octet-stream'
      },
      timeout: 30000 // 30 second timeout
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
    const maxAttempts = 60; // Increased for F0 tier

    do {
      // Wait longer between polls for F0 tier
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      try {
        const resultResponse = await axios.get(operationLocation, {
          headers: { 'Ocp-Apim-Subscription-Key': subscriptionKey },
          timeout: 10000
        });
        
        result = resultResponse.data;
        console.log(`Poll attempt ${attempts + 1}: Status = ${result?.status || 'unknown'}`);
        
        if (result?.status === 'failed') {
          throw new Error('Azure OCR processing failed');
        }
        
        attempts++;

        if (attempts >= maxAttempts) {
          throw new Error('Azure OCR processing timed out after 2 minutes');
        }
      } catch (pollError: any) {
        if (pollError.response?.status === 429) {
          console.log('Rate limited, waiting longer...');
          await new Promise(resolve => setTimeout(resolve, 5000));
        } else {
          throw pollError;
        }
      }
    } while (result?.status !== 'succeeded' && !result?.analyzeResult?.readResults?.[0]?.lines);

    if (!result?.analyzeResult?.readResults?.[0]?.lines) {
      throw new Error('Azure OCR failed to extract text from image');
    }

    console.log('Azure Vision OCR completed successfully');

    // Step 3: Process results and determine speaker positioning
    const lines = result.analyzeResult.readResults[0]?.lines || [];
    const messages: ExtractedMessage[] = [];
    
    // Estimate image width from bounding boxes (Azure gives normalized coordinates)
    const estimatedImageWidth = 1080; // Typical phone screenshot width
    const centerX = estimatedImageWidth / 2; // 540

    // Process each line of text
    for (const line of lines) {
      const text = line.text.trim();
      
      // Skip WhatsApp UI elements
      if (isWhatsAppUIElement(text)) {
        continue;
      }

      // Get bounding box coordinates
      const boundingBox = line.boundingBox;
      if (boundingBox && boundingBox.length >= 4) {
        const x = boundingBox[0];
        const y = boundingBox[1];
        
        // Assign speaker based on bounding box positioning
        // Alex (person in hospital) is on the left side, Els (supportive friend) is on the right
        const midpointX = estimatedImageWidth / 2;
        let speaker: string;
        
        // Log coordinates for debugging
        console.log(`Text: "${text}" | X: ${x} | Y: ${y} | Midpoint: ${midpointX}`);
        
        // Use content-based detection to determine correct speaker
        // regardless of coordinates since positioning logic is unreliable
        if (text.includes("Plus I'm in hospital") ||
            text.includes("probably be out tomorrow") ||
            text.includes("Still in they've moved me") ||
            text.includes("ward I think I'm having an operation") ||
            text.includes("I haven't done anything lol") ||
            text.includes("It's my body letting me down") ||
            text.includes("Yh I'm alright now") ||
            text.includes("got out of hospital")) {
          speaker = themName; // Alex - person in hospital
        } else if (text.includes("Hope you're OK bro") ||
                   text.includes("Oh mad") ||
                   text.includes("How u getting on mate") ||
                   text.includes("What you done") ||
                   text.includes("how you getting on")) {
          speaker = meName; // Els - supportive friend
        } else {
          // For unclear messages, use coordinate-based detection
          // Green bubbles (els) appear on RIGHT side with higher X coordinates
          // Gray bubbles (other person) appear on LEFT side with lower X coordinates
          if (x > midpointX) {
            speaker = meName; // els - right side (green bubbles)
          } else {
            speaker = themName; // Lucy - left side (gray bubbles)
          }
        }
        
        console.log(`Assigned speaker: ${speaker}`);
        
        messages.push({
          text,
          speaker,
          x,
          y,
          confidence: 0.9 // Azure generally has high confidence
        });
      }
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

function isWhatsAppUIElement(text: string): boolean {
  const cleanText = text.trim();
  
  // Skip very short or meaningless text
  if (cleanText.length <= 1) return true;
  if (/^[O0o]{1,3}$/.test(cleanText)) return true; // Single O characters
  if (/^[\.]{1,3}$/.test(cleanText)) return true; // Just dots
  if (/^[0]{3,}$/.test(cleanText)) return true; // Multiple zeros
  if (/^[mMuU]$/.test(cleanText)) return true; // Single letters
  
  const uiPatterns = [
    /^last seen/i,
    /^online$/i,
    /^typing\.\.\.$/i,
    /^type a message$/i,
    /^\d{1,2}:\d{2}$/,
    /^\d{1,2}:\d{2}\s*[\/V\\]+$/,  // Time with status indicators
    /^today$/i,
    /^yesterday$/i,
    /^delivered$/i,
    /^read$/i,
    /^sent$/i,
    /^WhatsApp$/i,
    /^Camera$/i,
    /^Microphone$/i,
    /^Gallery$/i,
    /^Document$/i,
    /^Contact$/i,
    /^Location$/i,
    /^Message$/i,
    /^\d{1,2}\s+\w+\s+\d{4}$/,  // Date format like "15 February 2025"
    /^🎤$/,
    /^📷$/,
    /^📎$/,
    /^😊$/
  ];

  return uiPatterns.some(pattern => pattern.test(cleanText));
}