// Enhanced chat types for advanced features
export interface Message {
  id: string;
  senderId: number | string;
  receiverId?: number | string; // Added for Supabase integration
  text: string;
  timestamp: string;
  isSender: boolean;
  isEncrypted?: boolean;
  status?: 'sending' | 'sent' | 'delivered' | 'read' | 'failed'; // Added 'failed' status
  replyTo?: string; // For threading - ID of message being replied to
  replyToMessage?: Message; // Full message object being replied to
  reactions?: MessageReaction[];
  isEdited?: boolean;
  editedAt?: string;
  isDeleted?: boolean; // For soft delete
  flagged?: boolean; // Added for admin monitoring
  flag_reason?: string; // Added for admin monitoring
}

export interface MessageReaction {
  emoji: string;
  userId: string;
  timestamp: string;
}

export interface Contact {
  id: number | string; // Can be UUID (string) or number for compatibility
  name: string;
  image: string;
  lastMessage: string;
  timestamp: string;
  unread: boolean;
  isOnline?: boolean;
  lastSeen?: string;
  isTyping?: boolean;
  publicKey?: string; // For encryption
  [key: string]: any;
}

export interface TypingIndicator {
  contactId: number | string;
  isTyping: boolean;
  timestamp: string;
}

export interface ChatNotification {
  id: string;
  title: string;
  body: string;
  icon?: string;
  contactId: number | string;
  messageId: string;
  timestamp: string;
}

export interface EncryptionKeys {
  publicKey: string;
  privateKey: string;
}

export interface ChatSettings {
  notifications: {
    enabled: boolean;
    sound: boolean;
    desktop: boolean;
    preview: boolean;
  };
  encryption: {
    enabled: boolean;
    autoEncrypt: boolean;
  };
  privacy: {
    readReceipts: boolean;
    onlineStatus: boolean;
    typingIndicators: boolean;
  };
}
