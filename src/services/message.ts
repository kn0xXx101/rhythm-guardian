import { supabase } from '@/lib/supabase';
import type { Message } from '@/types/chat';
import { aiAssistantService, AI_ASSISTANT_ID } from '@/services/ai-assistant';

class MessageService {
  /**
   * Fetch messages for a conversation between two users
   */
  async getMessages(contactId: string | number, userId: string): Promise<Message[]> {
    try {
      const contactIdStr = String(contactId);

      // Handle AI Assistant conversations (no DB storage)
      if (contactIdStr === AI_ASSISTANT_ID) {
        return []; // AI messages are handled in-memory by ChatContext
      }

      // Fetch messages where user is sender or receiver
      const { data: sentMessages, error: sentError } = await supabase
        .from('messages')
        .select(
          'id, sender_id, receiver_id, booking_id, content, attachments, read, read_at, flagged, flag_reason, reply_to, is_deleted, is_edited, edited_at, created_at, updated_at'
        )
        .eq('sender_id', userId)
        .eq('receiver_id', contactIdStr)
        .eq('is_deleted', false)
        .order('created_at', { ascending: true });

      const { data: receivedMessages, error: receivedError } = await supabase
        .from('messages')
        .select(
          'id, sender_id, receiver_id, booking_id, content, attachments, read, read_at, flagged, flag_reason, reply_to, is_deleted, is_edited, edited_at, created_at, updated_at'
        )
        .eq('sender_id', contactIdStr)
        .eq('receiver_id', userId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: true });

      if (sentError && receivedError) {
        throw sentError || receivedError;
      }

      // Combine and deduplicate messages
      const sentMsgs = sentMessages || [];
      const receivedMsgs = receivedMessages || [];
      const messageMap = new Map<string, any>();

      [...sentMsgs, ...receivedMsgs].forEach((msg) => {
        messageMap.set(msg.id, msg);
      });

      const data = Array.from(messageMap.values()).sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );

      // First pass: create all messages
      const messageMapForReply = new Map<string, Message>();
      const formattedMessages: Message[] = data.map((msg: any) => {
        const formattedMsg: Message = {
          id: msg.id,
          senderId: msg.sender_id,
          receiverId: msg.receiver_id,
          text: msg.content,
          timestamp: msg.created_at,
          isSender: msg.sender_id === userId,
          isEncrypted: false,
          status: msg.read ? 'read' : 'sent',
          replyTo: msg.reply_to || undefined,
          replyToMessage: undefined, // Will be populated in second pass
          isEdited: msg.is_edited || false,
          editedAt: msg.edited_at || undefined,
          isDeleted: msg.is_deleted || false,
          flagged: msg.flagged || false,
          flag_reason: msg.flag_reason || undefined,
        };
        messageMapForReply.set(msg.id, formattedMsg);
        return formattedMsg;
      });

      // Second pass: populate replyToMessage references
      formattedMessages.forEach((msg) => {
        if (msg.replyTo) {
          const repliedMessage = messageMapForReply.get(msg.replyTo);
          if (repliedMessage) {
            msg.replyToMessage = repliedMessage;
          }
        }
      });

      return formattedMessages;
    } catch (error) {
      console.error('Error fetching messages:', error);
      throw error;
    }
  }

  /**
   * Send a new message
   */
  async sendMessage(
    contactId: string | number,
    text: string,
    userId: string,
    replyTo?: string
  ): Promise<Message> {
    try {
      if (!text.trim()) {
        throw new Error('Message text cannot be empty');
      }

      const receiverId = typeof contactId === 'string' ? contactId : contactId.toString();

      // Handle AI Assistant messages (no DB storage)
      if (receiverId === AI_ASSISTANT_ID) {
        throw new Error('AI Assistant messages should be handled via ChatContext');
      }

      const newMessage: any = {
        sender_id: userId,
        receiver_id: receiverId,
        content: text,
        read: false,
      };

      if (replyTo) {
        newMessage.reply_to = replyTo;
      }

      const { data, error } = await supabase
        .from('messages')
        .insert([newMessage])
        .select(
          'id, sender_id, receiver_id, booking_id, content, attachments, read, read_at, flagged, flag_reason, reply_to, is_deleted, is_edited, edited_at, created_at, updated_at'
        )
        .single();

      if (error) throw error;

      const formattedMessage: Message = {
        id: data.id,
        senderId: data.sender_id,
        receiverId: data.receiver_id,
        text: data.content,
        timestamp: data.created_at,
        isSender: true,
        isEncrypted: false,
        status: 'sent',
        replyTo: data.reply_to || undefined,
        isEdited: data.is_edited || false,
        editedAt: data.edited_at || undefined,
        isDeleted: data.is_deleted || false,
      };

      return formattedMessage;
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  /**
   * Edit an existing message
   */
  async editMessage(messageId: string, newContent: string, userId: string): Promise<void> {
    try {
      if (!newContent.trim()) {
        throw new Error('Message text cannot be empty');
      }

      // Verify the message belongs to the user
      const { data: existingMessage, error: fetchError } = await supabase
        .from('messages')
        .select('sender_id')
        .eq('id', messageId)
        .single();

      if (fetchError) throw fetchError;
      if (existingMessage.sender_id !== userId) {
        throw new Error('You can only edit your own messages');
      }

      const { error } = await supabase
        .from('messages')
        .update({
          content: newContent,
          is_edited: true,
          edited_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', messageId);

      if (error) throw error;
    } catch (error) {
      console.error('Error editing message:', error);
      throw error;
    }
  }

  /**
   * Delete (soft delete) a message
   */
  async deleteMessage(messageId: string, userId: string): Promise<void> {
    try {
      // Verify the message belongs to the user
      const { data: existingMessage, error: fetchError } = await supabase
        .from('messages')
        .select('sender_id')
        .eq('id', messageId)
        .single();

      if (fetchError) throw fetchError;
      if (existingMessage.sender_id !== userId) {
        throw new Error('You can only delete your own messages');
      }

      const { error } = await supabase
        .from('messages')
        .update({
          is_deleted: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', messageId);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting message:', error);
      throw error;
    }
  }

  /**
   * Mark messages as read
   */
  async markAsRead(messageIds: string[], userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('messages')
        .update({
          read: true,
          read_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .in('id', messageIds)
        .eq('receiver_id', userId)
        .eq('read', false);

      if (error) throw error;
    } catch (error) {
      console.error('Error marking messages as read:', error);
      throw error;
    }
  }

  /**
   * Get all conversations for a user (returns list of contact IDs with last message)
   */
  async getConversations(
    userId: string
  ): Promise<Array<{ contactId: string; lastMessage: Message; unreadCount: number }>> {
    try {
      // Get all messages where user is sender or receiver, grouped by conversation
      const { data: sentMessages } = await supabase
        .from('messages')
        .select('id, sender_id, receiver_id, content, created_at, read')
        .eq('sender_id', userId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false });

      const { data: receivedMessages } = await supabase
        .from('messages')
        .select('id, sender_id, receiver_id, content, created_at, read')
        .eq('receiver_id', userId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false });

      const allMessages = [...(sentMessages || []), ...(receivedMessages || [])];

      // Group by contact ID and get the latest message for each conversation
      const conversationsMap = new Map<string, { lastMessage: any; unreadCount: number }>();

      allMessages.forEach((msg: any) => {
        const contactId = msg.sender_id === userId ? msg.receiver_id : msg.sender_id;

        if (!conversationsMap.has(contactId)) {
          conversationsMap.set(contactId, { lastMessage: msg, unreadCount: 0 });
        }

        const conversation = conversationsMap.get(contactId)!;

        // Update if this is a more recent message
        if (new Date(msg.created_at) > new Date(conversation.lastMessage.created_at)) {
          conversation.lastMessage = msg;
        }

        // Count unread messages (only received messages that are unread)
        if (msg.receiver_id === userId && !msg.read) {
          conversation.unreadCount++;
        }
      });

      // Convert to array and format messages
      return Array.from(conversationsMap.entries()).map(
        ([contactId, { lastMessage, unreadCount }]) => ({
          contactId,
          lastMessage: {
            id: lastMessage.id,
            senderId: lastMessage.sender_id,
            receiverId: lastMessage.receiver_id,
            text: lastMessage.content,
            timestamp: lastMessage.created_at,
            isSender: lastMessage.sender_id === userId,
            status: lastMessage.read ? 'read' : 'sent',
          } as Message,
          unreadCount,
        })
      );
    } catch (error) {
      console.error('Error fetching conversations:', error);
      throw error;
    }
  }

  /**
   * Search messages by content for a user
   */
  async searchMessages(userId: string, query: string): Promise<Message[]> {
    try {
      if (!query.trim()) return [];

      const searchTerm = query.trim().toLowerCase();

      // Search in messages where user is sender or receiver
      const { data: sentMessages } = await supabase
        .from('messages')
        .select('id, sender_id, receiver_id, content, created_at, read')
        .eq('sender_id', userId)
        .eq('is_deleted', false)
        .ilike('content', `%${searchTerm}%`)
        .order('created_at', { ascending: false })
        .limit(50);

      const { data: receivedMessages } = await supabase
        .from('messages')
        .select('id, sender_id, receiver_id, content, created_at, read')
        .eq('receiver_id', userId)
        .eq('is_deleted', false)
        .ilike('content', `%${searchTerm}%`)
        .order('created_at', { ascending: false })
        .limit(50);

      const allMessages = [...(sentMessages || []), ...(receivedMessages || [])];

      // Deduplicate and format
      const messageMap = new Map<string, any>();
      allMessages.forEach((msg: any) => {
        messageMap.set(msg.id, msg);
      });

      return Array.from(messageMap.values())
        .slice(0, 20) // Limit to 20 results
        .map((msg: any) => ({
          id: msg.id,
          senderId: msg.sender_id,
          receiverId: msg.receiver_id,
          text: msg.content,
          timestamp: msg.created_at,
          isSender: msg.sender_id === userId,
          status: msg.read ? 'read' : 'sent',
        } as Message));
    } catch (error) {
      console.error('Error searching messages:', error);
      throw error;
    }
  }
}

export const messageService = new MessageService();
