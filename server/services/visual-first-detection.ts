import sharp from 'sharp';

export interface BubbleRegion {
  x: number;
  y: number;
  width: number;
  height: number;
  isGreen: boolean;
  confidence: number;
}

export async function detectBubbleRegionsFirst(imageBuffer: Buffer): Promise<BubbleRegion[]> {
  try {
    console.log('Starting visual-first bubble detection...');
    
    const image = sharp(imageBuffer);
    const { width, height } = await image.metadata();
    
    if (!width || !height) {
      throw new Error('Unable to get image dimensions');
    }

    console.log(`Analyzing ${width}x${height} image for bubble regions`);

    // Convert to RGB for analysis
    const { data: pixels } = await image.raw().toBuffer({ resolveWithObject: true });
    
    const bubbleRegions: BubbleRegion[] = [];
    const scanSize = 20; // Size of scanning windows
    
    // Scan the image in a grid pattern looking for bubble-like color regions
    for (let y = 50; y < height - 100; y += scanSize) { // Skip top/bottom UI areas
      for (let x = 20; x < width - 20; x += scanSize) { // Skip edges
        
        const colorAnalysis = analyzeColorRegion(pixels, width, height, x, y, scanSize);
        
        if (colorAnalysis.isBubble) {
          // Found a bubble region, try to determine its full bounds
          const bounds = expandBubbleBounds(pixels, width, height, x, y, colorAnalysis.isGreen);
          
          bubbleRegions.push({
            x: bounds.x,
            y: bounds.y,
            width: bounds.width,
            height: bounds.height,
            isGreen: colorAnalysis.isGreen,
            confidence: colorAnalysis.confidence
          });
          
          console.log(`Found ${colorAnalysis.isGreen ? 'GREEN' : 'GRAY'} bubble at (${bounds.x}, ${bounds.y}) size ${bounds.width}x${bounds.height}`);
          
          // Skip ahead to avoid duplicate detection
          x += bounds.width;
        }
      }
    }
    
    console.log(`Detected ${bubbleRegions.length} bubble regions total`);
    const greenCount = bubbleRegions.filter(b => b.isGreen).length;
    const grayCount = bubbleRegions.filter(b => !b.isGreen).length;
    console.log(`Distribution: ${greenCount} green, ${grayCount} gray bubble regions`);
    
    return bubbleRegions;
    
  } catch (error) {
    console.error('Error in visual-first detection:', error);
    return [];
  }
}

function analyzeColorRegion(
  pixels: Buffer, 
  width: number, 
  height: number, 
  startX: number, 
  startY: number, 
  size: number
): { isBubble: boolean; isGreen: boolean; confidence: number } {
  
  let greenPixels = 0;
  let grayPixels = 0;
  let darkPixels = 0;
  let totalPixels = 0;
  
  for (let y = startY; y < Math.min(startY + size, height); y++) {
    for (let x = startX; x < Math.min(startX + size, width); x++) {
      const pixelIndex = (y * width + x) * 3;
      
      if (pixelIndex + 2 >= pixels.length) continue;
      
      const r = pixels[pixelIndex];
      const g = pixels[pixelIndex + 1];
      const b = pixels[pixelIndex + 2];
      
      totalPixels++;
      
      // WhatsApp green detection - be very specific about green color ranges
      if (g > 120 && g > r + 30 && g > b + 20 && r < 100 && b < 120) {
        greenPixels++;
      }
      // Dark bubble detection (received messages in dark theme)
      else if (r < 70 && g < 70 && b < 70 && (r + g + b) > 30) {
        darkPixels++;
      }
      // Light gray bubble detection
      else if (r > 180 && g > 180 && b > 180 && Math.abs(r - g) < 20) {
        grayPixels++;
      }
    }
  }
  
  if (totalPixels < 10) {
    return { isBubble: false, isGreen: false, confidence: 0 };
  }
  
  const greenRatio = greenPixels / totalPixels;
  const grayRatio = grayPixels / totalPixels;
  const darkRatio = darkPixels / totalPixels;
  
  // Determine if this looks like a message bubble
  if (greenRatio > 0.3) {
    return { isBubble: true, isGreen: true, confidence: Math.min(0.95, greenRatio * 2) };
  }
  
  if (grayRatio > 0.4 || darkRatio > 0.4) {
    return { isBubble: true, isGreen: false, confidence: Math.min(0.90, Math.max(grayRatio, darkRatio) * 1.5) };
  }
  
  return { isBubble: false, isGreen: false, confidence: 0 };
}

function expandBubbleBounds(
  pixels: Buffer,
  width: number,
  height: number,
  startX: number,
  startY: number,
  isGreen: boolean
): { x: number; y: number; width: number; height: number } {
  
  // Start with the initial detection point and expand outward
  let minX = startX;
  let maxX = startX + 20;
  let minY = startY;
  let maxY = startY + 20;
  
  // Expand horizontally
  for (let x = startX - 40; x < startX + 100; x += 5) {
    if (x < 0 || x >= width) continue;
    
    const hasMatchingColor = checkForMatchingColor(pixels, width, height, x, startY, isGreen);
    if (hasMatchingColor) {
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x + 20);
    }
  }
  
  // Expand vertically
  for (let y = startY - 20; y < startY + 60; y += 5) {
    if (y < 0 || y >= height) continue;
    
    const hasMatchingColor = checkForMatchingColor(pixels, width, height, startX, y, isGreen);
    if (hasMatchingColor) {
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y + 20);
    }
  }
  
  return {
    x: Math.max(0, minX - 10),
    y: Math.max(0, minY - 10),
    width: Math.min(width - minX, maxX - minX + 20),
    height: Math.min(height - minY, maxY - minY + 20)
  };
}

function checkForMatchingColor(
  pixels: Buffer,
  width: number,
  height: number,
  x: number,
  y: number,
  isGreen: boolean
): boolean {
  
  const pixelIndex = (y * width + x) * 3;
  if (pixelIndex + 2 >= pixels.length) return false;
  
  const r = pixels[pixelIndex];
  const g = pixels[pixelIndex + 1];
  const b = pixels[pixelIndex + 2];
  
  if (isGreen) {
    return g > 120 && g > r + 30 && g > b + 20 && r < 100 && b < 120;
  } else {
    return (r < 70 && g < 70 && b < 70 && (r + g + b) > 30) ||
           (r > 180 && g > 180 && b > 180 && Math.abs(r - g) < 20);
  }
}