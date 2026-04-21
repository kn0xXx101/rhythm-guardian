import { supabase } from '@/lib/supabase';
import { openAIService } from './openai-service';
import { SessionManager } from '@/utils/session-manager';

// Special ID for AI Assistant contact
export const AI_ASSISTANT_ID = 'ai-assistant';

// Enhanced Knowledge base with regex matching
const KNOWLEDGE_BASE: Array<{ pattern: RegExp; response: string }> = [
  {
    pattern: /\b(hello|hi|hey|greetings|start|morning|afternoon)\b/i,
    response:
      "Hello! I'm your AI assistant for Rhythm Guardian. How can I help you today? I can answer questions about the platform, help you find musicians, or connect you with an admin if you need additional support.",
  },
  {
    pattern: /\b(help|support|assist)\b/i,
    response:
      'I\'m here to help! You can ask me questions about:\n- Booking musicians\n- Creating your profile\n- Payment and transactions\n- Platform features\n\nIf you need to speak with a human administrator, just say "connect to admin" or "talk to admin" and I\'ll connect you.',
  },
  {
    pattern: /\b(book|hire|reserve|schedule)\b/i,
    response:
      'To book a musician:\n1. Browse available musicians or search by instrument/genre\n2. View their profile and reviews\n3. Click "Contact" or "Book Now"\n4. Fill in your event details and submit the booking request\n\nThe musician will receive your request and can accept or decline it.',
  },
  {
    pattern: /\b(profile|account|setting|edit)\b/i,
    response:
      'You can update your profile by:\n1. Going to your Dashboard\n2. Clicking on "Edit Profile"\n3. Updating your information\n4. Adding instruments (for musicians) or preferences (for hirers)\n5. Uploading photos and documents\n\nMake sure to complete your profile to get more bookings!',
  },
  {
    pattern: /\b(pay|money|cost|fee|transaction|billing)\b/i,
    response:
      "Payments on Rhythm Guardian are secure and handled through our integrated payment system:\n- Musicians set their hourly rates\n- A platform fee is added to cover our services\n- You'll see the total amount before confirming a booking\n- Payments are processed securely\n\nFor specific payment questions, I can connect you with an admin.",
  },
  {
    pattern: /\b(rate|rating|review|star|feedback)\b/i,
    response:
      'After completing a booking, both parties can leave reviews:\n- Rate the experience (1-5 stars)\n- Write a detailed review\n- Rate specific aspects like performance, communication, and professionalism\n\nReviews help build trust in the community!',
  },
  {
    pattern: /\b(cancel|refund|return)\b/i,
    response:
      'Cancellation policies:\n- You can cancel bookings through your dashboard\n- Cancellation policies may vary by musician\n- Refunds depend on the timing and specific booking terms\n\nFor cancellation or refund issues, I can connect you with an admin for assistance.',
  },
  {
    pattern: /\b(verify|verification|badge|document|id)\b/i,
    response:
      "To get verified:\n1. Complete your profile\n2. Submit required documents (ID, certifications, etc.)\n3. Our team will review your submission\n4. Once verified, you'll see a verified badge on your profile\n\nVerification helps build trust with other users!",
  },
  {
    pattern: /\b(search|find|look for|musician|artist)\b/i,
    response:
      "You can find musicians by visiting the Search page. Use the filters to narrow down by instrument, genre, price, and location. Don't forget to check out our Featured Talent section on the home page!",
  }
];

// Escalation keywords - if user says these, connect to admin
const ESCALATION_KEYWORDS = [
  'connect to admin',
  'talk to admin',
  'speak to admin',
  'human',
  'real person',
  'administrator',
  'admin please',
  'need admin',
  'escalate',
  "can't help",
  'not helping',
  'technical support',
  'customer service',
];

// Ticket-related keywords
const TICKET_KEYWORDS = {
  status: /\b(status|check|progress|update)\b.*\b(ticket|request|issue|support)\b/i,
  list: /\b(my|show|list|all)\b.*\b(tickets|requests|issues)\b/i,
  close: /\b(close|resolve|finish|done|cancel)\b.*\b(ticket|request|issue)\b/i,
};

interface AIAssistantResponse {
  response: string;
  shouldEscalate: boolean;
  context?: string;
  action?: 'list_tickets' | 'check_status' | 'close_ticket';
}

/**
 * AI Assistant Service
 * Handles user queries and provides automated responses
 * Can escalate to admin when needed
 */
export class AIAssistantService {
  /**
   * Process user message and generate response
   */
  async processMessage(
    userMessage: string,
    conversationHistory: string[] = [],
    userId?: string,
    userRole?: 'hirer' | 'musician' | 'admin' | null
  ): Promise<AIAssistantResponse> {
    const normalizedMessage = userMessage.toLowerCase().trim();

    // Check for escalation requests
    const wantsEscalation = ESCALATION_KEYWORDS.some((keyword) =>
      normalizedMessage.includes(keyword.toLowerCase())
    );

    if (wantsEscalation) {
      return {
        response:
          "I'll connect you with an administrator right away. They'll be able to assist you with your inquiry. Please wait a moment while I set this up...",
        shouldEscalate: true,
        context: userMessage,
      };
    }

    // Check for ticket-related queries if userId is provided
    if (userId) {
      if (TICKET_KEYWORDS.status.test(normalizedMessage)) {
        return {
          response: "I'll check the status of your support requests for you...",
          shouldEscalate: false,
          action: 'check_status',
        };
      }
      if (TICKET_KEYWORDS.list.test(normalizedMessage)) {
        return {
          response: "I'm retrieving a list of your support tickets...",
          shouldEscalate: false,
          action: 'list_tickets',
        };
      }
      if (TICKET_KEYWORDS.close.test(normalizedMessage)) {
        return {
          response: "I'll help you close your active support tickets...",
          shouldEscalate: false,
          action: 'close_ticket',
        };
      }
    }

    // Try using OpenAI first if configured
    try {
      const openAIResponse = await this.tryOpenAI(userMessage, conversationHistory, userRole);
      if (openAIResponse) {
        return {
          response: openAIResponse,
          shouldEscalate: false
        };
      }
    } catch (error) {
      console.warn('OpenAI generation failed, falling back to local knowledge base', error);
    }

    // Fallback to local knowledge base
    for (const entry of KNOWLEDGE_BASE) {
      if (entry.pattern.test(normalizedMessage)) {
        return {
          response: entry.response,
          shouldEscalate: false,
        };
      }
    }

    // Default response if no match found
    return {
      response:
        'I understand your question. Let me help you with that. However, for more specific or complex issues, would you like me to connect you with an administrator? Just say "connect to admin" and I\'ll set that up for you.\n\nIn the meantime, you can also:\n- Browse the help section\n- Check your dashboard for common actions\n- Review our FAQ',
      shouldEscalate: false,
    };
  }

  /**
   * Try to generate a response using OpenAI
   */
  private async tryOpenAI(
    userMessage: string,
    history: string[],
    userRole?: 'hirer' | 'musician' | 'admin' | null
  ): Promise<string | null> {
    if (!openAIService.isConfigured()) {
      return null;
    }

    // Construct messages for OpenAI
    const messages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
      {
        role: 'system',
        content: `You are the in-app AI assistant for Rhythm Guardian (Ghana-focused live music booking).

Platform facts (stay accurate; if unsure, say so and offer to connect the user with an admin):
- Roles: "musician" performers and "hirer" clients who book them; admins handle disputes and verification.
- Users find talent via search, profiles, and bookings; messaging is built-in.
- Bookings and payments use secure flows (e.g. Paystack); amounts and escrow-style holds depend on booking state—describe generally, not exact fees unless the user quoted them.
- Musicians can have verification/badges after documents are reviewed; profiles and availability matter for bookings.
- Users can ask to "connect to admin" or "talk to admin" for human support; that creates a support ticket when the app escalates.
- Default behavior: guide users through the platform end-to-end in clear steps. Only escalate when they explicitly request admin or when safety/account issues require human handling.
- If role is musician, prioritize profile quality, booking response workflow, payout setup, earnings, and account verification.
- If role is hirer, prioritize discovery, shortlisting, booking flow, communication, payments, and post-booking follow-up.
- Do not offer refunds/cancellation policy details unless the user asks. Never suggest refund flows proactively to musicians.
- Be concise, friendly, and professional. Use short paragraphs or bullet lists when helpful.
- Never invent policy, legal advice, or exact prices. Never ask for passwords or card numbers.`,
      },
    ];

    if (userRole) {
      messages.push({
        role: 'system',
        content: `Current user role is "${userRole}". Tailor guidance to this role and avoid irrelevant workflows.`,
      });
    }

    // Add recent history (last 4 messages to keep context window small)
    const recentHistory = history.slice(-4);
    recentHistory.forEach(msg => {
      if (msg.startsWith('You: ')) {
        messages.push({ role: 'user', content: msg.replace('You: ', '') });
      } else {
        messages.push({ role: 'assistant', content: msg });
      }
    });

    messages.push({ role: 'user', content: userMessage });

    return await openAIService.generateResponse(messages);
  }

  /**
   * Get admin user ID from database
   */
  async getAdminUserId(): Promise<string | null> {
    try {
      // First try to find an active admin
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('role', 'admin')
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Error fetching admin user:', error);
        return null;
      }

      return data?.user_id || null;
    } catch (error) {
      console.error('Error getting admin user ID:', error);
      return null;
    }
  }

  /**
   * Escalate conversation to admin
   * Always creates a support ticket and notifies admins
   */
  async escalateToAdmin(
    userId: string,
    userMessage: string,
    conversationHistory?: string[]
  ): Promise<{ success: boolean; adminId: string | null; ticketId?: string; error?: string }> {
    try {
      // Extract the actual user question
      let messageToTicket = userMessage.trim();
      const normalizedUserMessage = messageToTicket.toLowerCase();
      const isJustEscalationRequest = ESCALATION_KEYWORDS.some((keyword) => {
        const keywordLower = keyword.toLowerCase();
        return (
          normalizedUserMessage === keywordLower ||
          normalizedUserMessage === `i want to ${keywordLower}` ||
          normalizedUserMessage === `i need to ${keywordLower}` ||
          normalizedUserMessage === `please ${keywordLower}`
        );
      });

      // Extract actual question from history if just asking to connect
      if (isJustEscalationRequest && conversationHistory && conversationHistory.length > 0) {
        const userMessages = conversationHistory
          .filter((line) => line.startsWith('You:'))
          .map((line) => line.replace(/^You:\s*/, ''))
          .filter((msg) => {
            const msgLower = msg.toLowerCase();
            return !ESCALATION_KEYWORDS.some((kw) => msgLower.includes(kw.toLowerCase()));
          })
          .slice(-2);

        if (userMessages.length > 0) {
          messageToTicket = userMessages.join('\n\n');
        } else {
          messageToTicket = 'User requested to connect with admin for live support';
        }
      }

      // Always create a support ticket using RPC function
      console.log('Creating support ticket for admin connection...');
      
      const { data: ticketId, error: ticketError } = await supabase.rpc(
        'create_support_ticket' as any,
        {
          p_user_id: userId,
          p_subject: 'AI Assistant - Admin Connection Request',
          p_message: messageToTicket,
          p_category: 'general',
          p_priority: 'medium'
        }
      );

      if (ticketError) {
        console.error('Error creating support ticket:', ticketError);
        return {
          success: false,
          adminId: null,
          error: 'Unable to create support request. Please ensure support tickets are set up in the database.',
        };
      }

      return {
        success: true,
        adminId: null,
        ticketId: ticketId as string,
      };
    } catch (error) {
      console.error('Error escalating to admin:', error);
      return {
        success: false,
        adminId: null,
        error: 'An error occurred while creating your support request.',
      };
    }
  }

  /**
   * Send automated response as AI assistant
   */
  async sendAIResponse(): Promise<{ success: boolean; error?: string }> {
    try {
      // Note: We'll handle this in ChatContext by intercepting messages
      // This is just a placeholder for the response structure
      return { success: true };
    } catch (error) {
      console.error('Error sending AI response:', error);
      return {
        success: false,
        error: 'Failed to send response.',
      };
    }
  }

  /**
   * Send admin response through AI Assistant to user
   * This relays admin messages back to the user via the AI Assistant chat
   */
  async sendAdminResponseToUser(
    ticketId: string,
    adminMessage: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Use RPC function to add message to ticket
      const { error } = await supabase.rpc('add_ticket_message' as any, {
        p_ticket_id: ticketId,
        p_sender_type: 'admin',
        p_sender_id: null,
        p_content: adminMessage,
      });

      if (error) {
        console.error('Error adding admin message to ticket:', error);
        return {
          success: false,
          error: 'Failed to relay admin message.',
        };
      }

      return { success: true };
    } catch (error) {
      console.error('Error sending admin response to user:', error);
      return {
        success: false,
        error: 'Failed to relay admin message.',
      };
    }
  }

  /**
   * Check for pending admin responses for a user
   * This is called periodically to check if admins have responded to tickets
   */
  async checkForAdminResponses(userId: string): Promise<{
    hasNewResponses: boolean;
    responses: Array<{ ticket_id: string; admin_name: string; message: string; timestamp: string }>;
  }> {
    try {
      const session = await SessionManager.getValidSession();
      if (!session) {
        return { hasNewResponses: false, responses: [] };
      }

      console.log('🔍 Checking for admin responses for user:', userId);
      
      // Use RPC function to get user's active tickets
      const { data: tickets, error: ticketsError } = await supabase.rpc(
        'get_user_active_tickets' as any,
        { p_user_id: userId }
      );

      console.log('📋 Active tickets result:', { tickets, error: ticketsError });

      if (ticketsError || !tickets || tickets.length === 0) {
        console.log('📭 No active tickets found');
        return { hasNewResponses: false, responses: [] };
      }

      // Check for new admin messages since last check
      const lastCheckKey = `last-admin-check-${userId}`;
      const lastCheck = localStorage.getItem(lastCheckKey) || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      
      console.log('⏰ Last check time:', lastCheck);

      const responses: Array<{ ticket_id: string; admin_name: string; message: string; timestamp: string }> = [];

      // For each ticket, check for new admin messages
      for (const ticket of tickets) {
        console.log('🎫 Checking ticket for new messages:', ticket.id);
        
        const { data: newMessages, error: messagesError } = await supabase.rpc(
          'get_new_ticket_messages' as any,
          {
            p_ticket_id: ticket.id,
            p_since: lastCheck,
            p_sender_type: 'admin'
          }
        );

        console.log('📨 New messages result for ticket', ticket.id, ':', { newMessages, error: messagesError });

        if (!messagesError && newMessages) {
          responses.push(...newMessages.map((msg: any) => ({
            ticket_id: ticket.id,
            admin_name: msg.sender_name || 'Administrator',
            message: msg.content,
            timestamp: msg.created_at,
          })));
        }
      }

      // Update last check time
      const newCheckTime = new Date().toISOString();
      localStorage.setItem(lastCheckKey, newCheckTime);
      console.log('⏰ Updated last check time to:', newCheckTime);

      console.log('✅ Final response check result:', { hasNewResponses: responses.length > 0, responses });

      return {
        hasNewResponses: responses.length > 0,
        responses,
      };
    } catch (error) {
      console.error('❌ Error checking for admin responses:', error);
      return { hasNewResponses: false, responses: [] };
    }
  }

  /**
   * Get a list of active support tickets for a user
   */
  async listUserTickets(userId: string): Promise<{ success: boolean; tickets: any[]; error?: string }> {
    try {
      const session = await SessionManager.getValidSession();
      if (!session) {
        return { success: false, tickets: [], error: 'Session expired. Please log in again.' };
      }

      const { data, error } = await supabase.rpc('get_user_active_tickets_with_session' as any, {
        p_user_id: userId,
      });

      if (error) throw error;

      return {
        success: true,
        tickets: data || [],
      };
    } catch (error: any) {
      console.error('Error listing user tickets:', error);
      return {
         success: false,
         tickets: [],
         error: error.message || 'Failed to list your tickets.',
       };
     }
   }

   /**
    * Close a support ticket for a user
    */
   async closeUserTicket(userId: string, ticketId: string): Promise<{ success: boolean; error?: string }> {
     try {
       const session = await SessionManager.getValidSession();
       if (!session) {
         return { success: false, error: 'Session expired. Please log in again.' };
       }

       // We'll use resolve_ticket but from user's perspective it's closing it
       const { error } = await supabase.rpc('resolve_ticket' as any, {
         p_ticket_id: ticketId,
         p_admin_id: userId, // In this case we use user's ID to close it
         p_resolution_note: 'Ticket closed by user through AI Assistant.'
       });

       if (error) throw error;

       return { success: true };
     } catch (error: any) {
       console.error('Error closing user ticket:', error);
       return {
         success: false,
         error: error.message || 'Failed to close your ticket.',
       };
     }
   }
 }
 
 export const aiAssistantService = new AIAssistantService();
