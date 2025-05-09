import { apiRequest } from './queryClient';

// Analysis types
export type AnalysisType = 'chat' | 'message' | 'vent';

// Chat analysis interfaces
export interface ChatAnalysisRequest {
  conversation: string;
  me: string;
  them: string;
  tier?: string;
}

export interface ChatAnalysisResponse {
  toneAnalysis: {
    overallTone: string;
    emotionalState: Array<{
      emotion: string;
      intensity: number;
    }>;
    participantTones?: {
      [key: string]: string;
    };
  };
  redFlags?: Array<{
    type: string;
    description: string;
    severity: number;
  }>;
  communication: {
    patterns?: string[];
    dynamics?: string[];
    suggestions?: string[];
  };
  healthScore?: {
    score: number;
    label: string;
    color: 'red' | 'yellow' | 'light-green' | 'green';
  };
  keyQuotes?: Array<{
    speaker: string;
    quote: string;
    analysis: string;
    improvement?: string; // Added field for communication improvement recommendation
  }>;
  highTensionFactors?: Array<string>; // Field to show why the conversation is high-tension
  participantConflictScores?: {  // Field for individual conflict ratings
    [participant: string]: {
      score: number;      // 0-100 scale (higher is better communication)
      label: string;      // Text label describing communication style
      isEscalating: boolean; // Whether this participant tends to escalate conflict
    }
  };
}

// Message analysis interfaces
export interface MessageAnalysisRequest {
  message: string;
  author: 'me' | 'them';
}

export interface MessageAnalysisResponse {
  tone: string;
  intent: string[];
  suggestedReply?: string;
  potentialResponse?: string;
  possibleReword?: string;
}

// Vent mode interfaces
export interface VentModeRequest {
  message: string;
}

export interface VentModeResponse {
  original: string;
  rewritten: string;
  explanation: string;
}

// OCR request interface
export interface OcrRequest {
  image: string; // base64 encoded image
}

export interface OcrResponse {
  text: string;
}

// API functions
export async function analyzeChatConversation(request: ChatAnalysisRequest): Promise<ChatAnalysisResponse> {
  try {
    const response = await apiRequest('POST', '/api/analyze/chat', request);
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || 'Failed to analyze conversation');
    }
    return await response.json();
  } catch (error: any) {
    console.error('Analysis error:', error);
    throw new Error(error.message || 'Something went wrong analyzing the chat. Please try again.');
  }
}

export async function analyzeMessage(request: MessageAnalysisRequest): Promise<MessageAnalysisResponse> {
  try {
    const response = await apiRequest('POST', '/api/analyze/message', request);
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || 'Failed to analyze message');
    }
    return await response.json();
  } catch (error: any) {
    console.error('Message analysis error:', error);
    throw new Error(error.message || 'Failed to analyze message. Please try again.');
  }
}

export async function ventMessage(request: VentModeRequest): Promise<VentModeResponse> {
  try {
    const response = await apiRequest('POST', '/api/analyze/vent', request);
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || 'Failed to rewrite message');
    }
    return await response.json();
  } catch (error: any) {
    console.error('Vent mode error:', error);
    throw new Error(error.message || 'Failed to rewrite message. Please try again.');
  }
}

export async function processImageOcr(request: OcrRequest): Promise<OcrResponse> {
  try {
    const response = await apiRequest('POST', '/api/ocr', request);
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || 'OCR processing failed');
    }
    return await response.json();
  } catch (error: any) {
    console.error('OCR error:', error);
    throw new Error(error.message || 'Failed to extract text from image. Please try again.');
  }
}

export async function detectParticipants(conversation: string): Promise<{me: string, them: string}> {
  try {
    const response = await apiRequest('POST', '/api/analyze/detect-names', { conversation });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || 'Failed to detect names');
    }
    return await response.json();
  } catch (error: any) {
    console.error('Name detection error:', error);
    throw new Error(error.message || 'Failed to detect participants. Please enter names manually.');
  }
}

export async function getUserUsage(): Promise<{used: number, limit: number, tier: string}> {
  const response = await fetch('/api/user/usage', {
    credentials: 'include'
  });
  
  if (!response.ok) {
    // Return default for anonymous users
    return { used: 0, limit: 1, tier: 'free' };
  }
  
  return await response.json();
}
