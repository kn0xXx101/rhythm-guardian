import { supabase } from '@/lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string | null;
  message_type: string | null;
  file_url: string | null;
  file_name: string | null;
  file_size: number | null;
  file_type: string | null;
  is_edited: boolean | null;
  edited_at: string | null;
  is_deleted: boolean | null;
  deleted_at: string | null;
  reply_to_id: string | null;
  created_at: string | null;
  updated_at: string | null;
  sender?: {
    full_name: string;
    avatar_url?: string | null;
  };
  read_by?: string[];
  reactions?: MessageReaction[];
  reply_to?: any;
}

export interface Conversation {
  id: string | null;
  booking_id: string | null;
  participant_1_id: string | null;
  participant_2_id: string | null;
  last_message_at: string | null;
  last_message_preview: string | null;
  created_at: string | null;
  participant_1_name: string | null;
  participant_1_avatar: string | null;
  participant_2_name: string | null;
  participant_2_avatar: string | null;
  booking_event_type: string | null;
  booking_event_date: string | null;
  unread_count?: number;
}

export interface MessageReaction {
  id: string;
  message_id: string;
  user_id: string;
  reaction: string;
  created_at: string | null;
}

export interface TypingIndicator {
  conversation_id: string;
  user_id: string;
  user_name?: string;
}

/**
 * Get or create a conversation between two users
 */
export async function getOrCreateConversation(
  user1Id: string,
  user2Id: string,
  bookingId?: string
): Promise<string> {
  const { data, error } = await supabase.rpc('get_or_create_conversation', {
    p_user1_id: user1Id,
    p_user2_id: user2Id,
    p_booking_id: bookingId || undefined,
  });

  if (error) throw error;
  return data;
}

/**
 * Get all conversations for current user
 */
export async function getUserConversations(userId: string): Promise<Conversation[]> {
  const { data, error } = await supabase
    .from('conversation_list')
    .select('*')
    .or(`participant_1_id.eq.${userId},participant_2_id.eq.${userId}`)
    .order('last_message_at', { ascending: false });

  if (error) throw error;

  // Get unread counts for each conversation
  const conversationsWithUnread = await Promise.all(
    (data || []).map(async (conv) => {
      const { data: unreadCount } = await supabase.rpc('get_unread_count', {
        p_user_id: userId,
        p_conversation_id: conv.id || '',
      });

      return {
        ...conv,
        unread_count: unreadCount || 0,
      };
    })
  );

  return conversationsWithUnread;
}

/**
 * Get messages for a conversation
 */
export async function getConversationMessages(
  conversationId: string,
  limit: number = 50,
  offset: number = 0
): Promise<Message[]> {
  const { data, error } = await supabase
    .from('messages')
    .select(`
      *,
      sender:profiles!messages_sender_id_fkey(full_name, avatar_url),
      reply_to:messages!messages_reply_to_id_fkey(id, content, sender_id),
      reactions:message_reactions(*)
    `)
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;

  // Get read receipts
  const messagesWithReceipts = await Promise.all(
    (data || []).map(async (msg) => {
      const { data: receipts } = await supabase
        .from('message_read_receipts')
        .select('user_id')
        .eq('message_id', msg.id);

      return {
        ...msg,
        is_edited: msg.is_edited || false,
        is_deleted: msg.is_deleted || false,
        read_by: receipts?.map((r) => r.user_id) || [],
      };
    })
  );

  return messagesWithReceipts.reverse();
}

/**
 * Send a message
 */
export async function sendMessage(
  conversationId: string,
  senderId: string,
  content: string,
  options?: {
    messageType?: 'text' | 'file' | 'image' | 'system';
    fileUrl?: string;
    fileName?: string;
    fileSize?: number;
    fileType?: string;
    replyToId?: string;
  }
): Promise<string> {
  const { data, error } = await supabase.rpc('send_message', {
    p_conversation_id: conversationId,
    p_sender_id: senderId,
    p_content: content,
    p_message_type: options?.messageType || 'text',
    p_file_url: options?.fileUrl || undefined,
    p_file_name: options?.fileName || undefined,
    p_file_size: options?.fileSize || undefined,
    p_file_type: options?.fileType || undefined,
    p_reply_to_id: options?.replyToId || undefined,
  });

  if (error) throw error;
  return data;
}

/**
 * Mark message as read
 */
export async function markMessageRead(messageId: string, userId: string): Promise<void> {
  const { error } = await supabase.rpc('mark_message_read', {
    p_message_id: messageId,
    p_user_id: userId,
  });

  if (error) throw error;
}

/**
 * Mark all messages in conversation as read
 */
export async function markConversationRead(
  conversationId: string,
  userId: string
): Promise<void> {
  const { error } = await supabase.rpc('mark_conversation_read', {
    p_conversation_id: conversationId,
    p_user_id: userId,
  });

  if (error) throw error;
}

/**
 * Update typing indicator
 */
export async function updateTypingIndicator(
  conversationId: string,
  userId: string
): Promise<void> {
  const { error } = await supabase.rpc('update_typing_indicator', {
    p_conversation_id: conversationId,
    p_user_id: userId,
  });

  if (error) throw error;
}

/**
 * Get unread message count
 */
export async function getUnreadCount(
  userId: string,
  conversationId?: string
): Promise<number> {
  const { data, error } = await supabase.rpc('get_unread_count', {
    p_user_id: userId,
    p_conversation_id: conversationId || undefined,
  });

  if (error) throw error;
  return data || 0;
}

/**
 * Edit a message
 */
export async function editMessage(
  messageId: string,
  userId: string,
  newContent: string
): Promise<boolean> {
  const { data, error } = await supabase.rpc('edit_message', {
    p_message_id: messageId,
    p_user_id: userId,
    p_new_content: newContent,
  });

  if (error) throw error;
  return data;
}

/**
 * Delete a message
 */
export async function deleteMessage(messageId: string, userId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('delete_message', {
    p_message_id: messageId,
    p_user_id: userId,
  });

  if (error) throw error;
  return data;
}

/**
 * Add reaction to message
 */
export async function addReaction(
  messageId: string,
  userId: string,
  reaction: string
): Promise<void> {
  const { error } = await supabase.rpc('add_message_reaction', {
    p_message_id: messageId,
    p_user_id: userId,
    p_reaction: reaction,
  });

  if (error) throw error;
}

/**
 * Remove reaction from message
 */
export async function removeReaction(
  messageId: string,
  userId: string,
  reaction: string
): Promise<void> {
  const { error } = await supabase.rpc('remove_message_reaction', {
    p_message_id: messageId,
    p_user_id: userId,
    p_reaction: reaction,
  });

  if (error) throw error;
}

/**
 * Upload file for chat
 */
export async function uploadChatFile(
  file: File,
  conversationId: string
): Promise<{ url: string; name: string; size: number; type: string }> {
  const fileExt = file.name.split('.').pop();
  const fileName = `${conversationId}/${Date.now()}.${fileExt}`;

  const { data, error } = await supabase.storage
    .from('chat-files')
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (error) throw error;

  const { data: urlData } = supabase.storage.from('chat-files').getPublicUrl(data.path);

  return {
    url: urlData.publicUrl,
    name: file.name,
    size: file.size,
    type: file.type,
  };
}

/**
 * Subscribe to new messages in a conversation
 */
export function subscribeToMessages(
  conversationId: string,
  onMessage: (message: Message) => void
): RealtimeChannel {
  const channel = supabase
    .channel(`messages:${conversationId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`,
      },
      async (payload) => {
        // Fetch full message with relations
        const { data } = await supabase
          .from('messages')
          .select(`
            *,
            sender:profiles!messages_sender_id_fkey(full_name, avatar_url)
          `)
          .eq('id', payload.new.id)
          .single();

        if (data) {
          onMessage(data as Message);
        }
      }
    )
    .subscribe();

  return channel;
}

/**
 * Subscribe to message updates (edits, deletes)
 */
export function subscribeToMessageUpdates(
  conversationId: string,
  onUpdate: (message: Message) => void
): RealtimeChannel {
  const channel = supabase
    .channel(`message-updates:${conversationId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`,
      },
      async (payload) => {
        const { data } = await supabase
          .from('messages')
          .select(`
            *,
            sender:profiles!messages_sender_id_fkey(full_name, avatar_url),
            reactions:message_reactions(*)
          `)
          .eq('id', payload.new.id)
          .single();

        if (data) {
          onUpdate(data as any);
        }
      }
    )
    .subscribe();

  return channel;
}

/**
 * Subscribe to typing indicators
 */
export function subscribeToTypingIndicators(
  conversationId: string,
  onTyping: (indicators: TypingIndicator[]) => void
): RealtimeChannel {
  const channel = supabase
    .channel(`typing:${conversationId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'typing_indicators',
        filter: `conversation_id=eq.${conversationId}`,
      },
      async () => {
        // Fetch current typing indicators
        const { data } = await supabase
          .from('typing_indicators')
          .select(`
            *,
            user:profiles!typing_indicators_user_id_fkey(full_name)
          `)
          .eq('conversation_id', conversationId)
          .gt('expires_at', new Date().toISOString());

        if (data) {
          onTyping(
            data.map((d: any) => ({
              conversation_id: d.conversation_id,
              user_id: d.user_id,
              user_name: d.user?.full_name,
            }))
          );
        }
      }
    )
    .subscribe();

  return channel;
}

/**
 * Subscribe to read receipts
 */
export function subscribeToReadReceipts(
  conversationId: string,
  onRead: (messageId: string, userId: string) => void
): RealtimeChannel {
  const channel = supabase
    .channel(`read-receipts:${conversationId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'message_read_receipts',
      },
      (payload) => {
        onRead(payload.new.message_id, payload.new.user_id);
      }
    )
    .subscribe();

  return channel;
}

/**
 * Subscribe to conversation list updates
 */
export function subscribeToConversations(
  userId: string,
  onUpdate: () => void
): RealtimeChannel {
  const channel = supabase
    .channel(`conversations:${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'conversations',
      },
      onUpdate
    )
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
      },
      onUpdate
    )
    .subscribe();

  return channel;
}
