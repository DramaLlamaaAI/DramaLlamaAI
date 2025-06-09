import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, Send, Bell, BellOff, Users, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/use-auth';

interface ChatMessage {
  id: string;
  message: string;
  timestamp: Date;
  isUser: boolean;
  isAdmin?: boolean;
  userName?: string;
  userEmail?: string;
  conversationId: string;
}

interface Conversation {
  id: string;
  userName: string;
  userEmail?: string;
  lastMessage: string;
  lastMessageTime: Date;
  unreadCount: number;
  status: 'active' | 'closed';
  messages: ChatMessage[];
}

export function SimpleChatPanel() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const selectedConversation = conversations.find(c => c.id === selectedConversationId);
  const totalUnread = conversations.reduce((sum, conv) => sum + conv.unreadCount, 0);

  useEffect(() => {
    scrollToBottom();
  }, [selectedConversation?.messages]);

  useEffect(() => {
    if (!user?.isAdmin) return;

    const connectWebSocket = () => {
      try {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}`;
        
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          console.log('Admin chat WebSocket connected');
          setIsConnected(true);
          ws.send(JSON.stringify({ type: 'admin_connected' }));
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            
            if (data.type === 'chat_message') {
              const message: ChatMessage = {
                id: data.id || Date.now().toString(),
                message: data.message,
                timestamp: new Date(data.timestamp),
                isUser: data.isUser,
                isAdmin: data.isAdmin,
                userName: data.userName || 'Anonymous',
                userEmail: data.userEmail,
                conversationId: data.userEmail || data.conversationId || `anon_${Date.now()}`
              };

              setConversations(prev => {
                const conversationId = message.conversationId;
                const existingConvIndex = prev.findIndex(c => c.id === conversationId);
                
                if (existingConvIndex >= 0) {
                  // Update existing conversation
                  const updated = [...prev];
                  const conv = { ...updated[existingConvIndex] };
                  conv.messages = [...conv.messages, message];
                  conv.lastMessage = message.message;
                  conv.lastMessageTime = message.timestamp;
                  
                  if (message.isUser && selectedConversationId !== conversationId) {
                    conv.unreadCount += 1;
                  }
                  
                  updated[existingConvIndex] = conv;
                  return updated;
                } else {
                  // Create new conversation
                  const newConv: Conversation = {
                    id: conversationId,
                    userName: message.userName || 'Anonymous',
                    userEmail: message.userEmail,
                    lastMessage: message.message,
                    lastMessageTime: message.timestamp,
                    unreadCount: message.isUser ? 1 : 0,
                    status: 'active',
                    messages: [message]
                  };
                  return [newConv, ...prev];
                }
              });

              // Play notification sound for user messages
              if (message.isUser && soundEnabled) {
                const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
                const oscillator = audioContext.createOscillator();
                const gainNode = audioContext.createGain();
                
                oscillator.connect(gainNode);
                gainNode.connect(audioContext.destination);
                oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
                oscillator.type = 'sine';
                gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
                oscillator.start();
                oscillator.stop(audioContext.currentTime + 0.2);
              }
            }
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
          }
        };

        ws.onclose = () => {
          console.log('Admin chat WebSocket disconnected');
          setIsConnected(false);
          setTimeout(connectWebSocket, 3000);
        };

        ws.onerror = (error) => {
          console.error('Admin WebSocket error:', error);
          setIsConnected(false);
        };
      } catch (error) {
        console.error('Failed to connect admin WebSocket:', error);
        setTimeout(connectWebSocket, 3000);
      }
    };

    connectWebSocket();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [user?.isAdmin, soundEnabled, selectedConversationId]);

  const sendMessage = () => {
    if (!newMessage.trim() || !wsRef.current || !isConnected || !selectedConversation) return;

    const message: ChatMessage = {
      id: Date.now().toString(),
      message: newMessage.trim(),
      timestamp: new Date(),
      isUser: false,
      isAdmin: true,
      userName: 'Drama Llama Support',
      conversationId: selectedConversation.id
    };

    // Send via WebSocket
    wsRef.current.send(JSON.stringify({
      type: 'chat_message',
      id: message.id,
      message: message.message,
      timestamp: message.timestamp.toISOString(),
      isUser: false,
      isAdmin: true,
      userName: 'Drama Llama Support',
      conversationId: selectedConversation.id
    }));

    // Add to local state
    setConversations(prev => 
      prev.map(conv => 
        conv.id === selectedConversation.id
          ? {
              ...conv,
              messages: [...conv.messages, message],
              lastMessage: message.message,
              lastMessageTime: message.timestamp,
              unreadCount: 0
            }
          : conv
      )
    );

    setNewMessage('');
  };

  const selectConversation = (conversationId: string) => {
    setSelectedConversationId(conversationId);
    
    // Mark conversation as read
    setConversations(prev =>
      prev.map(conv =>
        conv.id === conversationId
          ? { ...conv, unreadCount: 0 }
          : conv
      )
    );
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (!user?.isAdmin) {
    return null;
  }

  return (
    <div className="h-96 flex border rounded-lg overflow-hidden">
      {/* Conversations Sidebar */}
      <div className="w-1/3 border-r flex flex-col bg-gray-50">
        <div className="p-3 border-b bg-white">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-sm">Conversations</h4>
            {totalUnread > 0 && (
              <Badge variant="destructive" className="text-xs">
                {totalUnread}
              </Badge>
            )}
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <div className="p-4 text-center text-gray-500 text-sm">
              No conversations yet
            </div>
          ) : (
            conversations.map((conv) => (
              <div
                key={conv.id}
                onClick={() => selectConversation(conv.id)}
                className={`p-3 border-b cursor-pointer hover:bg-gray-100 ${
                  selectedConversationId === conv.id ? 'bg-pink-50 border-l-4 border-l-pink-500' : ''
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-sm flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {conv.userName}
                  </span>
                  {conv.unreadCount > 0 && (
                    <Badge variant="destructive" className="text-xs">
                      {conv.unreadCount}
                    </Badge>
                  )}
                </div>
                {conv.userEmail && (
                  <div className="text-xs text-gray-500 mb-1">{conv.userEmail}</div>
                )}
                <div className="text-xs text-gray-600 truncate">{conv.lastMessage}</div>
                <div className="text-xs text-gray-400 mt-1">
                  {conv.lastMessageTime.toLocaleTimeString()}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      
      {/* Chat Area */}
      <div className="w-2/3 flex flex-col">
        {/* Chat Header */}
        <div className="flex items-center justify-between p-3 border-b bg-white">
          <div className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4 text-pink-600" />
            <span className="font-medium text-sm">
              {selectedConversation 
                ? selectedConversation.userName
                : 'Select a conversation'
              }
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="p-1"
            >
              {soundEnabled ? <Bell className="h-3 w-3" /> : <BellOff className="h-3 w-3" />}
            </Button>
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-3 bg-gray-50">
          {!selectedConversation ? (
            <div className="flex items-center justify-center h-full text-gray-500">
              Select a conversation to view messages
            </div>
          ) : selectedConversation.messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-500">
              No messages yet
            </div>
          ) : (
            <div className="space-y-3">
              {selectedConversation.messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.isAdmin ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-xs lg:max-w-md px-3 py-2 rounded-lg ${
                      message.isAdmin
                        ? 'bg-pink-500 text-white'
                        : 'bg-white border'
                    }`}
                  >
                    <div className="text-sm">{message.message}</div>
                    <div className={`text-xs mt-1 ${message.isAdmin ? 'text-pink-100' : 'text-gray-500'}`}>
                      {message.timestamp.toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Message Input */}
        {selectedConversation && (
          <div className="p-3 border-t bg-white">
            <div className="flex gap-2">
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your response..."
                className="flex-1"
                disabled={!isConnected}
              />
              <Button
                onClick={sendMessage}
                disabled={!newMessage.trim() || !isConnected}
                className="bg-pink-600 hover:bg-pink-700"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}