import { supabase } from '@/lib/supabase';

export interface SimpleMessage {
  id: string;
  conversation_id: string | null;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
  sender?: {
    full_name: string;
    avatar_url?: string | null;
  };
}

export interface SimpleConversation {
  id: string;
  participant1_id: string;
  participant2_id: string;
  last_message_at: string | null;
  last_message_preview?: string;
  participant1_name?: string;
  participant1_avatar?: string;
  participant2_name?: string;
  participant2_avatar?: string;
  unread_count?: number;
}

/**
 * Get conversations for a user by querying messages directly
 */
export async function getUserConversations(userId: string): Promise<SimpleConversation[]> {
  try {
    console.log('[getUserConversations] Starting for user:', userId);
    
    // Get all conversations where user is a participant
    const { data: conversations, error: convError } = await supabase
      .from('conversations')
      .select(`
        id,
        participant1_id,
        participant2_id,
        last_message_at,
        participant1:profiles!conversations_participant1_id_fkey(full_name, avatar_url),
        participant2:profiles!conversations_participant2_id_fkey(full_name, avatar_url)
      `)
      .or(`participant1_id.eq.${userId},participant2_id.eq.${userId}`)
      .order('last_message_at', { ascending: false });

    console.log('[getUserConversations] Raw conversations:', conversations);
    console.log('[getUserConversations] Error:', convError);

    if (convError) {
      console.error('Error fetching conversations:', convError);
      return [];
    }

    // Get last message for each conversation
    const conversationsWithMessages = await Promise.all(
      (conversations || []).map(async (conv) => {
        console.log('[getUserConversations] Processing conversation:', conv.id);
        
        const { data: lastMessage } = await supabase
          .from('messages')
          .select('content, created_at')
          .eq('conversation_id', conv.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        console.log('[getUserConversations] Last message for', conv.id, ':', lastMessage);

        // Get unread count
        const { data: unreadMessages } = await supabase
          .from('messages')
          .select('id')
          .eq('conversation_id', conv.id)
          .neq('sender_id', userId)
          .eq('read', false);

        console.log('[getUserConversations] Unread count for', conv.id, ':', unreadMessages?.length);

        return {
          id: conv.id,
          participant1_id: conv.participant1_id,
          participant2_id: conv.participant2_id,
          last_message_at: conv.last_message_at,
          last_message_preview: lastMessage?.content || 'No messages yet',
          participant1_name: (conv.participant1 as any)?.full_name,
          participant1_avatar: (conv.participant1 as any)?.avatar_url,
          participant2_name: (conv.participant2 as any)?.full_name,
          participant2_avatar: (conv.participant2 as any)?.avatar_url,
          unread_count: unreadMessages?.length || 0,
        };
      })
    );

    console.log('[getUserConversations] Final conversations:', conversationsWithMessages);
    return conversationsWithMessages;
  } catch (error) {
    console.error('Error in getUserConversations:', error);
    return [];
  }
}

/**
 * Get messages for a conversation
 */
export async function getConversationMessages(
  conversationId: string,
  limit: number = 50
): Promise<SimpleMessage[]> {
  try {
    const { data, error } = await supabase
      .from('messages')
      .select(`
        id,
        conversation_id,
        sender_id,
        receiver_id,
        content,
        created_at,
        sender:profiles!messages_sender_id_fkey(full_name, avatar_url)
      `)
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(limit);

    if (error) {
      console.error('Error fetching messages:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getConversationMessages:', error);
    return [];
  }
}

/**
 * Send a message (simplified version)
 */
export async function sendMessage(
  senderId: string,
  receiverId: string,
  content: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('messages')
      .insert({
        sender_id: senderId,
        receiver_id: receiverId,
        content: content.trim()
      });

    if (error) {
      console.error('Error sending message:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in sendMessage:', error);
    return false;
  }
}

/**
 * Mark messages as read
 */
export async function markMessagesRead(
  conversationId: string,
  userId: string
): Promise<void> {
  try {
    const { error } = await supabase
      .from('messages')
      .update({ 
        read: true,
        read_at: new Date().toISOString() 
      })
      .eq('conversation_id', conversationId)
      .neq('sender_id', userId)
      .eq('read', false);

    if (error) {
      console.error('Error marking messages as read:', error);
    }
  } catch (error) {
    console.error('Error in markMessagesRead:', error);
  }
}