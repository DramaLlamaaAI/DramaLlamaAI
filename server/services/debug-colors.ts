import sharp from 'sharp';

export async function debugWhatsAppColors(imageBuffer: Buffer, textCoordinates: Array<{ x: number; y: number; text: string }>) {
  try {
    const image = sharp(imageBuffer);
    const { width, height } = await image.metadata();
    
    if (!width || !height) return;

    console.log(`\n=== DEBUGGING WHATSAPP COLORS ===`);
    console.log(`Image: ${width}x${height}`);

    const { data: pixels } = await image.raw().toBuffer({ resolveWithObject: true });

    // Sample specific coordinates from the known messages
    const samplePoints = [
      { x: 300, y: 800, name: "Green bubble area" }, // Should be in green bubble
      { x: 100, y: 800, name: "Gray bubble area" },  // Should be in gray bubble
      { x: 400, y: 1200, name: "Another green area" },
      { x: 150, y: 1200, name: "Another gray area" }
    ];

    for (const point of samplePoints) {
      if (point.x >= width || point.y >= height) continue;
      
      console.log(`\n--- ${point.name} at (${point.x}, ${point.y}) ---`);
      
      // Sample a 20x20 area around this point
      const colorStats = sampleAreaColors(pixels, width, height, point.x, point.y, 20);
      console.log(`Average RGB: (${colorStats.avgR}, ${colorStats.avgG}, ${colorStats.avgB})`);
      console.log(`Dominant colors found: ${colorStats.colorTypes.join(', ')}`);
      console.log(`Sample pixels: ${colorStats.samplePixels.map(p => `(${p.r},${p.g},${p.b})`).slice(0, 5).join(', ')}`);
    }

    // Also sample around known text coordinates
    console.log(`\n--- Text Coordinate Samples ---`);
    const textSamples = textCoordinates.slice(0, 5); // First 5 text items
    
    for (const textItem of textSamples) {
      console.log(`\nText: "${textItem.text}" at (${textItem.x}, ${textItem.y})`);
      const colorStats = sampleAreaColors(pixels, width, height, textItem.x, textItem.y, 30);
      console.log(`RGB around text: (${colorStats.avgR}, ${colorStats.avgG}, ${colorStats.avgB})`);
      console.log(`Colors: ${colorStats.colorTypes.join(', ')}`);
    }

  } catch (error) {
    console.error('Debug colors error:', error);
  }
}

function sampleAreaColors(
  pixels: Buffer,
  width: number,
  height: number,
  centerX: number,
  centerY: number,
  radius: number
) {
  const samplePixels: Array<{r: number, g: number, b: number}> = [];
  const colorTypes: string[] = [];
  let totalR = 0, totalG = 0, totalB = 0, count = 0;

  for (let y = Math.max(0, centerY - radius); y < Math.min(height, centerY + radius); y += 2) {
    for (let x = Math.max(0, centerX - radius); x < Math.min(width, centerX + radius); x += 2) {
      const pixelIndex = (y * width + x) * 3;
      
      if (pixelIndex + 2 >= pixels.length) continue;
      
      const r = pixels[pixelIndex];
      const g = pixels[pixelIndex + 1];
      const b = pixels[pixelIndex + 2];
      
      samplePixels.push({ r, g, b });
      totalR += r;
      totalG += g;
      totalB += b;
      count++;
      
      // Classify this pixel
      if (g > 120 && g > r + 20 && g > b + 10) {
        colorTypes.push('bright-green');
      } else if (g > 80 && g > r + 10 && g > b + 5) {
        colorTypes.push('medium-green');
      } else if (r < 80 && g < 80 && b < 80) {
        colorTypes.push('dark');
      } else if (r > 150 && g > 150 && b > 150) {
        colorTypes.push('light');
      } else {
        colorTypes.push('other');
      }
    }
  }

  return {
    avgR: Math.round(totalR / count),
    avgG: Math.round(totalG / count),
    avgB: Math.round(totalB / count),
    colorTypes: [...new Set(colorTypes)], // Remove duplicates
    samplePixels: samplePixels.slice(0, 10) // Return first 10 for debugging
  };
}