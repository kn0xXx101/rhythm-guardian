// Chat feature exports
// TODO: Move components, hooks, services, and types here incrementally

// Components (re-exported for now, will move later)
export { ChatHeader } from '@/components/chat/ChatHeader';
export { ChatLayout } from '@/components/chat/ChatLayout';
export { ChatMessages } from '@/components/chat/ChatMessages';
export { ChatSettings } from '@/components/chat/ChatSettings';
export { ContactsList } from '@/components/chat/ContactsList';
export { MessageInput } from '@/components/chat/MessageInput';
export { AdminContactDetail } from '@/components/chat/AdminContactDetail';
export { AdminContactsList } from '@/components/chat/AdminContactsList';
export { HirerContactDetail } from '@/components/chat/HirerContactDetail';
export { MusicianContactDetail } from '@/components/chat/MusicianContactDetail';

// Hooks (re-exported for now, will move later)
export { useMessages, useConversations, useSendMessage, useEditMessage, useDeleteMessage, useMarkMessagesAsRead, useSearchMessages } from '@/hooks/use-messages';

// Services (re-exported for now, will move later)
export { messageService } from '@/services/message';
export { chatMonitorService } from '@/services/chat-monitor';
export { encryptionService } from '@/services/encryption';

// Types (re-exported for now, will move later)
export type { Message, Contact, TypingIndicator, ChatSettings } from '@/types/chat';

