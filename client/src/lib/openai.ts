import { apiRequest } from './queryClient';

// Analysis types
export type AnalysisType = 'chat' | 'message' | 'vent';

// Chat analysis interfaces
export interface ChatAnalysisRequest {
  conversation: string;
  me: string;
  them: string;
}

export interface ChatAnalysisResponse {
  toneAnalysis: {
    overallTone: string;
    emotionalState: Array<{
      emotion: string;
      intensity: number;
    }>;
  };
  redFlags?: Array<{
    type: string;
    description: string;
    severity: number;
  }>;
  communication: {
    patterns?: string[];
    suggestions?: string[];
  };
  dramaScore?: number;
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
  const response = await apiRequest('POST', '/api/analyze/chat', request);
  return await response.json();
}

export async function analyzeMessage(request: MessageAnalysisRequest): Promise<MessageAnalysisResponse> {
  const response = await apiRequest('POST', '/api/analyze/message', request);
  return await response.json();
}

export async function ventMessage(request: VentModeRequest): Promise<VentModeResponse> {
  const response = await apiRequest('POST', '/api/analyze/vent', request);
  return await response.json();
}

export async function processImageOcr(request: OcrRequest): Promise<OcrResponse> {
  const response = await apiRequest('POST', '/api/ocr', request);
  return await response.json();
}

export async function detectParticipants(conversation: string): Promise<{me: string, them: string}> {
  const response = await apiRequest('POST', '/api/analyze/detect-names', { conversation });
  return await response.json();
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
