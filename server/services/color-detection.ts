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

    console.log(`Image dimensions: ${width}x${height}`);

    const regions: ColorRegion[] = [];
    const regionSize = 40; // Smaller regions for better accuracy
    let sampledRegions = 0;
    let detectedRegions = 0;
    
    // Sample the image in a grid to find colored regions
    for (let y = 0; y < height - regionSize; y += regionSize) {
      for (let x = 0; x < width - regionSize; x += regionSize) {
        sampledRegions++;
        
        // Extract a small region
        const regionBuffer = await image
          .extract({ left: x, top: y, width: regionSize, height: regionSize })
          .raw()
          .toBuffer();
        
        // Analyze the dominant color in this region
        const isGreen = analyzeRegionForGreen(regionBuffer, regionSize);
        
        if (isGreen !== null) {
          detectedRegions++;
          regions.push({
            x,
            y,
            width: regionSize,
            height: regionSize,
            isGreen
          });
          
          console.log(`Region at (${x}, ${y}): ${isGreen ? 'GREEN' : 'GRAY/DARK'} bubble detected`);
        }
      }
    }
    
    console.log(`Sampled ${sampledRegions} regions, detected ${detectedRegions} colored regions`);
    const greenRegions = regions.filter(r => r.isGreen).length;
    const grayRegions = regions.filter(r => !r.isGreen).length;
    console.log(`Final count: ${greenRegions} green regions, ${grayRegions} gray/dark regions`);
    
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
  let darkPixels = 0;
  
  const colorCounts = { green: 0, gray: 0, dark: 0, other: 0 };
  
  // Analyze each pixel in the region
  for (let i = 0; i < buffer.length; i += 3) {
    const r = buffer[i];
    const g = buffer[i + 1];
    const b = buffer[i + 2];
    
    totalPixels++;
    
    // WhatsApp green detection (more lenient)
    // WhatsApp green is around RGB(37, 211, 102) or similar
    if (g > 150 && g > r + 20 && g > b + 20) {
      greenPixels++;
      colorCounts.green++;
    }
    // Dark bubble detection (WhatsApp dark mode received messages)
    else if (r < 80 && g < 80 && b < 80 && (r + g + b) > 30) {
      darkPixels++;
      colorCounts.dark++;
    }
    // Light gray bubble detection (WhatsApp light mode received messages)
    else if (r > 200 && g > 200 && b > 200 && Math.abs(r - g) < 30 && Math.abs(g - b) < 30) {
      grayPixels++;
      colorCounts.gray++;
    }
    else {
      colorCounts.other++;
    }
  }
  
  if (totalPixels < 10) return null; // Not enough data
  
  const greenRatio = greenPixels / totalPixels;
  const grayRatio = grayPixels / totalPixels;
  const darkRatio = darkPixels / totalPixels;
  
  // Log detailed color analysis for debugging
  if (greenRatio > 0.1 || grayRatio > 0.1 || darkRatio > 0.1) {
    console.log(`Color analysis: Green: ${(greenRatio * 100).toFixed(1)}%, Gray: ${(grayRatio * 100).toFixed(1)}%, Dark: ${(darkRatio * 100).toFixed(1)}%, Total pixels: ${totalPixels}`);
  }
  
  // More lenient thresholds
  if (greenRatio > 0.15) return true;   // Green bubble
  if (grayRatio > 0.2 || darkRatio > 0.2) return false;   // Gray/dark bubble
  
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