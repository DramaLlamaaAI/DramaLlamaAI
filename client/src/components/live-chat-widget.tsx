import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send, Minimize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface ChatMessage {
  id: string;
  message: string;
  timestamp: Date;
  isUser: boolean;
  isAdmin?: boolean;
}

export function LiveChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  const [userName, setUserName] = useState('');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const chatInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initialize WebSocket connection
  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    const connectWebSocket = () => {
      try {
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          console.log('Live chat WebSocket connected');
          setIsConnected(true);
          
          // Send initial connection message
          ws.send(JSON.stringify({
            type: 'user_connected',
            userName: userName || 'Anonymous User',
            timestamp: new Date().toISOString()
          }));
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            
            if (data.type === 'chat_message') {
              const newMsg: ChatMessage = {
                id: data.id || Date.now().toString(),
                message: data.message,
                timestamp: new Date(data.timestamp),
                isUser: data.isUser || false,
                isAdmin: data.isAdmin || false
              };
              
              setMessages(prev => [...prev, newMsg]);
              
              // Show notification if chat is closed or minimized
              if (!isOpen || isMinimized) {
                setUnreadCount(prev => prev + 1);
                
                // Browser notification for admin messages
                if (data.isAdmin && 'Notification' in window && Notification.permission === 'granted') {
                  new Notification('Drama Llama Support', {
                    body: data.message,
                    icon: '/favicon.ico'
                  });
                }
              }
            } else if (data.type === 'typing') {
              setIsTyping(data.isTyping);
            }
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
          }
        };

        ws.onclose = () => {
          console.log('Live chat WebSocket disconnected');
          setIsConnected(false);
          
          // Attempt to reconnect after 3 seconds
          setTimeout(connectWebSocket, 3000);
        };

        ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          setIsConnected(false);
        };
      } catch (error) {
        console.error('Failed to connect WebSocket:', error);
        setTimeout(connectWebSocket, 3000);
      }
    };

    connectWebSocket();

    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [userName]);

  const sendMessage = () => {
    if (!newMessage.trim() || !wsRef.current || !isConnected) return;

    const message: ChatMessage = {
      id: Date.now().toString(),
      message: newMessage.trim(),
      timestamp: new Date(),
      isUser: true
    };

    // Add message to local state immediately
    setMessages(prev => [...prev, message]);

    // Send via WebSocket
    wsRef.current.send(JSON.stringify({
      type: 'chat_message',
      id: message.id,
      message: message.message,
      timestamp: message.timestamp.toISOString(),
      isUser: true,
      userName: userName || 'Anonymous User'
    }));

    setNewMessage('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const openChat = () => {
    setIsOpen(true);
    setIsMinimized(false);
    setUnreadCount(0);
    setTimeout(() => chatInputRef.current?.focus(), 100);
  };

  const closeChat = () => {
    setIsOpen(false);
    setIsMinimized(false);
  };

  const minimizeChat = () => {
    setIsMinimized(true);
  };

  if (!isOpen) {
    return (
      <div className="fixed bottom-4 left-4 z-[9999]">
        <button
          onClick={openChat}
          data-chat-button="true"
          className="relative bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white rounded-full w-12 h-12 shadow-lg border-0 flex flex-col items-center justify-center transition-all duration-200"
          style={{ 
            background: 'linear-gradient(to right, #ec4899, #f43f5e)',
            boxShadow: '0 4px 14px 0 rgba(0, 0, 0, 0.25)'
          }}
        >
          <MessageCircle className="h-4 w-4 mb-0.5" />
          <span className="text-[10px] font-medium leading-none">Chat</span>
            {unreadCount > 0 && (
              <Badge className="absolute -top-2 -right-2 bg-red-500 text-white min-w-[20px] h-5 rounded-full text-xs">
                {unreadCount > 9 ? '9+' : unreadCount}
              </Badge>
            )}
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 left-4 z-[9999]">
      <Card className={`w-80 shadow-xl transition-all duration-300 ${isMinimized ? 'h-12' : 'h-96'}`}>
        <CardHeader className="p-3 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-t-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              <span className="font-medium">Live Support</span>
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`} />
            </div>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={minimizeChat}
                className="text-white hover:bg-pink-600 p-1 h-6 w-6"
              >
                <Minimize2 className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={closeChat}
                className="text-white hover:bg-pink-600 p-1 h-6 w-6"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </CardHeader>
        
        {!isMinimized && (
          <CardContent className="p-0 h-80 flex flex-col">
            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {messages.length === 0 ? (
                <div className="text-center text-gray-500 text-sm py-8">
                  <MessageCircle className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                  <p>Welcome to Drama Llama Support!</p>
                  <p>Send us a message and we'll respond shortly.</p>
                </div>
              ) : (
                messages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.isUser ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${
                      msg.isUser 
                        ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white' 
                        : msg.isAdmin
                        ? 'bg-green-100 text-green-800 border border-green-200'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {msg.isAdmin && (
                        <div className="text-xs font-medium mb-1 text-green-600">Drama Llama Support</div>
                      )}
                      <div>{msg.message}</div>
                      <div className={`text-xs mt-1 opacity-75 ${
                        msg.isUser ? 'text-pink-100' : 'text-gray-500'
                      }`}>
                        {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                ))
              )}
              
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 text-gray-800 rounded-lg px-3 py-2 text-sm">
                    <div className="flex items-center gap-1">
                      <span>Support is typing</span>
                      <div className="flex gap-1">
                        <div className="w-1 h-1 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                        <div className="w-1 h-1 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                        <div className="w-1 h-1 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="border-t p-3">
              <div className="flex gap-2">
                <Input
                  ref={chatInputRef}
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={isConnected ? "Type your message..." : "Connecting..."}
                  disabled={!isConnected}
                  className="flex-1 text-sm"
                />
                <Button
                  onClick={sendMessage}
                  disabled={!newMessage.trim() || !isConnected}
                  size="sm"
                  className="bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
              {!isConnected && (
                <div className="text-xs text-red-500 mt-1">
                  Connection lost. Attempting to reconnect...
                </div>
              )}
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}