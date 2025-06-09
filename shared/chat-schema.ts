import { z } from 'zod';

export const chatConversationSchema = z.object({
  id: z.string(),
  userId: z.string().optional(),
  userEmail: z.string().optional(),
  userName: z.string().default('Anonymous'),
  status: z.enum(['active', 'closed']).default('active'),
  lastMessage: z.string().optional(),
  lastMessageTime: z.date().optional(),
  unreadCount: z.number().default(0),
  createdAt: z.date(),
  updatedAt: z.date()
});

export const chatMessageSchema = z.object({
  id: z.string(),
  conversationId: z.string(),
  message: z.string(),
  isAdmin: z.boolean().default(false),
  senderName: z.string().default('Anonymous'),
  timestamp: z.date(),
  read: z.boolean().default(false)
});

export type ChatConversation = z.infer<typeof chatConversationSchema>;
export type ChatMessage = z.infer<typeof chatMessageSchema>;