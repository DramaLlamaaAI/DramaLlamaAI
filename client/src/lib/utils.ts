import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Convert file to base64
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      // Remove the data URL prefix (e.g., "data:image/png;base64,")
      const base64 = result.split(",")[1];
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
  });
};

// Format date to readable string
export const formatDate = (date: Date): string => {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
};

// Truncate text
export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
};

// Detect and standardize chat log format
export const preprocessChatLog = (text: string): string => {
  // Clean up extra whitespace and standardize line breaks
  let cleanedText = text.replace(/\r\n/g, '\n').trim();
  
  // Identify common chat export formats
  
  // WhatsApp format: multiple variations possible
  // Format 1: "[MM/DD/YY, HH:MM:SS AM/PM] Name: Message"
  // Format 2: "[MM/DD/YY HH:MM:SS] Name: Message"
  const isWhatsApp = /\[\d{1,2}\/\d{1,2}\/\d{2,4},?\s\d{1,2}:\d{2}(?::\d{2})?(?:\s[AP]M)?\]\s.*?:/i.test(cleanedText) ||
                     // Also detect WhatsApp group chat export format
                     /\d{1,2}\/\d{1,2}\/\d{2,4},\s\d{1,2}:\d{2}\s-\s.*?:/i.test(cleanedText);
  
  // iMessage/SMS format: "YYYY-MM-DD HH:MM:SS Name: Message"
  const isIMessage = /\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2}\s.*?:/i.test(cleanedText);
  
  // Facebook Messenger format: "Name at HH:MM MM" or "MM/DD/YYYY, HH:MM AM/PM - Name:"
  const isFBMessenger = /(?:.*?\sat\s\d{1,2}:\d{2}\s[AP]M|(?:\d{1,2}\/\d{1,2}\/\d{4}|\d{1,2}\s\w+\s\d{4}),\s\d{1,2}:\d{2}\s[AP]M\s-\s.*?:)/i.test(cleanedText);
  
  // Discord format: "Name — Today/Yesterday at HH:MM PM"
  const isDiscord = /.*?\s(?:—|-)\s(?:Today|Yesterday|Last\s\w+|\d{1,2}\/\d{1,2}\/\d{4})\sat\s\d{1,2}:\d{2}\s[AP]M/i.test(cleanedText);
  
  // Standard chat format with names followed by colons  
  const hasStandardFormat = /^[^:]+:\s.*$/m.test(cleanedText);
  
  // Handle different formats accordingly
  if (isWhatsApp) {
    // Just return the original text as it's usually well-structured
    return cleanedText;
  } else if (isIMessage || isFBMessenger || isDiscord) {
    // These formats can be challenging for analysis - inform the AI
    return `[This appears to be an ${isIMessage ? 'iMessage' : isFBMessenger ? 'Facebook Messenger' : 'Discord'} chat log format]\n\n${cleanedText}`;
  } else if (!hasStandardFormat && cleanedText.length > 100) {
    // If no clear chat format detected, try to separate paragraphs 
    // to make it look more like a conversation
    if (cleanedText.split('\n\n').length <= 3) {
      cleanedText = cleanedText
        .replace(/([.!?])\s+/g, '$1\n')
        .replace(/\n{3,}/g, '\n\n');
    }
    return cleanedText;
  }
  
  return cleanedText;
};

// Validate conversation format
export const validateConversation = (conversation: string): boolean => {
  // Basic validation - ensure there's some content with likely message patterns
  
  // Check if it's long enough to be a real conversation
  if (conversation.length < 10) return false;
  
  // Check for standard chat format with names and colons
  const hasNameColonFormat = conversation.includes(':');
  
  // Check for WhatsApp export format
  const hasWhatsAppFormat = /\[\d{1,2}\/\d{1,2}\/\d{2,4},?\s\d{1,2}:\d{2}(?::\d{2})?(?:\s[AP]M)?\]/i.test(conversation) ||
                           /\d{1,2}\/\d{1,2}\/\d{2,4},\s\d{1,2}:\d{2}\s-\s/i.test(conversation);
  
  // Check for other timestamp formats (iMessage, Discord, etc.)
  const hasOtherTimestampFormat = /\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}|\d{1,2}:\d{2}\s[AP]M/i.test(conversation);
  
  return hasNameColonFormat || hasWhatsAppFormat || hasOtherTimestampFormat;
};

// Get percentage of usage
export const getUsagePercentage = (used: number, limit: number): number => {
  if (limit === Infinity) return Math.min(used * 10, 100);
  return Math.min(Math.round((used / limit) * 100), 100);
};

// Calculate emotion color based on type
export const getEmotionColor = (emotion: string): string => {
  const emotionMap: Record<string, string> = {
    'angry': 'bg-red-500',
    'sad': 'bg-blue-500',
    'happy': 'bg-green-500',
    'anxious': 'bg-yellow-500',
    'neutral': 'bg-gray-500',
    'frustrated': 'bg-orange-500',
    'excited': 'bg-purple-500',
    // Default for any other emotions
    'default': 'bg-gray-400',
  };
  
  return emotionMap[emotion.toLowerCase()] || emotionMap.default;
};

// Calculate severity color based on level
export const getSeverityColor = (severity: number): string => {
  if (severity >= 8) return 'bg-red-500';
  if (severity >= 5) return 'bg-orange-400';
  if (severity >= 3) return 'bg-yellow-400';
  return 'bg-green-400';
};

// Get tier display name
export const getTierDisplayName = (tier: string): string => {
  const tierMap: Record<string, string> = {
    'free': 'Free Tier',
    'personal': 'Personal Plan',
    'pro': 'Pro Plan',
  };
  
  return tierMap[tier] || 'Free Tier';
};

// Check if local storage is available
export const isLocalStorageAvailable = (): boolean => {
  try {
    localStorage.setItem('test', 'test');
    localStorage.removeItem('test');
    return true;
  } catch (e) {
    return false;
  }
};

// Save disclaimer acceptance to local storage
export const saveDisclaimerAcceptance = (): void => {
  if (isLocalStorageAvailable()) {
    localStorage.setItem('dramaLlama_disclaimerAccepted', 'true');
  }
};

// Check if disclaimer has been accepted
export const hasAcceptedDisclaimer = (): boolean => {
  if (!isLocalStorageAvailable()) return false;
  return localStorage.getItem('dramaLlama_disclaimerAccepted') === 'true';
};

// Check if a file is a zip archive or WhatsApp chat export
export const isZipFile = (file: File | string): boolean => {
  if (!file) return false;
  
  if (typeof file === 'string') {
    return file.toLowerCase().endsWith('.zip');
  } else {
    // First detect WhatsApp chat exports (handle all common naming patterns)
    // This is a broader detection than before to catch more WhatsApp export formats
    const filename = file.name.toLowerCase();
    
    // WhatsApp export detection checks
    const isWhatsAppExport = 
      // Standard WhatsApp exports
      filename.includes('whatsapp chat with') || 
      // Chat with Person format
      filename.includes('chat with') ||
      // Generic chat.txt that might be WhatsApp export
      filename === 'chat.txt' ||
      // Common export patterns
      filename.includes('_chat') ||
      // .txt files that are likely chat exports
      (filename.endsWith('.txt') && filename.includes('chat'));
    
    if (isWhatsAppExport) {
      console.log("Treating as WhatsApp chat export:", file.name);
      return true;
    }
    
    // Then check for zip files
    const isZipArchive = 
      file.type === 'application/zip' || 
      file.type === 'application/x-zip-compressed' ||
      file.name.toLowerCase().endsWith('.zip');
    
    if (isZipArchive) {
      console.log("Treating as ZIP archive file:", file.name);
      return true;
    }
    
    return false;
  }
};

// Get participant name color
export const getParticipantColor = (name: string): string => {
  // Generate a consistent color based on the name
  const colors = {
    // Primary color for the first participant (usually "me")
    primary: 'text-[#22C9C9] font-medium',
    // Secondary color for the second participant (usually "them")
    secondary: 'text-[#FF69B4] font-medium',
    // Default color in case we need it
    default: 'text-purple-500 font-medium'
  };
  
  const normalizedName = name.toLowerCase().trim();
  
  // For predictable colors, we'll use specific mappings
  // This would be "me" or first detected name
  if (normalizedName === 'me' || normalizedName === 'i' || normalizedName === 'alex') {
    return colors.primary;
  }
  
  // This would be "them" or second detected name
  if (normalizedName === 'them' || normalizedName === 'you' || normalizedName === 'jamie') {
    return colors.secondary;
  }
  
  // Default case - compute a hash of the name to determine color
  // In a simple way: use the first character's code
  const charCode = normalizedName.charCodeAt(0) || 0;
  return charCode % 2 === 0 ? colors.primary : colors.secondary;
};
