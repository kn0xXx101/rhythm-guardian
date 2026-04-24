import { z } from 'zod';
import { supabase } from '@/lib/supabase';
import {
  supportTicketListRowSchema,
  ticketMessageRowSchema,
  type SupportTicketListRow,
  type TicketMessageRow,
} from '@/lib/support-ticket-schemas';

export type { SupportTicketListRow, TicketMessageRow } from '@/lib/support-ticket-schemas';

function parseRows<T>(schema: z.ZodType<T>, data: unknown, label: string): T[] {
  const parsed = z.array(schema).safeParse(data ?? []);
  if (!parsed.success) {
    console.warn(`[${label}] response shape drift`, parsed.error.flatten());
    return [];
  }
  return parsed.data;
}

export async function rpcGetSupportTickets(): Promise<SupportTicketListRow[]> {
  const { data, error } = await supabase.rpc('get_support_tickets');
  if (error) {
    if (import.meta.env.DEV) {
      console.warn('get_support_tickets:', error.message);
    }
    return [];
  }
  return parseRows(supportTicketListRowSchema, data, 'get_support_tickets');
}

export async function rpcGetTicketMessages(ticketId: string): Promise<TicketMessageRow[]> {
  const { data, error } = await supabase.rpc('get_ticket_messages', { ticket_id: ticketId });
  if (error) throw error;
  return parseRows(ticketMessageRowSchema, data, 'get_ticket_messages');
}

export async function rpcAddTicketMessage(args: {
  ticketId: string;
  senderType: 'admin' | 'user';
  senderId: string;
  content: string;
}): Promise<void> {
  const { error } = await supabase.rpc('add_ticket_message', {
    p_ticket_id: args.ticketId,
    p_sender_type: args.senderType,
    p_sender_id: args.senderId,
    p_content: args.content,
  });
  if (error) throw error;
}

export async function rpcResolveTicket(args: {
  ticketId: string;
  adminId: string;
  resolutionNote?: string;
}): Promise<void> {
  const note =
    args.resolutionNote?.trim() ||
    'Ticket marked as resolved by an administrator from the support console.';
  const { error } = await supabase.rpc('resolve_ticket', {
    p_ticket_id: args.ticketId,
    p_admin_id: args.adminId,
    p_resolution_note: note,
  });
  if (error) throw error;
}
