// Simple Chat Service - Works with simple messages table structure
// No conversations table, just direct messages between users

import { supabase } from '@/lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface SimpleMessage {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  read: boolean;
  read_at: string | null;
  created_at: string;
  sender?: {
    full_name: string;
    avatar_url?: string;
  };
  receiver?: {
    full_name: string;
    avatar_url?: string;
  };
}

export interface SimpleConversation {
  other_user_id: string;
  other_user_name: string;
  other_user_avatar: string | null;
  last_message: string;
  last_message_at: string;
  unread_count: number;
}

/**
 * Get all conversations for current user
 * Groups messages by conversation partner
 */
export async function getUserConversations(userId: string): Promise<SimpleConversation[]> {
  try {
    // Get all messages where user is sender or receiver
    const { data: messages, error } = await (supabase as any)
      .from('messages')
      .select(`
        id,
        sender_id,
        receiver_id,
        content,
        read,
        created_at,
        sender:profiles!messages_sender_id_fkey(full_name, avatar_url),
        receiver:profiles!messages_receiver_id_fkey(full_name, avatar_url)
      `)
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .order('created_at', { ascending: false })
      .limit(1000);

    if (error) throw error;

    // Group by conversation partner
    const conversationMap = new Map<string, SimpleConversation>();

    messages?.forEach((msg: any) => {
      const isReceiver = msg.receiver_id === userId;
      const otherUserId = isReceiver ? msg.sender_id : msg.receiver_id;
      const otherUser = isReceiver ? msg.sender : msg.receiver;

      if (!conversationMap.has(otherUserId)) {
        conversationMap.set(otherUserId, {
          other_user_id: otherUserId,
          other_user_name: otherUser?.full_name || 'Unknown User',
          other_user_avatar: otherUser?.avatar_url || null,
          last_message: msg.content,
          last_message_at: msg.created_at,
          unread_count: 0,
        });
      }

      // Count unread messages
      if (!msg.read && msg.receiver_id === userId) {
        const conv = conversationMap.get(otherUserId)!;
        conv.unread_count++;
      }
    });

    return Array.from(conversationMap.values()).sort(
      (a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime()
    );
  } catch (error) {
    console.error('Error loading conversations:', error);
    return [];
  }
}

/**
 * Get messages between current user and another user
 */
export async function getConversationMessages(
  userId: string,
  otherUserId: string
): Promise<SimpleMessage[]> {
  try {
    const { data, error } = await (supabase as any)
      .from('messages')
      .select(`
        id,
        sender_id,
        receiver_id,
        content,
        read,
        read_at,
        created_at,
        sender:profiles!messages_sender_id_fkey(full_name, avatar_url),
        receiver:profiles!messages_receiver_id_fkey(full_name, avatar_url)
      `)
      .or(
        `and(sender_id.eq.${userId},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${userId})`
      )
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error loading messages:', error);
    return [];
  }
}

/**
 * Send a message
 */
export async function sendMessage(
  senderId: string,
  receiverId: string,
  content: string
): Promise<SimpleMessage | null> {
  try {
    const { data, error } = await (supabase as any)
      .from('messages')
      .insert({
        sender_id: senderId,
        receiver_id: receiverId,
        content,
        read: false,
      })
      .select(`
        id,
        sender_id,
        receiver_id,
        content,
        read,
        read_at,
        created_at,
        sender:profiles!messages_sender_id_fkey(full_name, avatar_url),
        receiver:profiles!messages_receiver_id_fkey(full_name, avatar_url)
      `)
      .single();

    if (error) throw error;

    // Create notification for receiver (handled by notification service subscription)
    // No need to manually create here as the subscription will handle it

    return data;
  } catch (error) {
    console.error('Error sending message:', error);
    return null;
  }
}

/**
 * Mark messages as read
 */
export async function markConversationRead(
  userId: string,
  otherUserId: string
): Promise<void> {
  try {
    await (supabase as any)
      .from('messages')
      .update({ read: true, read_at: new Date().toISOString() })
      .eq('sender_id', otherUserId)
      .eq('receiver_id', userId)
      .eq('read', false);
  } catch (error) {
    console.error('Error marking messages as read:', error);
  }
}

/**
 * Subscribe to new messages for a conversation
 */
export function subscribeToMessages(
  userId: string,
  otherUserId: string,
  onMessage: (message: SimpleMessage) => void
): RealtimeChannel {
  const channel = supabase
    .channel(`simple-messages:${userId}:${otherUserId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
      },
      async (payload: any) => {
        const msg = payload.new;
        
        // Only process if message is part of this conversation
        if (
          (msg.sender_id === userId && msg.receiver_id === otherUserId) ||
          (msg.sender_id === otherUserId && msg.receiver_id === userId)
        ) {
          // Fetch full message with user details
          const { data } = await (supabase as any)
            .from('messages')
            .select(`
              id,
              sender_id,
              receiver_id,
              content,
              read,
              read_at,
              created_at,
              sender:profiles!messages_sender_id_fkey(full_name, avatar_url),
              receiver:profiles!messages_receiver_id_fkey(full_name, avatar_url)
            `)
            .eq('id', msg.id)
            .single();

          if (data) {
            onMessage(data);
          }
        }
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
    .channel(`simple-conversations:${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `or(sender_id.eq.${userId},receiver_id.eq.${userId})`,
      },
      onUpdate
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'messages',
        filter: `or(sender_id.eq.${userId},receiver_id.eq.${userId})`,
      },
      onUpdate
    )
    .subscribe();

  return channel;
}

/**
 * Get unread message count
 */
export async function getUnreadCount(userId: string): Promise<number> {
  try {
    const { count, error } = await (supabase as any)
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('receiver_id', userId)
      .eq('read', false);

    if (error) throw error;
    return count || 0;
  } catch (error) {
    console.error('Error getting unread count:', error);
    return 0;
  }
}