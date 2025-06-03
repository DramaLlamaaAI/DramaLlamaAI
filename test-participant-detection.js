/**
 * Test script for participant detection with WhatsApp format
 */

const testSample = `15/02/2024, 17:41 - Messages and calls are end-to-end encrypted. Only people in this chat can read, listen to, or share them. Learn more.
15/02/2024, 17:42 - Els: Free loader 🚗
15/02/2024, 18:03 - Hayley Swift: I will send Scott your number 😉
16/02/2024, 19:09 - Els: You deleted this message
16/02/2024, 20:19 - Hayley Swift: I will see how much I have saved with my dad.`;

// Enhanced direct pattern matching for WhatsApp and other chat formats
const whatsappPatterns = [
  // Standard WhatsApp format: DD/MM/YYYY, HH:MM - Name: message
  /\d{1,2}\/\d{1,2}\/\d{4},\s+\d{1,2}:\d{2}\s+-\s+([A-Za-z]+(?:\s+[A-Za-z]+)*)\s*:/g,
  // WhatsApp format with brackets: [date, time] Name: message  
  /\[\d+[\/-]\d+[\/-]\d+[,\s]+\d+:\d+[:\d]*\s*[AP]?M?\]\s*([A-Za-z]+(?:\s+[A-Za-z]+)*)\s*:/g,
  // Alternative format: date, time - Name: message
  /\d+[\/-]\d+[\/-]\d+[,\s]+\d+:\d+[:\d]*\s*[AP]?M?\s*-\s*([A-Za-z]+(?:\s+[A-Za-z]+)*)\s*:/g,
  // Simple format: Name: message (at start of line)
  /^([A-Za-z]+(?:\s+[A-Za-z]+)*)\s*:/gm,
  // Format with line breaks: Name: message
  /(?:^|\n)([A-Za-z]+(?:\s+[A-Za-z]+)*)\s*:/g
];

const detectedNames = new Set();

for (const pattern of whatsappPatterns) {
  let match;
  while ((match = pattern.exec(testSample)) !== null) {
    const rawName = match[1].trim();
    
    // Clean up the name - remove any trailing spaces or special characters
    const name = rawName.replace(/[^\w\s]/g, '').trim();
    
    // Filter out system messages, short names, and common non-names
    if (name.length >= 2 && 
        !name.toLowerCase().includes('changed') && 
        !name.toLowerCase().includes('added') && 
        !name.toLowerCase().includes('left') &&
        !name.toLowerCase().includes('joined') &&
        !name.toLowerCase().includes('created') &&
        !name.toLowerCase().includes('messages') &&
        !name.toLowerCase().includes('calls') &&
        name !== 'You' && name !== 'Me' && name !== 'Them' &&
        name !== 'Media omitted' && name !== 'null' &&
        !/^\d+$/.test(name) && // Not just numbers
        name.length <= 50) { // Reasonable name length
      detectedNames.add(name);
      console.log('Found participant:', name);
    }
  }
}

const names = Array.from(detectedNames);
console.log('Final detected participants:', names);
if (names.length >= 2) {
  console.log('SUCCESS: Found both participants:', names[0], 'and', names[1]);
} else {
  console.log('ISSUE: Only found', names.length, 'participant(s)');
}