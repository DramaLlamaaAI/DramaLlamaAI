import { apiRequest } from './queryClient';

// Analysis types
export type AnalysisType = 'chat' | 'message' | 'vent-mode';

// Chat analysis interfaces
export interface DateFilter {
  startDate?: string;  // ISO string format
  endDate?: string;    // ISO string format
}

export interface ChatAnalysisRequest {
  conversation: string;
  me: string;
  them: string;
  tier?: string;
  dateFilter?: DateFilter;
  conversationType?: 'two_person' | 'group_chat';
  participants?: string[];
  extraData?: {
    isGroupChat?: boolean;
    groupParticipants?: string[];
    [key: string]: any;
  };
}

export interface EvasionInstance {
  type: string;
  participant: string;
  example: string;
  context?: string;
  text?: string;  // For compatibility with rendering
  from?: string;   // For compatibility with rendering
}

export interface ChatAnalysisResponse {
  psychologicalProfile?: {
    [participant: string]: {
      behavior: string;
      emotionalState: string;
      riskIndicators: string;
    };
  };
  toneAnalysis: {
    overallTone: string;
    emotionalState?: Array<{
      emotion: string;
      intensity: number;
    }>;
    participantTones?: {
      [key: string]: string;
    };
  };
  // These properties exist at both levels for backward compatibility
  emotionalState?: Array<{
    emotion: string;
    intensity: number;
  }>;
  participantTones?: {
    [key: string]: string;
  };
  // Evasion detection
  evasionDetection?: {
    detected: boolean;
    analysisTitle?: string;
    patterns?: string[];
    details?: {
      topicShifting?: EvasionInstance[];
      questionDodging?: EvasionInstance[];
      nonCommittal?: EvasionInstance[];
      deflection?: EvasionInstance[];
      avoidance?: EvasionInstance[];
      refusalToEngage?: EvasionInstance[];
    };
  };
  // Conflict dynamics
  conflictDynamics?: {
    summary: string;
    participants: {
      [name: string]: {
        tendency: 'escalates' | 'de-escalates' | 'mixed';
        examples?: string[];
        score?: number; // 0-100 scale, higher means more de-escalating
      };
    };
    interaction?: string;
    recommendations?: string[];
  };
  // Red flags and related fields
  redFlags?: Array<{
    type: string;
    description: string;
    severity: number;
    participant?: string;
    quote?: string;
    context?: string;
    examples?: Array<{
      text: string;
      from: string;
    }>;
    impact?: string;
    recommendedAction?: string;
    behavioralPattern?: string;
    progression?: string;
  }>;
  redFlagsCount?: number;
  redFlagTypes?: string[];
  
  // Health score - merged with the one defined below to avoid conflicts
  
  // Communication styles for Personal tier and above
  communicationStyles?: {
    [participant: string]: string;
  };
  
  // Conflict contributions for Personal tier
  conflictContributions?: {
    [participant: string]: string;
  };
  
  // Power dynamics analysis for Pro tier
  powerDynamics?: {
    summary: string;
    details?: {
      [participant: string]: string;
    };
  };
  
  // Message dominance analysis for Pro tier
  messageDominance?: {
    summary: string;
    participantStats?: {
      [participant: string]: {
        messageCount: number;
        averageLength: number;
        controlScore: number;
      };
    };
  };
  
  // Participant summary cards for Instant Deep Dive tier
  participantSummary?: {
    [participant: string]: {
      style: string;
      roleInTension: string;
    };
  };
  redFlagsDetected?: boolean;
  sampleQuotes?: {[key: string]: string[]};
  communication?: {
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
  tensionContributions?: {   // Individual contributions to tension
    [participant: string]: string[]; // List of specific tension-causing behaviors by participant
  };
  tensionMeaning?: string;   // Explanation of what the tension analysis means
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

// De-escalate mode interfaces
export interface DeEscalateRequest {
  message: string;
}

export interface DeEscalateResponse {
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

export async function ventMessage(request: DeEscalateRequest): Promise<DeEscalateResponse> {
  try {
    const response = await apiRequest('POST', '/api/analyze/de-escalate', request);
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

export async function detectGroupParticipants(conversation: string): Promise<string[]> {
  try {
    // Local participant detection for WhatsApp group chats
    const lines = conversation.split('\n');
    const participantRegex = /\[.*?\] (.*?):/;
    const foundParticipants = new Set<string>();
    
    for (const line of lines) {
      const match = line.match(participantRegex);
      if (match && match[1]) {
        foundParticipants.add(match[1].trim());
      }
    }
    
    const participantsList = Array.from(foundParticipants);
    
    if (participantsList.length === 0) {
      throw new Error('No participants detected in the conversation');
    }
    
    return participantsList;
  } catch (error: any) {
    console.error('Group participant detection error:', error);
    throw new Error(error.message || 'Failed to detect group participants. Please check your conversation format.');
  }
}

export async function getUserUsage(): Promise<{used: number, limit: number, tier: string}> {
  // Read developer mode settings from localStorage if available
  let headers: HeadersInit = {};
  
  if (typeof window !== 'undefined') {
    const isDevMode = localStorage.getItem('drama_llama_dev_mode') === 'true';
    if (isDevMode) {
      const devTier = localStorage.getItem('drama_llama_dev_tier') || 'free';
      headers['x-dev-mode'] = 'true';
      headers['x-dev-tier'] = devTier;
    }
  }
  
  const response = await fetch('/api/user/usage', {
    credentials: 'include',
    headers
  });
  
  if (!response.ok) {
    // Return default for anonymous users
    return { used: 0, limit: 1, tier: 'free' };
  }
  
  return await response.json();
}
