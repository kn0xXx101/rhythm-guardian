import React, { createContext, useContext, useState, useEffect } from 'react';
import type { Message, Contact, TypingIndicator, ChatSettings } from '@/types/chat';
import { encryptionService } from '@/services/encryption';
import { notificationService } from '@/services/notifications';
import { getSettings } from '@/api/settings';
import { aiAssistantService, AI_ASSISTANT_ID } from '@/services/ai-assistant';

interface ChatContextType {
  messages: Message[];
  sendMessage: (
    contactId: number | string,
    message: string,
    encrypt?: boolean,
    replyTo?: string
  ) => Promise<void>;
  replyMessage: (
    contactId: number | string,
    message: string,
    replyToMessageId: string,
    encrypt?: boolean
  ) => Promise<void>;
  editMessage: (messageId: string, newContent: string) => Promise<void>;
  deleteMessage: (messageId: string) => Promise<void>;
  setActiveContactId: (id: number | string) => void;
  activeContactId: number | string | null;
  typingIndicators: TypingIndicator[];
  setTyping: (contactId: number | string, isTyping: boolean) => void;
  chatSettings: ChatSettings;
  updateChatSettings: (settings: Partial<ChatSettings>) => void;
  isEncryptionEnabled: boolean;
  initializeEncryption: () => Promise<boolean>;
  contacts: Contact[];
  updateContactStatus: (contactId: number | string, updates: Partial<Contact>) => void;
  messagingEnabled: boolean;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

import { supabase } from '@/lib/supabase';

// Admin monitoring system - simplified without heavy real-time subscriptions
class AdminMonitorSystem {
  private listeners: Array<(message: Message, contactId: number | string) => void> = [];

  public subscribe(callback: (message: Message, contactId: number | string) => void) {
    this.listeners.push(callback);

    return () => {
      this.listeners = this.listeners.filter((listener) => listener !== callback);
    };
  }

  public async captureMessage(message: Message, contactId: number | string) {
    this.listeners.forEach((listener) => listener(message, contactId));
  }
}

export const adminMonitorSystem = new AdminMonitorSystem();

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [messages, setMessages] = useState<Record<string | number, Message[]>>({});
  const [activeContactId, setActiveContactId] = useState<number | string | null>(null);
  const [typingIndicators, setTypingIndicators] = useState<TypingIndicator[]>([]);
  const [isEncryptionEnabled, setIsEncryptionEnabled] = useState<boolean>(false);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [messagingEnabled, setMessagingEnabled] = useState<boolean>(true);
  const typingChannelsRef = React.useRef<Record<string | number, any>>({});
  const typingTimeoutsRef = React.useRef<Record<string | number, NodeJS.Timeout>>({});
  const [chatSettings, setChatSettings] = useState<ChatSettings>({
    notifications: {
      enabled: true,
      sound: true,
      desktop: true,
      preview: true,
    },
    encryption: {
      enabled: false,
      autoEncrypt: false,
    },
    privacy: {
      readReceipts: true,
      onlineStatus: true,
      typingIndicators: true,
    },
  });

  // Load platform settings to check if messaging is enabled
  useEffect(() => {
    const loadPlatformSettings = async () => {
      try {
        console.log('Loading platform settings...');
        const settings = await getSettings();
        console.log('Settings loaded:', settings);
        console.log('Chat communication settings:', settings.chatCommunication);
        console.log('Messaging enabled:', settings.chatCommunication.messagingEnabled);
        setMessagingEnabled(settings.chatCommunication.messagingEnabled ?? true);
      } catch (error) {
        console.error('Failed to load platform settings:', error);
        // Default to enabled if we can't load settings
        setMessagingEnabled(true);
      }
    };

    loadPlatformSettings();

    // Set up interval to check settings every 30 seconds (for real-time updates when admin changes settings)
    const intervalId = setInterval(loadPlatformSettings, 30000);

    return () => clearInterval(intervalId);
  }, []);

  // Initialize services on mount
  useEffect(() => {
    const initializeServices = async () => {
      // Initialize notifications
      try {
        await notificationService.initialize();
      } catch (error) {
        console.error('Failed to initialize notifications:', error);
      }

      // Initialize encryption if enabled
      if (chatSettings.encryption.enabled) {
        try {
          const hasKeys = await encryptionService.loadKeys();
          if (!hasKeys) {
            await encryptionService.initializeEncryption();
            await encryptionService.storeKeys();
          }
          setIsEncryptionEnabled(true);
        } catch (error) {
          console.error('Failed to initialize encryption:', error);
        }
      }
    };

    initializeServices();
  }, [chatSettings.encryption.enabled]);

  // Global message listener for notifications (all incoming messages)
  useEffect(() => {
    let notificationChannel: any = null;

    let cleanup: (() => void) | null = null;

    const setupNotificationListener = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // Start polling for admin responses every 5 seconds with better logging
      const pollForAdminResponses = async () => {
        try {
          console.log('🔍 Checking for admin responses for user:', user.id);
          const responses = await aiAssistantService.checkForAdminResponses(user.id);
          
          console.log('📋 Admin response check result:', responses);
          
          if (responses.hasNewResponses) {
            console.log(`✅ Found ${responses.responses.length} new admin responses`);
            
            // Relay each admin response to the AI Assistant chat
            for (const response of responses.responses) {
              console.log('📨 Relaying admin response:', response);
              
              const event = new CustomEvent('admin-response-received', {
                detail: {
                  ticket_id: response.ticket_id,
                  admin_name: response.admin_name,
                  message: response.message,
                  timestamp: response.timestamp,
                }
              });
              
              window.dispatchEvent(event);
            }
          } else {
            console.log('📭 No new admin responses found');
          }
        } catch (error) {
          console.error('❌ Error checking for admin responses:', error);
        }
      };

      // Initial check
      console.log('🚀 Starting admin response monitoring for user:', user.id);
      pollForAdminResponses();
      
      // Set up polling every 5 seconds (more frequent for better responsiveness)
      const pollInterval = setInterval(pollForAdminResponses, 5000);

      // Listen for admin responses to support tickets
      const handleAdminResponse = (event: CustomEvent) => {
        const { admin_name, message } = event.detail;
        
        console.log('🎯 Received admin response event:', event.detail);
        
        // Add admin message to AI Assistant conversation
        const adminMessage: Message = {
          id: `admin-response-${Date.now()}-${Math.random()}`,
          senderId: AI_ASSISTANT_ID,
          receiverId: user.id,
          text: `👨‍💼 **${admin_name} (Administrator):**\n\n${message}\n\n---\n💬 You can continue chatting here - I'll relay your messages to the admin. Session expires in 5 minutes if no response.`,
          timestamp: new Date().toISOString(),
          isSender: false,
          status: 'sent',
        };

        console.log('💬 Adding admin message to AI Assistant chat:', adminMessage);

        setMessages((prev) => {
          const existing = prev[AI_ASSISTANT_ID] || [];
          return {
            ...prev,
            [AI_ASSISTANT_ID]: [...existing, adminMessage],
          };
        });

        // Show notification
        if (chatSettings.notifications.enabled) {
          console.log('🔔 Showing notification for admin response');
          notificationService.notifyNewMessage(
            `Admin Response`,
            `${admin_name}: ${message.substring(0, 100)}${message.length > 100 ? '...' : ''}`,
            AI_ASSISTANT_ID,
            adminMessage.id
          );
        }
      };

      // Add event listener for admin responses
      window.addEventListener('admin-response-received', handleAdminResponse as EventListener);

      // Cleanup function will remove listeners and clear polling
      cleanup = () => {
        window.removeEventListener('admin-response-received', handleAdminResponse as EventListener);
        clearInterval(pollInterval);
      };

      // Subscribe to all messages where user is the receiver
      notificationChannel = supabase
        .channel(`notifications:${user.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `receiver_id=eq.${user.id}`,
          },
          async (payload) => {
            const msg = payload.new as any;

            // Skip soft-deleted messages
            if (msg.is_deleted) {
              return;
            }

            // Skip if this message is from the active contact (user is viewing the conversation)
            const activeContactStr = activeContactId ? String(activeContactId) : null;
            if (activeContactStr && msg.sender_id === activeContactStr) {
              return;
            }

            // Only show notifications if enabled in settings
            if (!chatSettings.notifications.enabled || !chatSettings.notifications.desktop) {
              return;
            }

            try {
              // Fetch sender profile to get name and avatar
              const { data: senderProfile } = await supabase
                .from('profiles')
                .select('full_name, avatar_url')
                .eq('user_id', msg.sender_id)
                .single();

              const senderName = senderProfile?.full_name || 'Unknown User';
              const senderImage = senderProfile?.avatar_url || undefined;

              // Show notification
              await notificationService.notifyNewMessage(
                senderName,
                msg.content || '',
                msg.sender_id,
                msg.id,
                senderImage
              );

              // Play sound if enabled
              if (chatSettings.notifications.sound) {
                notificationService.playNotificationSound();
              }
            } catch (error) {
              console.error('Failed to show message notification:', error);
            }
          }
        )
        .subscribe();
    };

    setupNotificationListener();

    return () => {
      if (notificationChannel) {
        notificationChannel.unsubscribe();
      }
      // Cleanup admin response listener
      if (cleanup) {
        cleanup();
      }
    };
  }, [activeContactId, chatSettings.notifications]);

  // Fetch messages for active contact
  useEffect(() => {
    if (!activeContactId) return;

    const fetchMessages = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        // Normalize contact ID to string for consistent comparison
        const contactIdStr = String(activeContactId);

        // AI Assistant conversations are handled in-memory (no DB storage)
        if (contactIdStr === AI_ASSISTANT_ID) {
          // Messages for AI assistant are stored in state only
          // Initialize with welcome message if empty
          const contactIdKey = String(activeContactId);
          setMessages((prev) => {
            if (!prev[contactIdKey] || prev[contactIdKey].length === 0) {
              const welcomeMessage: Message = {
                id: 'ai-welcome',
                senderId: AI_ASSISTANT_ID,
                receiverId: user.id,
                text: "👋 **Welcome to Rhythm Guardian Support!**\n\nI'm your AI Assistant, here to help you navigate the platform and resolve any issues. You can ask me about:\n\n• **Booking**: How to find and hire musicians\n• **Profiles**: Setting up your musician or hirer account\n• **Payments**: Transaction fees and secure processing\n• **Support**: Check your ticket status or talk to a human admin\n\nHow can I help you today?",
                timestamp: new Date().toISOString(),
                isSender: false,
                status: 'sent',
              };
              return {
                ...prev,
                [contactIdKey]: [welcomeMessage],
              };
            }
            return prev;
          });
          return;
        }

        // Fetch messages for this specific conversation using two separate queries
        // This approach is more reliable than complex OR queries
        const { data: sentMessages, error: sentError } = await (supabase as any)
          .from('messages')
          .select(
            'id, sender_id, receiver_id, booking_id, content, attachments, read, read_at, flagged, flag_reason, reply_to, is_deleted, is_edited, edited_at, created_at, updated_at'
          )
          .eq('sender_id', user.id)
          .eq('receiver_id', contactIdStr)
          .eq('is_deleted', false)
          .order('created_at', { ascending: true });

        const { data: receivedMessages, error: receivedError } = await (supabase as any)
          .from('messages')
          .select(
            'id, sender_id, receiver_id, booking_id, content, attachments, read, read_at, flagged, flag_reason, reply_to, is_deleted, is_edited, edited_at, created_at, updated_at'
          )
          .eq('sender_id', contactIdStr)
          .eq('receiver_id', user.id)
          .eq('is_deleted', false)
          .order('created_at', { ascending: true });

        if (sentError) {
          console.error('Error fetching sent messages:', sentError);
        }
        if (receivedError) {
          console.error('Error fetching received messages:', receivedError);
        }

        if (sentError && receivedError) {
          throw sentError || receivedError;
        }

        // Combine and sort all messages, removing duplicates by ID
        const sentMsgs = sentMessages || [];
        const receivedMsgs = receivedMessages || [];
        const messageMap = new Map<string, any>();

        [...sentMsgs, ...receivedMsgs].forEach((msg) => {
          messageMap.set(msg.id, msg);
        });

        const data = Array.from(messageMap.values()).sort(
          (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );

        // Messages are already filtered for soft-deleted and deduplicated above
        const conversationMessages = data || [];

        // First pass: create all messages
        const messageMapForReply = new Map<string, Message>();
        const formattedMessages: Message[] = conversationMessages.map((msg: any) => {
          const formattedMsg: Message = {
            id: msg.id,
            senderId: msg.sender_id,
            receiverId: msg.receiver_id,
            text: msg.content,
            timestamp: msg.created_at,
            isSender: msg.sender_id === user.id,
            isEncrypted: false,
            status: 'sent',
            replyTo: msg.reply_to || undefined,
            replyToMessage: undefined, // Will be populated in second pass
            isEdited: msg.is_edited || false,
            editedAt: msg.edited_at || undefined,
            isDeleted: msg.is_deleted || false,
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

        // Normalize contactId to string for consistent key usage
        const contactIdKey = String(activeContactId);
        setMessages((prev) => ({
          ...prev,
          [contactIdKey]: formattedMessages,
        }));
      } catch (error) {
        console.error('Error fetching messages:', error);
        // Set empty array on error to prevent UI showing stale data
        const contactIdKey = String(activeContactId);
        setMessages((prev) => ({
          ...prev,
          [contactIdKey]: [],
        }));
      }
    };

    fetchMessages();

    let channel: any;
    const setupChannel = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      channel = supabase
        .channel(`messages:${activeContactId}:${user.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `or(sender_id.eq.${user.id},receiver_id.eq.${user.id})`,
          },
          async (payload) => {
            const msg = payload.new as any;
            if (!activeContactId) return;
            const contactIdStr = String(activeContactId);
            // Only process messages in the active conversation
            if (
              (msg.sender_id === user.id && msg.receiver_id === contactIdStr) ||
              (msg.sender_id === contactIdStr && msg.receiver_id === user.id)
            ) {
              // Skip soft-deleted messages
              if (msg.is_deleted) {
                return;
              }

              const contactIdKey = String(activeContactId);
              setMessages((prev) => {
                const existing = prev[contactIdKey] || [];

                // Avoid duplicates
                if (existing.find((m) => m.id === msg.id)) {
                  return prev;
                }

                // Find the replyToMessage if reply_to exists
                const replyToMessage = msg.reply_to
                  ? existing.find((m) => m.id === msg.reply_to)
                  : undefined;

                const formattedMessage: Message = {
                  id: msg.id,
                  senderId: msg.sender_id,
                  receiverId: msg.receiver_id,
                  text: msg.content,
                  timestamp: msg.created_at,
                  isSender: msg.sender_id === user.id,
                  isEncrypted: false,
                  status: 'sent',
                  replyTo: msg.reply_to || undefined,
                  replyToMessage: replyToMessage,
                  isEdited: msg.is_edited || false,
                  editedAt: msg.edited_at || undefined,
                  isDeleted: msg.is_deleted || false,
                };

                // Update replyToMessage for any existing messages that might be replying to this new one
                const updatedExisting = existing.map((m) =>
                  m.replyTo === formattedMessage.id ? { ...m, replyToMessage: formattedMessage } : m
                );

                return {
                  ...prev,
                  [contactIdKey]: [...updatedExisting, formattedMessage],
                };
              });
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'messages',
            filter: `or(sender_id.eq.${user.id},receiver_id.eq.${user.id})`,
          },
          (payload) => {
            const msg = payload.new as any;
            if (!activeContactId) return;
            const contactIdKey = String(activeContactId);
            const contactIdStr = String(activeContactId);
            // Only process messages in the active conversation
            if (
              !(
                (msg.sender_id === user.id && msg.receiver_id === contactIdStr) ||
                (msg.sender_id === contactIdStr && msg.receiver_id === user.id)
              )
            ) {
              return;
            }

            // Handle edits and soft deletes
            setMessages((prev) => {
              const existing = prev[contactIdKey] || [];
              return {
                ...prev,
                [contactIdKey]: existing.map((m) => {
                  if (m.id === msg.id) {
                    // Handle soft delete - mark as deleted but keep in list
                    if (msg.is_deleted) {
                      return { ...m, isDeleted: true, text: 'This message was deleted' };
                    }
                    // Handle edits
                    if (msg.is_edited) {
                      return {
                        ...m,
                        text: msg.content,
                        isEdited: true,
                        editedAt: msg.edited_at || undefined,
                      };
                    }
                    // Handle other updates (like content changes)
                    return { ...m, text: msg.content };
                  }
                  return m;
                }),
              };
            });
          }
        )
        .subscribe();
    };

    setupChannel();

    return () => {
      if (channel) {
        channel.unsubscribe();
      }
    };
  }, [activeContactId]);

  // Send a new message
  const sendMessage = async (
    contactId: number | string,
    text: string,
    encrypt: boolean = false,
    replyTo?: string
  ) => {
    if (!text.trim()) return;

    // Check if messaging is enabled
    if (!messagingEnabled) {
      throw new Error(
        'Messaging feature is currently disabled by the administrator. Please contact support if you need assistance.'
      );
    }

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('You must be logged in to send messages');
      }

      const receiverId = typeof contactId === 'string' ? contactId : contactId.toString();

      // Handle AI Assistant messages
      if (receiverId === AI_ASSISTANT_ID) {
        await handleAIAssistantMessage(user.id, text, contactId);
        return;
      }

      const newMessage: any = {
        sender_id: user.id,
        receiver_id: receiverId,
        content: text,
        read: false,
      };

      // Include reply_to if provided
      if (replyTo) {
        newMessage.reply_to = replyTo;
      }

      const { data, error } = await (supabase as any)
        .from('messages')
        .insert([newMessage])
        .select(
          'id, sender_id, receiver_id, booking_id, content, attachments, read, read_at, flagged, flag_reason, reply_to, is_deleted, is_edited, edited_at, created_at, updated_at'
        )
        .single();

      if (error) throw error;

      if (!data) {
        throw new Error('Failed to create message');
      }

      if (!data.sender_id || !data.receiver_id || !data.created_at) {
        console.error('Invalid message data from server', data);
        throw new Error('Invalid message data from server');
      }

      // Find the replyToMessage if reply_to exists
      let replyToMessage: Message | undefined = undefined;
      if (data.reply_to) {
        const contactIdKey = String(contactId);
        const existingMessages = messages[contactIdKey] || [];
        replyToMessage = existingMessages.find((m) => m.id === data.reply_to);
      }

      const formattedMessage: Message = {
        id: data.id,
        senderId: data.sender_id,
        receiverId: data.receiver_id,
        text: data.content,
        timestamp: data.created_at,
        isSender: true,
        isEncrypted: encrypt,
        status: 'sent',
        replyTo: data.reply_to || undefined,
        replyToMessage: replyToMessage,
        isEdited: data.is_edited || false,
        editedAt: data.edited_at || undefined,
        isDeleted: data.is_deleted || false,
      };

      // Normalize contactId to string for consistent key usage
      const contactIdKey = String(contactId);
      setMessages((prev) => {
        const existing = prev[contactIdKey] || [];
        // Avoid duplicates
        if (existing.find((m) => m.id === formattedMessage.id)) {
          return prev;
        }
        return {
          ...prev,
          [contactIdKey]: [...existing, formattedMessage],
        };
      });
    } catch (error) {
      console.error('Failed to send message:', error);
      throw error;
    }
  };

  // Handle AI Assistant conversation
  const handleAIAssistantMessage = async (
    userId: string,
    text: string,
    contactId: number | string
  ) => {
    const contactIdKey = String(contactId);

    // Get conversation history for context
    const existingMessages = messages[contactIdKey] || [];
    const conversationHistory = existingMessages
      .slice(-10) // Last 10 messages for context
      .map((m) => `${m.isSender ? 'You' : 'AI'}: ${m.text}`);

    // Add user message to UI immediately
    const userMessage: Message = {
      id: `ai-user-${Date.now()}-${Math.random()}`,
      senderId: userId,
      receiverId: AI_ASSISTANT_ID,
      text: text,
      timestamp: new Date().toISOString(),
      isSender: true,
      status: 'sent',
    };

    setMessages((prev) => {
      const existing = prev[contactIdKey] || [];
      return {
        ...prev,
        [contactIdKey]: [...existing, userMessage],
      };
    });

    // Process with AI assistant
    const aiResponse = await aiAssistantService.processMessage(text, conversationHistory, userId);

    // Handle special actions from AI
    if (aiResponse.action === 'list_tickets' || aiResponse.action === 'check_status') {
      const ticketsResult = await aiAssistantService.listUserTickets(userId);
      
      let responseText = aiResponse.response + '\n\n';
      
      if (ticketsResult.success && ticketsResult.tickets.length > 0) {
        responseText += 'Here are your active support requests:\n\n';
        ticketsResult.tickets.forEach((ticket: any) => {
          const status = ticket.status === 'in_progress' ? '🟠 In Progress' : '🟢 Open';
          const session = ticket.session_status === 'active' ? '⚡ Active Session' : '⌛ Waiting for Admin';
          const time = ticket.minutes_remaining > 0 ? ` (${ticket.minutes_remaining}m left)` : '';
          
          responseText += `🎫 **${ticket.subject}**\n`;
          responseText += `Status: ${status}\n`;
          responseText += `Session: ${session}${time}\n`;
          responseText += `Created: ${new Date(ticket.created_at).toLocaleDateString()}\n\n`;
        });
        responseText += 'You can ask me to "connect to admin" if you want to follow up on any of these.';
      } else if (ticketsResult.success) {
        responseText += "You don't have any active support tickets at the moment. If you're experiencing an issue, just let me know and I can create one for you!";
      } else {
        responseText += "⚠️ I had some trouble retrieving your tickets. Please try again in a moment.";
      }

      const statusMessage: Message = {
        id: `ai-status-${Date.now()}-${Math.random()}`,
        senderId: AI_ASSISTANT_ID,
        receiverId: userId,
        text: responseText,
        timestamp: new Date().toISOString(),
        isSender: false,
        status: 'sent',
      };

      setMessages((prev) => {
        const existing = prev[contactIdKey] || [];
        return {
          ...prev,
          [contactIdKey]: [...existing, statusMessage],
        };
      });
      return;
    }

    if (aiResponse.action === 'close_ticket') {
      const ticketsResult = await aiAssistantService.listUserTickets(userId);
      
      let responseText = aiResponse.response + '\n\n';
      
      if (ticketsResult.success && ticketsResult.tickets.length > 0) {
        // If there's only one ticket, we can offer to close it
        if (ticketsResult.tickets.length === 1) {
          const ticket = ticketsResult.tickets[0];
          responseText += `I found one active ticket: **"${ticket.subject}"**. Would you like me to close this for you?\n\n(This feature is coming soon in a UI update, for now please ask an admin to close it if needed.)`;
        } else {
          responseText += 'I found multiple active tickets. Which one would you like to close?\n\n';
          ticketsResult.tickets.forEach((ticket: any, index: number) => {
            responseText += `${index + 1}. **${ticket.subject}**\n`;
          });
          responseText += '\nPlease specify the ticket subject you want to close.';
        }
      } else if (ticketsResult.success) {
        responseText += "You don't have any active support tickets to close.";
      } else {
        responseText += "⚠️ I had some trouble retrieving your tickets. Please try again in a moment.";
      }

      const closeMessage: Message = {
        id: `ai-close-${Date.now()}-${Math.random()}`,
        senderId: AI_ASSISTANT_ID,
        receiverId: userId,
        text: responseText,
        timestamp: new Date().toISOString(),
        isSender: false,
        status: 'sent',
      };

      setMessages((prev) => {
        const existing = prev[contactIdKey] || [];
        return {
          ...prev,
          [contactIdKey]: [...existing, closeMessage],
        };
      });
      return;
    }

    // If escalation is needed, send to admin
    if (aiResponse.shouldEscalate) {
      const escalationResult = await aiAssistantService.escalateToAdmin(
        userId,
        text,
        conversationHistory
      );

      if (escalationResult.success && escalationResult.ticketId) {
        // Ticket created successfully
        const ticketMessage: Message = {
          id: `ai-ticket-${Date.now()}-${Math.random()}`,
          senderId: AI_ASSISTANT_ID,
          receiverId: userId,
          text: `${aiResponse.response}\n\n🎫 I've created a support ticket for you (ID: ${escalationResult.ticketId}). An administrator will be notified and will respond to you through this AI Assistant chat.\n\n⏱️ Please stay in this conversation - when an admin responds, their message will appear here automatically.\n\n📋 Your request has been logged and prioritized for admin review.`,
          timestamp: new Date().toISOString(),
          isSender: false,
          status: 'sent',
        };

        setMessages((prev) => {
          const existing = prev[contactIdKey] || [];
          return {
            ...prev,
            [contactIdKey]: [...existing, ticketMessage],
          };
        });

        // Store the ticket ID for this conversation
        localStorage.setItem(`ai-ticket-${userId}`, escalationResult.ticketId);
      } else if (escalationResult.success && escalationResult.adminId) {
        // Add AI response indicating escalation
        const escalationMessage: Message = {
          id: `ai-response-${Date.now()}-${Math.random()}`,
          senderId: AI_ASSISTANT_ID,
          receiverId: userId,
          text: `${aiResponse.response}\n\n✅ I've connected you with an administrator. Redirecting you to the admin chat...`,
          timestamp: new Date().toISOString(),
          isSender: false,
          status: 'sent',
        };

        setMessages((prev) => {
          const existing = prev[contactIdKey] || [];
          return {
            ...prev,
            [contactIdKey]: [...existing, escalationMessage],
          };
        });

        // Automatically switch to the admin chat after a short delay
        setTimeout(() => {
          setActiveContactId(escalationResult.adminId!);
        }, 1500);

        // Note: Admin contact will be automatically created when admin sends a message
        // or when the user navigates to the admin conversation
      } else if (escalationResult.success && escalationResult.error) {
        // Success but with fallback message (no admin available or other issue)
        const fallbackMessage: Message = {
          id: `ai-fallback-${Date.now()}-${Math.random()}`,
          senderId: AI_ASSISTANT_ID,
          receiverId: userId,
          text: `${aiResponse.response}\n\n💡 ${escalationResult.error}`,
          timestamp: new Date().toISOString(),
          isSender: false,
          status: 'sent',
        };

        setMessages((prev) => {
          const existing = prev[contactIdKey] || [];
          return {
            ...prev,
            [contactIdKey]: [...existing, fallbackMessage],
          };
        });
      } else {
        const errorText = escalationResult.error || 'Unable to connect with admin at this time. Please try again later.';

        if (escalationResult.adminId) {
          const fallbackMessage: Message = {
            id: `ai-error-${Date.now()}-${Math.random()}`,
            senderId: AI_ASSISTANT_ID,
            receiverId: userId,
            text: `${aiResponse.response}\n\n⚠️ ${errorText}\n\nOpening the Administrator chat so they can reach out to you. You can also try sending a message directly.`,
            timestamp: new Date().toISOString(),
            isSender: false,
            status: 'sent',
          };

          setMessages((prev) => {
            const existing = prev[contactIdKey] || [];
            return {
              ...prev,
              [contactIdKey]: [...existing, fallbackMessage],
            };
          });

          setActiveContactId(escalationResult.adminId);
        } else {
          const errorMessage: Message = {
            id: `ai-error-${Date.now()}-${Math.random()}`,
            senderId: AI_ASSISTANT_ID,
            receiverId: userId,
            text: `${aiResponse.response}\n\n⚠️ ${errorText}`,
            timestamp: new Date().toISOString(),
            isSender: false,
            status: 'sent',
          };

          setMessages((prev) => {
            const existing = prev[contactIdKey] || [];
            return {
              ...prev,
              [contactIdKey]: [...existing, errorMessage],
            };
          });
        }
      }
    } else {
      // Add AI response
      const aiMessage: Message = {
        id: `ai-response-${Date.now()}-${Math.random()}`,
        senderId: AI_ASSISTANT_ID,
        receiverId: userId,
        text: aiResponse.response,
        timestamp: new Date().toISOString(),
        isSender: false,
        status: 'sent',
      };

      setMessages((prev) => {
        const existing = prev[contactIdKey] || [];
        return {
          ...prev,
          [contactIdKey]: [...existing, aiMessage],
        };
      });
    }
  };

  // Reply to a specific message
  const replyMessage = async (
    contactId: number | string,
    text: string,
    replyToMessageId: string,
    encrypt: boolean = false
  ) => {
    await sendMessage(contactId, text, encrypt, replyToMessageId);
  };

  // Edit an existing message
  const editMessage = async (messageId: string, newContent: string) => {
    if (!newContent.trim()) return;

    // Check if messaging is enabled
    if (!messagingEnabled) {
      throw new Error('Messaging feature is currently disabled by the administrator.');
    }

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('You must be logged in to edit messages');
      }

      // Verify the message belongs to the user
      const { data: existingMessage, error: fetchError } = await (supabase as any)
        .from('messages')
        .select('sender_id, receiver_id')
        .eq('id', messageId)
        .single();

      if (fetchError) throw fetchError;
      if (existingMessage.sender_id !== user.id) {
        throw new Error('You can only edit your own messages');
      }

      const { data, error } = await (supabase as any)
        .from('messages')
        .update({
          content: newContent,
        })
        .eq('id', messageId)
        .select(
          'id, sender_id, receiver_id, booking_id, content, attachments, read, read_at, flagged, flag_reason, created_at, updated_at'
        )
        .single();

      if (error) throw error;

      // Update local state
      setMessages((prev) => {
        const updated = { ...prev };
        Object.keys(updated).forEach((contactId) => {
          if (updated[contactId]) {
            updated[contactId] = updated[contactId].map((msg) =>
              msg.id === messageId
                ? {
                    ...msg,
                    text: data.content,
                    isEdited: false, // Set locally since is_edited column may not exist
                    editedAt: undefined,
                  }
                : msg
            );
          }
        });
        return updated;
      });
    } catch (error) {
      console.error('Failed to edit message:', error);
      throw error;
    }
  };

  // Delete a message (soft delete)
  const deleteMessage = async (messageId: string) => {
    // Check if messaging is enabled
    if (!messagingEnabled) {
      throw new Error('Messaging feature is currently disabled by the administrator.');
    }

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('You must be logged in to delete messages');
      }

      // Verify the message belongs to the user
      const { data: existingMessage, error: fetchError } = await (supabase as any)
        .from('messages')
        .select('sender_id')
        .eq('id', messageId)
        .single();

      if (fetchError) {
        console.error('Error fetching message:', fetchError);
        throw new Error('Message not found');
      }

      if (existingMessage.sender_id !== user.id) {
        throw new Error('You can only delete your own messages');
      }

      // Note: Soft delete (is_deleted) is not available in the database yet
      // For now, we'll just remove the message from local state
      // TODO: Run migration 20251217002724_add_message_reply_edit_delete.sql to enable soft deletes

      // Remove from local state
      setMessages((prev) => {
        const updated = { ...prev };
        Object.keys(updated).forEach((contactId) => {
          if (updated[contactId]) {
            updated[contactId] = updated[contactId].filter((msg) => msg.id !== messageId);
          }
        });
        return updated;
      });
    } catch (error: any) {
      console.error('Failed to delete message:', error);
      throw error;
    }
  };

  // Setup typing channel for a contact to listen for typing events and broadcast
  useEffect(() => {
    if (!activeContactId || !chatSettings.privacy.typingIndicators) {
      // Cleanup typing channels when not needed
      Object.values(typingChannelsRef.current).forEach((channel) => {
        try {
          channel.unsubscribe();
        } catch (e) {
          // Channel might already be unsubscribed
        }
      });
      typingChannelsRef.current = {};
      Object.values(typingTimeoutsRef.current).forEach((timeout) => clearTimeout(timeout));
      typingTimeoutsRef.current = {};
      return;
    }

    const setupTypingChannel = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // Create a conversation channel ID (same for both users)
      const channelId = `typing:${[user.id, activeContactId.toString()].sort().join(':')}`;

      // Clean up existing channel for this contact
      if (typingChannelsRef.current[activeContactId]) {
        try {
          typingChannelsRef.current[activeContactId].unsubscribe();
        } catch (e) {
          // Channel might already be unsubscribed
        }
      }

      // Create and subscribe to typing broadcast channel
      const channel = supabase.channel(channelId, {
        config: { broadcast: { self: false } },
      });

      // Listen for typing events from the contact
      channel
        .on('broadcast', { event: 'typing' }, (payload) => {
          const { userId, isTyping: eventIsTyping } = payload.payload as any;

          // Only process typing events from the contact (not from self)
          if (userId === activeContactId.toString() && userId !== user.id) {
            // Clear existing timeout
            if (typingTimeoutsRef.current[activeContactId]) {
              clearTimeout(typingTimeoutsRef.current[activeContactId]);
            }

            if (eventIsTyping) {
              setTypingIndicators((prev) => {
                const filtered = prev.filter(
                  (indicator) => indicator.contactId !== activeContactId
                );
                return [
                  ...filtered,
                  {
                    contactId: activeContactId,
                    isTyping: true,
                    timestamp: new Date().toISOString(),
                  },
                ];
              });

              // Auto-clear typing indicator after 3 seconds
              typingTimeoutsRef.current[activeContactId] = setTimeout(() => {
                setTypingIndicators((prev) =>
                  prev.filter((indicator) => indicator.contactId !== activeContactId)
                );
              }, 3000);
            } else {
              // Contact stopped typing
              setTypingIndicators((prev) =>
                prev.filter((indicator) => indicator.contactId !== activeContactId)
              );
            }
          }
        })
        .subscribe();

      typingChannelsRef.current[activeContactId] = channel;
    };

    setupTypingChannel();

    return () => {
      if (typingChannelsRef.current[activeContactId]) {
        try {
          typingChannelsRef.current[activeContactId].unsubscribe();
        } catch (e) {
          // Channel might already be unsubscribed
        }
        delete typingChannelsRef.current[activeContactId];
      }
      if (typingTimeoutsRef.current[activeContactId]) {
        clearTimeout(typingTimeoutsRef.current[activeContactId]);
        delete typingTimeoutsRef.current[activeContactId];
      }
    };
  }, [activeContactId, chatSettings.privacy.typingIndicators]);

  // Handle typing indicators - broadcast to contact via Realtime Broadcast
  const setTyping = async (contactId: number | string, isTyping: boolean) => {
    if (!chatSettings.privacy.typingIndicators) return;

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // Get the existing channel (should be set up by the useEffect)
      const channel = typingChannelsRef.current[contactId];
      if (!channel) {
        // Channel not set up yet, create it temporarily
        const channelId = `typing:${[user.id, contactId.toString()].sort().join(':')}`;
        const newChannel = supabase.channel(channelId, {
          config: { broadcast: { self: false } },
        });
        newChannel.subscribe();
        typingChannelsRef.current[contactId] = newChannel;

        // Broadcast typing event
        newChannel.send({
          type: 'broadcast',
          event: 'typing',
          payload: {
            userId: user.id,
            isTyping,
            timestamp: new Date().toISOString(),
          },
        });
      } else {
        // Channel exists, just broadcast
        channel.send({
          type: 'broadcast',
          event: 'typing',
          payload: {
            userId: user.id,
            isTyping,
            timestamp: new Date().toISOString(),
          },
        });
      }
    } catch (error) {
      console.error('Failed to broadcast typing status:', error);
    }
  };

  // Update chat settings
  const updateChatSettings = (newSettings: Partial<ChatSettings>) => {
    setChatSettings((prev) => ({
      ...prev,
      ...newSettings,
      notifications: { ...prev.notifications, ...newSettings.notifications },
      encryption: { ...prev.encryption, ...newSettings.encryption },
      privacy: { ...prev.privacy, ...newSettings.privacy },
    }));
  };

  // Initialize encryption
  const initializeEncryption = async (): Promise<boolean> => {
    try {
      await encryptionService.initializeEncryption();
      await encryptionService.storeKeys();
      setIsEncryptionEnabled(true);
      return true;
    } catch (error) {
      console.error('Failed to initialize encryption:', error);
      return false;
    }
  };

  // Update contact status
  const updateContactStatus = (contactId: number | string, updates: Partial<Contact>) => {
    setContacts((prev) =>
      prev.map((contact) => (contact.id === contactId ? { ...contact, ...updates } : contact))
    );
  };

  // Get messages for the active contact
  const activeMessages = activeContactId ? messages[activeContactId] || [] : [];

  return (
    <ChatContext.Provider
      value={{
        messages: activeMessages,
        sendMessage,
        replyMessage,
        editMessage,
        deleteMessage,
        setActiveContactId,
        activeContactId,
        typingIndicators,
        setTyping,
        chatSettings,
        updateChatSettings,
        isEncryptionEnabled,
        initializeEncryption,
        contacts,
        updateContactStatus,
        messagingEnabled,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};
