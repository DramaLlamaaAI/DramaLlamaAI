import sharp from 'sharp';

export interface ColorRegion {
  x: number;
  y: number;
  width: number;
  height: number;
  isGreen: boolean;
}

export async function detectMessageBubbleColors(imageBuffer: Buffer): Promise<ColorRegion[]> {
  try {
    // Get image info and convert to RGB
    const image = sharp(imageBuffer);
    const { width, height } = await image.metadata();
    
    if (!width || !height) {
      throw new Error('Unable to get image dimensions');
    }

    // Extract raw pixel data
    const { data } = await image
      .raw()
      .toBuffer({ resolveWithObject: true });

    const regions: ColorRegion[] = [];
    const regionSize = 50; // Size of regions to sample
    
    // Sample the image in a grid to find colored regions
    for (let y = 0; y < height - regionSize; y += regionSize) {
      for (let x = 0; x < width - regionSize; x += regionSize) {
        // Extract a small region
        const regionBuffer = await image
          .extract({ left: x, top: y, width: regionSize, height: regionSize })
          .raw()
          .toBuffer();
        
        // Analyze the dominant color in this region
        const isGreen = analyzeRegionForGreen(regionBuffer, regionSize);
        
        if (isGreen !== null) {
          regions.push({
            x,
            y,
            width: regionSize,
            height: regionSize,
            isGreen
          });
        }
      }
    }
    
    console.log(`Detected ${regions.length} colored regions`);
    return regions;
    
  } catch (error) {
    console.error('Error in color detection:', error);
    return [];
  }
}

function analyzeRegionForGreen(buffer: Buffer, size: number): boolean | null {
  let greenPixels = 0;
  let grayPixels = 0;
  let totalPixels = 0;
  
  // Analyze each pixel in the region
  for (let i = 0; i < buffer.length; i += 3) {
    const r = buffer[i];
    const g = buffer[i + 1];
    const b = buffer[i + 2];
    
    // Skip very dark pixels (likely background)
    if (r + g + b < 100) continue;
    
    totalPixels++;
    
    // Check if pixel is green-ish (WhatsApp green bubbles)
    if (g > r + 30 && g > b + 30 && g > 100) {
      greenPixels++;
    }
    // Check if pixel is gray-ish (received message bubbles)
    else if (Math.abs(r - g) < 20 && Math.abs(g - b) < 20 && Math.abs(r - b) < 20 && r > 80) {
      grayPixels++;
    }
  }
  
  // Return true if predominantly green, false if predominantly gray, null if neither
  if (totalPixels < 10) return null; // Not enough data
  
  const greenRatio = greenPixels / totalPixels;
  const grayRatio = grayPixels / totalPixels;
  
  if (greenRatio > 0.3) return true;   // Green bubble
  if (grayRatio > 0.3) return false;   // Gray bubble
  
  return null; // Neither
}

export function matchTextToColorRegion(textX: number, textY: number, regions: ColorRegion[]): boolean | null {
  // Find the region that contains this text coordinate
  for (const region of regions) {
    if (textX >= region.x && textX <= region.x + region.width &&
        textY >= region.y && textY <= region.y + region.height) {
      return region.isGreen;
    }
  }
  
  // If no exact match, find the closest region
  let closestRegion: ColorRegion | null = null;
  let closestDistance = Infinity;
  
  for (const region of regions) {
    const centerX = region.x + region.width / 2;
    const centerY = region.y + region.height / 2;
    const distance = Math.sqrt((textX - centerX) ** 2 + (textY - centerY) ** 2);
    
    if (distance < closestDistance && distance < 100) { // Within reasonable distance
      closestDistance = distance;
      closestRegion = region;
    }
  }
  
  return closestRegion ? closestRegion.isGreen : null;
}