import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, Send, Bell, BellOff, Users, User, X, Archive, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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

export function ChatManager() {
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
        const wsUrl = `${protocol}//${window.location.host}/ws`;
        
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          console.log('Admin chat WebSocket connected');
          setIsConnected(true);
          ws.send(JSON.stringify({ type: 'admin_login' }));
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            
            if (data.type === 'conversation_ended') {
              // Handle conversation ending from server
              const conversationId = data.conversationId;
              setConversations(prev => prev.filter(conv => conv.id !== conversationId));
              
              if (selectedConversationId === conversationId) {
                setSelectedConversationId(null);
              }
              
              console.log(`Conversation ${conversationId} ended and cleaned up`);
            } else if (data.type === 'chat_message') {
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
    
    setConversations(prev =>
      prev.map(conv =>
        conv.id === conversationId
          ? { ...conv, unreadCount: 0 }
          : conv
      )
    );
  };

  const endConversation = (conversationId: string) => {
    const conversation = conversations.find(c => c.id === conversationId);
    const confirmMessage = `Are you sure you want to end the chat with ${conversation?.userName || 'this user'}? This will permanently delete all message history and cannot be undone.`;
    
    if (window.confirm(confirmMessage)) {
      // Remove conversation from local state
      setConversations(prev => prev.filter(conv => conv.id !== conversationId));
      
      // If this was the selected conversation, clear selection
      if (selectedConversationId === conversationId) {
        setSelectedConversationId(null);
      }
      
      // Notify server to clean up conversation data
      if (wsRef.current && isConnected) {
        wsRef.current.send(JSON.stringify({
          type: 'end_conversation',
          conversationId: conversationId,
          timestamp: new Date().toISOString()
        }));
      }
      
      console.log(`Conversation with ${conversation?.userName} ended and deleted`);
    }
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
    <div className="max-w-6xl mx-auto">
      <div className="mb-6 p-4 bg-gradient-to-r from-pink-50 to-purple-50 rounded-lg border border-pink-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <MessageCircle className="h-6 w-6 text-pink-600" />
            <div>
              <h3 className="font-semibold text-lg text-gray-900">Customer Support Chat</h3>
              <p className="text-sm text-gray-600">Manage live conversations with your customers</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {totalUnread > 0 && (
              <div className="flex items-center gap-2 bg-red-100 text-red-800 px-3 py-1 rounded-full">
                <Bell className="h-4 w-4" />
                <span className="font-medium">{totalUnread} new message{totalUnread > 1 ? 's' : ''}</span>
              </div>
            )}
            
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="text-sm font-medium">
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="flex items-center gap-2"
            >
              {soundEnabled ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
              {soundEnabled ? 'Sound On' : 'Sound Off'}
            </Button>
          </div>
        </div>
      </div>

      <div className="h-[600px] flex border rounded-lg overflow-hidden shadow-lg">
        <div className="w-1/3 border-r flex flex-col bg-white">
          <div className="p-4 border-b bg-gray-50">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-base text-gray-900">Active Conversations</h4>
              {conversations.length > 0 && (
                <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                  {conversations.length}
                </Badge>
              )}
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto">
            {conversations.length === 0 ? (
              <div className="p-6 text-center">
                <Users className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <h5 className="font-medium text-gray-700 mb-2">No conversations yet</h5>
                <p className="text-sm text-gray-500">Customer messages will appear here when they contact support</p>
              </div>
            ) : (
              conversations.map((conv) => (
                <div
                  key={conv.id}
                  onClick={() => selectConversation(conv.id)}
                  className={`p-4 border-b cursor-pointer transition-colors ${
                    selectedConversationId === conv.id 
                      ? 'bg-pink-50 border-l-4 border-l-pink-500' 
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-pink-100 rounded-full flex items-center justify-center">
                        <User className="h-4 w-4 text-pink-600" />
                      </div>
                      <div>
                        <span className="font-medium text-gray-900">{conv.userName}</span>
                        {conv.userEmail && (
                          <div className="text-xs text-gray-500">{conv.userEmail}</div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1">
                      {conv.unreadCount > 0 && (
                        <Badge variant="destructive" className="text-xs">
                          {conv.unreadCount}
                        </Badge>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          endConversation(conv.id);
                        }}
                        className="h-6 w-6 p-0 text-gray-400 hover:text-red-500 hover:bg-red-50"
                        title="End conversation and delete records"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="text-sm text-gray-600 truncate mb-1">{conv.lastMessage}</div>
                  <div className="text-xs text-gray-400">
                    {conv.lastMessageTime.toLocaleString()}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
        
        <div className="w-2/3 flex flex-col bg-white">
          {!selectedConversation ? (
            <div className="flex-1 flex items-center justify-center bg-gray-50">
              <div className="text-center">
                <MessageCircle className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h5 className="font-semibold text-gray-700 mb-2">Select a conversation</h5>
                <p className="text-gray-500">Choose a conversation from the left to start chatting with a customer</p>
              </div>
            </div>
          ) : (
            <>
              <div className="p-4 border-b bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-pink-100 rounded-full flex items-center justify-center">
                      <User className="h-5 w-5 text-pink-600" />
                    </div>
                    <div>
                      <h5 className="font-semibold text-gray-900">{selectedConversation.userName}</h5>
                      {selectedConversation.userEmail && (
                        <p className="text-sm text-gray-600">{selectedConversation.userEmail}</p>
                      )}
                    </div>
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => endConversation(selectedConversation.id)}
                    className="text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
                  >
                    <Archive className="h-4 w-4 mr-2" />
                    End Chat
                  </Button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 bg-white">
                {selectedConversation.messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <MessageCircle className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500">No messages yet in this conversation</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {selectedConversation.messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${message.isAdmin ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-sm lg:max-w-md px-4 py-3 rounded-lg shadow-sm ${
                            message.isAdmin
                              ? 'bg-pink-500 text-white'
                              : 'bg-gray-100 text-gray-900 border'
                          }`}
                        >
                          {!message.isAdmin && (
                            <div className="text-xs font-medium mb-2 text-pink-600">
                              {message.userName}
                            </div>
                          )}
                          <div className="text-sm leading-relaxed">{message.message}</div>
                          <div className={`text-xs mt-2 ${message.isAdmin ? 'text-pink-100' : 'text-gray-500'}`}>
                            {message.timestamp.toLocaleTimeString([], { 
                              hour: '2-digit', 
                              minute: '2-digit',
                              hour12: true 
                            })}
                          </div>
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>

              <div className="p-4 border-t bg-gray-50">
                <div className="flex gap-3">
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder={isConnected ? "Type your response to the customer..." : "Connecting..."}
                    className="flex-1 bg-white"
                    disabled={!isConnected}
                  />
                  <Button
                    onClick={sendMessage}
                    disabled={!newMessage.trim() || !isConnected}
                    className="bg-pink-600 hover:bg-pink-700 px-6"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Send
                  </Button>
                </div>
                
                {!isConnected && (
                  <div className="text-xs text-red-500 mt-2 flex items-center gap-1">
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                    Connection lost. Attempting to reconnect...
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}