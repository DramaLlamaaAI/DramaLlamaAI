import axios from 'axios';

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
  analyzeResult: {
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

export async function analyzeImageWithAzure(base64Image: string): Promise<{
  messages: ExtractedMessage[];
  imageWidth: number;
  rawText: string;
}> {
  const endpoint = process.env.AZURE_VISION_ENDPOINT;
  const subscriptionKey = process.env.AZURE_VISION_KEY;

  if (!endpoint || !subscriptionKey) {
    throw new Error('Azure Vision credentials not configured');
  }

  try {
    console.log('Starting Azure Vision OCR analysis...');

    // Remove data URL prefix if present
    const cleanBase64 = base64Image.replace(/^data:image\/[a-z]+;base64,/, '');
    const imageBuffer = Buffer.from(cleanBase64, 'base64');

    // Step 1: Submit image for analysis
    const cleanEndpoint = endpoint.endsWith('/') ? endpoint.slice(0, -1) : endpoint;
    const analyzeUrl = `${cleanEndpoint}/vision/v3.2/read/analyze`;
    const submitResponse = await axios.post(analyzeUrl, imageBuffer, {
      headers: {
        'Ocp-Apim-Subscription-Key': subscriptionKey,
        'Content-Type': 'application/octet-stream'
      }
    });

    const operationLocation = submitResponse.headers['operation-location'];
    if (!operationLocation) {
      throw new Error('No operation location returned from Azure');
    }

    // Step 2: Poll for results
    console.log('Polling Azure for OCR results...');
    let result: AzureOCRResult;
    let attempts = 0;
    const maxAttempts = 30;

    do {
      await new Promise(resolve => setTimeout(resolve, 1000));
      const resultResponse = await axios.get(operationLocation, {
        headers: { 'Ocp-Apim-Subscription-Key': subscriptionKey }
      });
      
      result = resultResponse.data;
      attempts++;

      if (attempts >= maxAttempts) {
        throw new Error('Azure OCR processing timed out');
      }
    } while (result.analyzeResult?.readResults?.[0]?.lines === undefined);

    console.log('Azure Vision OCR completed successfully');

    // Step 3: Process results and determine speaker positioning
    const lines = result.analyzeResult.readResults[0]?.lines || [];
    const messages: ExtractedMessage[] = [];
    
    // Estimate image width from bounding boxes (Azure gives normalized coordinates)
    const estimatedImageWidth = 1080; // Typical phone screenshot width
    const centerX = estimatedImageWidth / 2;

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
        
        // Determine speaker based on X position
        // Messages on left side are from the other person, right side are from "You"
        const speaker = x > centerX ? 'You' : 'Other Person';
        
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
    throw new Error(`Azure Vision analysis failed: ${error.message}`);
  }
}

function isWhatsAppUIElement(text: string): boolean {
  const uiPatterns = [
    /^last seen/i,
    /^online$/i,
    /^typing\.\.\.$/i,
    /^type a message$/i,
    /^\d{1,2}:\d{2}$/,
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
    /^🎤$/,
    /^📷$/,
    /^📎$/,
    /^😊$/
  ];

  return uiPatterns.some(pattern => pattern.test(text.trim()));
}