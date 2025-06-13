import React, { createContext, useContext, ReactNode } from 'react';
import { apiRequest, uploadImage } from '../services/api';

interface ApiContextType {
  analyzeChat: (text: string) => Promise<any>;
  analyzeChatImage: (imageUri: string) => Promise<any>;
  generateScript: (situation: string, originalMessage: string) => Promise<any>;
  getSavedScripts: () => Promise<any>;
  saveScript: (scriptData: any) => Promise<any>;
  deleteScript: (scriptId: number) => Promise<any>;
  getUserUsage: () => Promise<any>;
}

const ApiContext = createContext<ApiContextType | undefined>(undefined);

export const useApi = () => {
  const context = useContext(ApiContext);
  if (!context) {
    throw new Error('useApi must be used within an ApiProvider');
  }
  return context;
};

interface ApiProviderProps {
  children: ReactNode;
}

export const ApiProvider: React.FC<ApiProviderProps> = ({ children }) => {
  const analyzeChat = async (text: string) => {
    return await apiRequest('/api/chat/analyze', {
      method: 'POST',
      body: { text },
    });
  };

  const analyzeChatImage = async (imageUri: string) => {
    return await uploadImage(imageUri, '/api/chat/analyze-image');
  };

  const generateScript = async (situation: string, originalMessage: string) => {
    return await apiRequest('/api/script-builder', {
      method: 'POST',
      body: { situation, originalMessage },
    });
  };

  const getSavedScripts = async () => {
    return await apiRequest('/api/scripts');
  };

  const saveScript = async (scriptData: any) => {
    return await apiRequest('/api/scripts', {
      method: 'POST',
      body: scriptData,
    });
  };

  const deleteScript = async (scriptId: number) => {
    return await apiRequest(`/api/scripts/${scriptId}`, {
      method: 'DELETE',
    });
  };

  const getUserUsage = async () => {
    return await apiRequest('/api/user/usage');
  };

  const value: ApiContextType = {
    analyzeChat,
    analyzeChatImage,
    generateScript,
    getSavedScripts,
    saveScript,
    deleteScript,
    getUserUsage,
  };

  return <ApiContext.Provider value={value}>{children}</ApiContext.Provider>;
};