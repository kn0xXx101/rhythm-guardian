import type { Message } from '@/types/chat';

// Types for flagged chats
export interface FlaggedChat {
  id: string;
  participants: string[];
  participantNames?: string[];
  flaggedMessage: string;
  flaggedTime: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'resolved';
}

// Types for chat messages with monitoring
export interface MonitoredMessage extends Message {
  contactId: number | string;
  contactName?: string;
}

// Type for chat message history
export interface ChatMessage {
  id: number;
  sender: string;
  message: string;
  timestamp: string;
  flagged?: boolean;
}
