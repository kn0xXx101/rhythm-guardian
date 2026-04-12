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

export async function getUserConversations(userId: string): Promise<SimpleConversation[]> {
  try {
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

    if (convError) {
      console.error('Error fetching conversations:', convError);
      return [];
    }

    const conversationsWithMessages = await Promise.all(
      (conversations || []).map(async (conv) => {
        const { data: lastMessage } = await supabase
          .from('messages')
          .select('content, created_at')
          .eq('conversation_id', conv.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        const { data: unreadMessages } = await supabase
          .from('messages')
          .select('id')
          .eq('conversation_id', conv.id)
          .neq('sender_id', userId)
          .eq('read', false);

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

    return conversationsWithMessages;
  } catch (error) {
    console.error('Error in getUserConversations:', error);
    return [];
  }
}

export async function getConversationMessages(conversationId: string, limit = 50): Promise<SimpleMessage[]> {
  try {
    const { data, error } = await supabase
      .from('messages')
      .select(`id, conversation_id, sender_id, receiver_id, content, created_at,
        sender:profiles!messages_sender_id_fkey(full_name, avatar_url)`)
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(limit);

    if (error) { console.error('Error fetching messages:', error); return []; }

    return (data || []).map((m: any) => ({ ...m, created_at: m.created_at || new Date().toISOString() }));
  } catch (error) {
    console.error('Error in getConversationMessages:', error);
    return [];
  }
}

export async function sendMessage(senderId: string, receiverId: string, content: string): Promise<boolean> {
  try {
    const { error } = await supabase.from('messages').insert({ sender_id: senderId, receiver_id: receiverId, content: content.trim() });
    if (error) { console.error('Error sending message:', error); return false; }
    return true;
  } catch (error) {
    console.error('Error in sendMessage:', error);
    return false;
  }
}

export async function markMessagesRead(conversationId: string, userId: string): Promise<void> {
  try {
    const { error } = await supabase.from('messages')
      .update({ read: true, read_at: new Date().toISOString() })
      .eq('conversation_id', conversationId)
      .neq('sender_id', userId)
      .eq('read', false);
    if (error) console.error('Error marking messages as read:', error);
  } catch (error) {
    console.error('Error in markMessagesRead:', error);
  }
}
