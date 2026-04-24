import { z } from 'zod';

const userInfoSchema = z
  .object({
    full_name: z.string().nullable().optional(),
    role: z.string().nullable().optional(),
  })
  .passthrough();

export const supportTicketListRowSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  status: z.string(),
  priority: z.string(),
  subject: z.string(),
  original_message: z.string().nullable().optional(),
  created_at: z.string(),
  session_status: z.string().nullable().optional(),
  session_expires_at: z.string().nullable().optional(),
  user_info: userInfoSchema.nullable().optional(),
});

export const ticketMessageRowSchema = z.object({
  id: z.string().uuid(),
  sender_type: z.string(),
  sender_name: z.string(),
  content: z.string(),
  created_at: z.string(),
  is_internal: z.boolean().optional(),
});

export type SupportTicketListRow = z.infer<typeof supportTicketListRowSchema>;
export type TicketMessageRow = z.infer<typeof ticketMessageRowSchema>;
