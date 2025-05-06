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

// Validate conversation format
export const validateConversation = (conversation: string): boolean => {
  // Basic validation - ensure there's some content with likely message patterns
  // This is a simple check - could be enhanced for specific chat formats
  return conversation.length > 10 && conversation.includes(':');
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
