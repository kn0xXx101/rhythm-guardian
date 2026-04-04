import { supabase } from '@/lib/supabase';
import type {
  FlaggedChat,
  ChatMessage,
  MonitoredMessage,
} from '@/components/dashboard/chat-monitor/types';
import type { Message as ChatMessageType } from '@/types/chat';
import type { Database } from '@/types/supabase';

type DbMessage = Database['public']['Tables']['messages']['Row'];
type DbProfile = Database['public']['Tables']['profiles']['Row'];

interface MessageWithProfiles {
  id: string;
  content: string;
  created_at: string;
  flag_reason: string | null;
  flagged: boolean;
  sender: { id: string; full_name: string };
  receiver: { id: string; full_name: string };
}

export class ChatMonitorService {
  // Subscribe to all messages in real-time
  subscribeToMessages(callback: (message: MonitoredMessage) => void) {
    return supabase
      .channel('messages')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          const msg = payload.new as DbMessage;

          // Map DB row to our chat message shape
          const formatted: MonitoredMessage = {
            id: msg.id,
            senderId: msg.sender_id || '',
            receiverId: msg.receiver_id || '',
            text: msg.content || '',
            timestamp: msg.created_at || new Date().toISOString(),
            isSender: false,
            isEncrypted: false,
            status: 'sent',
            flagged: msg.flagged ?? false,
            flag_reason: msg.flag_reason ?? undefined,
            // Monitoring-specific fields
            contactId: msg.receiver_id || '',
            contactName: undefined,
          };

          callback(formatted);
        }
      )
      .subscribe();
  }

  // Fetch flagged messages
  async getFlaggedChats(): Promise<FlaggedChat[]> {
    try {
      const { data: messages, error } = await supabase
        .from('messages')
        .select(
          `
          id,
          sender_id,
          receiver_id,
          content,
          created_at,
          flag_reason
        `
        )
        .eq('flagged', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching flagged chats:', error);
        // Return empty array instead of throwing
        return [];
      }

      if (!messages || messages.length === 0) {
        return [];
      }

      const uniqueUserIds = new Set<string>();
      messages.forEach((msg) => {
        if (msg.sender_id) uniqueUserIds.add(msg.sender_id);
        if (msg.receiver_id) uniqueUserIds.add(msg.receiver_id);
      });

      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', Array.from(uniqueUserIds));

      if (profileError) {
        console.error('Error fetching profiles:', profileError);
      }

      const profileMap = new Map((profiles || []).map((p) => [p.user_id, p.full_name]));

      return messages.map((message) => ({
        id: message.id,
        participants: [message.sender_id, message.receiver_id],
        participantNames: [
          profileMap.get(message.sender_id) || 'Unknown User',
          profileMap.get(message.receiver_id) || 'Unknown User',
        ],
        flaggedMessage: message.content,
        flaggedTime: message.created_at,
        severity: this.determineSeverity(message.flag_reason || undefined),
        status: 'pending',
      }));
    } catch (error) {
      console.error('Unexpected error in getFlaggedChats:', error);
      return [];
    }
  }

  // Fetch chat history for a specific conversation
  async getChatHistory(senderId: string, receiverId: string): Promise<ChatMessage[]> {
    const { data: messages, error } = await supabase
      .from('messages')
      .select(
        `
        id,
        sender_id,
        receiver_id,
        content,
        created_at,
        flagged
      `
      )
      .or(
        `and(sender_id.eq.${senderId},receiver_id.eq.${receiverId}),and(sender_id.eq.${receiverId},receiver_id.eq.${senderId})`
      )
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching chat history:', error);
      throw error;
    }

    if (!messages || messages.length === 0) {
      return [];
    }

    const userIds = [senderId, receiverId];
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('user_id, full_name')
      .in('user_id', userIds);

    if (profileError) {
      console.error('Error fetching profiles for chat history:', profileError);
    }

    const profileMap = new Map((profiles || []).map((p) => [p.user_id, p.full_name]));

    return messages.map((message, index) => ({
      id: index + 1,
      sender: profileMap.get(message.sender_id) || 'Unknown User',
      message: message.content,
      timestamp: message.created_at,
      flagged: message.flagged || false,
    }));
  }

  // Update message flag status
  async updateMessageFlag(messageId: string, flagged: boolean, reason?: string) {
    const { error } = await supabase
      .from('messages')
      .update({
        flagged,
        flag_reason: reason,
        updated_at: new Date().toISOString(),
      })
      .eq('id', messageId);

    if (error) throw error;
  }

  // Send a warning message to the sender of the flagged message
  async sendWarningToSender(messageId: string, warningText?: string) {
    // Get the current authenticated user (admin)
    const {
      data: { user: currentUser },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !currentUser?.id) {
      throw authError || new Error('Admin user not authenticated');
    }

    // Fetch sender for the flagged message
    const { data: message, error: fetchError } = await supabase
      .from('messages')
      .select('sender_id')
      .eq('id', messageId)
      .single();

    if (fetchError || !message?.sender_id) {
      throw fetchError || new Error('Sender not found for the flagged message');
    }

    const warningMessage =
      warningText || 'Your recent message was flagged. Please adhere to community guidelines.';

    // Create a warning message directed to the original sender from the admin
    const { error: insertError } = await supabase.from('messages').insert([
      {
        sender_id: currentUser.id, // Use the current admin's user ID
        receiver_id: message.sender_id,
        content: warningMessage,
        flagged: false,
        read: false,
      },
    ]);

    if (insertError) throw insertError;
  }

  // Resolve a flagged chat
  async resolveFlaggedChat(messageId: string) {
    const { error } = await supabase
      .from('messages')
      .update({
        flagged: false,
        flag_reason: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', messageId);

    if (error) throw error;
  }

  // Helper function to determine severity based on flag reason
  private determineSeverity(reason?: string): 'low' | 'medium' | 'high' | 'critical' {
    if (!reason) return 'low';

    const lowKeywords = ['inappropriate', 'rude', 'unprofessional'];
    const mediumKeywords = ['harassment', 'spam', 'scam'];
    const highKeywords = ['threat', 'fraud', 'hate'];
    const criticalKeywords = ['violence', 'illegal', 'danger'];

    reason = reason.toLowerCase();

    if (criticalKeywords.some((word) => reason!.includes(word))) return 'critical';
    if (highKeywords.some((word) => reason!.includes(word))) return 'high';
    if (mediumKeywords.some((word) => reason!.includes(word))) return 'medium';
    return 'low';
  }
}

export const chatMonitorService = new ChatMonitorService();
