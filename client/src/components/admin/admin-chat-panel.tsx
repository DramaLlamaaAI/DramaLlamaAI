import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, Send, Bell, BellOff, Users } from 'lucide-react';
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
  conversationId?: string;
}

interface ChatConversation {
  id: string;
  userName: string;
  userEmail?: string;
  lastMessage: string;
  lastMessageTime: Date;
  unreadCount: number;
  status: 'active' | 'closed';
}

export function AdminChatPanel() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [totalUnread, setTotalUnread] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const chatInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initialize notification sound
  useEffect(() => {
    // Create a simple notification sound using Web Audio API
    const createNotificationSound = () => {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1);
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
    };

    if (soundEnabled) {
      audioRef.current = { play: createNotificationSound } as any;
    }
  }, [soundEnabled]);

  // Initialize WebSocket connection for admin
  useEffect(() => {
    if (!user?.isAdmin) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    const connectWebSocket = () => {
      try {
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          console.log('Admin chat WebSocket connected');
          setIsConnected(true);
          
          // Identify as admin
          ws.send(JSON.stringify({
            type: 'admin_login',
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
                isAdmin: data.isAdmin || false,
                userName: data.userName
              };
              
              setMessages(prev => [...prev, newMsg]);
              
              // Play notification sound for user messages
              if (data.isUser && soundEnabled && audioRef.current) {
                try {
                  audioRef.current.play();
                } catch (e) {
                  console.log('Audio notification failed:', e);
                }
              }
              
              // Show browser notification for user messages
              if (data.isUser && 'Notification' in window && Notification.permission === 'granted') {
                new Notification(`New message from ${data.userName || 'User'}`, {
                  body: data.message,
                  icon: '/favicon.ico',
                  badge: '/favicon.ico'
                });
              }
              
              // Update unread count for user messages
              if (data.isUser) {
                setTotalUnread(prev => prev + 1);
              }
            } else if (data.type === 'user_count') {
              // Handle user count updates if needed
            }
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
          }
        };

        ws.onclose = () => {
          console.log('Admin chat WebSocket disconnected');
          setIsConnected(false);
          
          // Attempt to reconnect after 3 seconds
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

    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [user?.isAdmin, soundEnabled]);

  const sendMessage = () => {
    if (!newMessage.trim() || !wsRef.current || !isConnected) return;

    const message: ChatMessage = {
      id: Date.now().toString(),
      message: newMessage.trim(),
      timestamp: new Date(),
      isUser: false,
      isAdmin: true,
      userName: 'Drama Llama Support'
    };

    // Add message to local state immediately
    setMessages(prev => [...prev, message]);

    // Send via WebSocket
    wsRef.current.send(JSON.stringify({
      type: 'chat_message',
      id: message.id,
      message: message.message,
      timestamp: message.timestamp.toISOString(),
      isUser: false,
      isAdmin: true,
      userName: 'Drama Llama Support'
    }));

    setNewMessage('');
    setTotalUnread(0); // Reset unread count when admin sends message
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const toggleSound = () => {
    setSoundEnabled(!soundEnabled);
  };

  const clearUnread = () => {
    setTotalUnread(0);
  };

  // Don't render if user is not admin
  if (!user?.isAdmin) {
    return null;
  }

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-lg">
      <CardHeader className="p-4 bg-green-600 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <MessageCircle className="h-5 w-5" />
            <span className="font-medium">Live Chat Admin Panel</span>
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-300' : 'bg-red-300'}`} />
            {totalUnread > 0 && (
              <Badge className="bg-red-500 text-white">
                {totalUnread} new
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-green-100">
              <Users className="h-4 w-4" />
              <span className="text-sm">0 online</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleSound}
              className="text-white hover:bg-green-700 p-1 h-8 w-8"
            >
              {soundEnabled ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
            </Button>
            {totalUnread > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearUnread}
                className="text-white hover:bg-green-700 text-xs"
              >
                Mark Read
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-0 h-96 flex flex-col">
        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
          {messages.length === 0 ? (
            <div className="text-center text-gray-500 text-sm py-8">
              <MessageCircle className="h-8 w-8 mx-auto mb-2 text-gray-400" />
              <p>Waiting for customer messages...</p>
              <p className="text-xs">You'll be notified instantly when users send messages</p>
            </div>
          ) : (
            messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.isAdmin ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${
                  msg.isAdmin 
                    ? 'bg-green-600 text-white' 
                    : 'bg-white text-gray-800 border border-gray-200 shadow-sm'
                }`}>
                  {!msg.isAdmin && (
                    <div className="text-xs font-medium mb-1 text-blue-600">
                      {msg.userName || 'User'}
                    </div>
                  )}
                  <div>{msg.message}</div>
                  <div className={`text-xs mt-1 opacity-75 ${
                    msg.isAdmin ? 'text-green-100' : 'text-gray-500'
                  }`}>
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            ))
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input */}
        <div className="border-t bg-white p-4">
          <div className="flex gap-2">
            <Input
              ref={chatInputRef}
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={isConnected ? "Type your response..." : "Connecting..."}
              disabled={!isConnected}
              className="flex-1"
            />
            <Button
              onClick={sendMessage}
              disabled={!newMessage.trim() || !isConnected}
              className="bg-green-600 hover:bg-green-700"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          {!isConnected && (
            <div className="text-xs text-red-500 mt-2">
              Connection lost. Attempting to reconnect...
            </div>
          )}
          <div className="text-xs text-gray-500 mt-2">
            {soundEnabled ? 'Sound notifications enabled' : 'Sound notifications disabled'} • 
            Press Enter to send • Shift+Enter for new line
          </div>
        </div>
      </CardContent>
    </Card>
  );
}