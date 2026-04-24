import { describe, expect, it } from 'vitest';
import {
  supportTicketListRowSchema,
  ticketMessageRowSchema,
} from '@/lib/support-ticket-schemas';

describe('support ticket RPC contract (Zod)', () => {
  it('accepts a typical get_support_tickets row', () => {
    const row = {
      id: '11111111-1111-1111-1111-111111111111',
      user_id: '22222222-2222-2222-2222-222222222222',
      status: 'open',
      priority: 'normal',
      subject: 'Help with payout',
      original_message: 'I need help',
      created_at: '2026-04-24T12:00:00.000Z',
      session_status: 'waiting_admin',
      session_expires_at: null,
      user_info: { full_name: 'Test User', role: 'hirer' },
    };
    expect(supportTicketListRowSchema.safeParse(row).success).toBe(true);
  });

  it('accepts get_ticket_messages rows', () => {
    const row = {
      id: '33333333-3333-3333-3333-333333333333',
      sender_type: 'admin',
      sender_name: 'Admin',
      content: 'Hello',
      created_at: '2026-04-24T12:05:00.000Z',
      is_internal: false,
    };
    expect(ticketMessageRowSchema.safeParse(row).success).toBe(true);
  });

  it('rejects invalid uuid id', () => {
    const row = {
      id: 'not-a-uuid',
      user_id: '22222222-2222-2222-2222-222222222222',
      status: 'open',
      priority: 'normal',
      subject: 'x',
      created_at: '2026-04-24T12:00:00.000Z',
    };
    expect(supportTicketListRowSchema.safeParse(row).success).toBe(false);
  });
});
