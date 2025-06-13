import * as SecureStore from 'expo-secure-store';

const API_BASE_URL = 'https://77f6210a-876e-4707-b36b-d35568d5f4a1-00-1pmrqgq45ycpw.spock.replit.dev';

interface ApiRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  body?: any;
  headers?: Record<string, string>;
}

export const apiRequest = async (endpoint: string, options: ApiRequestOptions = {}) => {
  const { method = 'GET', body, headers = {} } = options;
  
  const token = await SecureStore.getItemAsync('authToken');
  
  const config: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    credentials: 'include',
  };

  if (token) {
    config.headers = {
      ...config.headers,
      'Authorization': `Bearer ${token}`,
    };
  }

  if (body) {
    config.body = JSON.stringify(body);
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(errorData.message || `HTTP ${response.status}`);
  }

  return await response.json();
};

export const uploadImage = async (imageUri: string, endpoint: string) => {
  const token = await SecureStore.getItemAsync('authToken');
  
  const formData = new FormData();
  formData.append('image', {
    uri: imageUri,
    type: 'image/jpeg',
    name: 'chat-screenshot.jpg',
  } as any);

  const config: RequestInit = {
    method: 'POST',
    body: formData,
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    credentials: 'include',
  };

  if (token) {
    config.headers = {
      ...config.headers,
      'Authorization': `Bearer ${token}`,
    };
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Upload failed' }));
    throw new Error(errorData.message || `HTTP ${response.status}`);
  }

  return await response.json();
};