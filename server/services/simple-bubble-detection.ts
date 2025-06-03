import sharp from 'sharp';

export interface MessageClassification {
  text: string;
  x: number;
  y: number;
  isGreenBubble: boolean;
  confidence: number;
}

export async function classifyMessagesByVisualCues(
  imageBuffer: Buffer,
  textItems: Array<{ text: string; x1: number; y1: number }>
): Promise<MessageClassification[]> {
  try {
    console.log('Starting simple visual bubble detection...');
    
    // Get image metadata
    const image = sharp(imageBuffer);
    const { width, height } = await image.metadata();
    
    if (!width || !height) {
      throw new Error('Unable to get image dimensions');
    }

    console.log(`Analyzing image: ${width}x${height}`);

    // Convert to a format we can analyze pixel by pixel
    const { data: pixels } = await image
      .raw()
      .toBuffer({ resolveWithObject: true });

    const results: MessageClassification[] = [];

    // For each text item, check the surrounding area for dominant color
    for (const item of textItems) {
      const isGreen = await analyzeAreaAroundText(
        pixels,
        width,
        height,
        item.x1,
        item.y1
      );

      results.push({
        text: item.text,
        x: item.x1,
        y: item.y1,
        isGreenBubble: isGreen,
        confidence: isGreen ? 0.95 : 0.90
      });

      console.log(`"${item.text}" at (${item.x1}, ${item.y1}) → ${isGreen ? 'GREEN' : 'GRAY'} bubble`);
    }

    const greenCount = results.filter(r => r.isGreenBubble).length;
    const grayCount = results.filter(r => !r.isGreenBubble).length;
    console.log(`Classification complete: ${greenCount} green, ${grayCount} gray bubbles`);

    return results;

  } catch (error) {
    console.error('Error in simple bubble detection:', error);
    return [];
  }
}

async function analyzeAreaAroundText(
  pixels: Buffer,
  imageWidth: number,
  imageHeight: number,
  textX: number,
  textY: number
): Promise<boolean> {
  
  // Define a larger search area around the text
  const searchRadius = 60;
  const minX = Math.max(0, textX - searchRadius);
  const maxX = Math.min(imageWidth - 1, textX + searchRadius);
  const minY = Math.max(0, textY - searchRadius);
  const maxY = Math.min(imageHeight - 1, textY + searchRadius);

  let greenPixelCount = 0;
  let darkPixelCount = 0;
  let totalRelevantPixels = 0;

  // Sample pixels in the search area
  for (let y = minY; y < maxY; y += 3) { // Skip pixels for performance
    for (let x = minX; x < maxX; x += 3) {
      const pixelIndex = (y * imageWidth + x) * 3;
      
      if (pixelIndex + 2 >= pixels.length) continue;

      const r = pixels[pixelIndex];
      const g = pixels[pixelIndex + 1];
      const b = pixels[pixelIndex + 2];

      // Skip very dark background pixels
      if (r + g + b < 50) continue;

      totalRelevantPixels++;

      // More specific WhatsApp green detection
      // WhatsApp green is approximately RGB(37, 211, 102) or similar bright greens
      if (g > 150 && g > r * 1.8 && g > b * 1.5 && r < 120) {
        greenPixelCount++;
      }
      // Check for dark/gray bubble areas (much more lenient)
      else if ((r + g + b) < 200 && (r + g + b) > 40) {
        darkPixelCount++;
      }
    }
  }

  if (totalRelevantPixels < 20) {
    // Not enough data, make an educated guess based on position
    return textX > imageWidth * 0.6; // Assume right side is green
  }

  const greenRatio = greenPixelCount / totalRelevantPixels;
  const darkRatio = darkPixelCount / totalRelevantPixels;

  // Log for debugging
  if (greenRatio > 0.05 || darkRatio > 0.1) {
    console.log(`  Area analysis: Green ${(greenRatio * 100).toFixed(1)}%, Dark ${(darkRatio * 100).toFixed(1)}%, Total pixels: ${totalRelevantPixels}`);
  }

  // Determine bubble type based on dominant color
  return greenRatio > 0.08; // Lower threshold for green detection
}