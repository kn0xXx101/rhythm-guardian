/**
 * Centralized admin notification utility.
 * Inserts a notification row for every admin user.
 * Uses `supabase as any` to bypass strict type checking on the notifications table.
 */
import { supabase } from '@/lib/supabase';

type NotifType = 'booking' | 'payment' | 'system' | 'message' | 'review' | 'payout';

type NotifyAdminsOptions = {
  /** Stable event identifier used to suppress duplicate admin notifications. */
  eventKey?: string;
  /** Additional metadata stored with notification. */
  metadata?: Record<string, any>;
  /** Suppress duplicates created within this rolling window. Defaults to 5 minutes. */
  dedupeWindowSeconds?: number;
};

type NotifyAdminsAuditPayload = {
  type: NotifType;
  title: string;
  actionUrl: string;
  eventKey?: string;
  adminCount: number;
  inserted: number;
  deduped: number;
  errors: number;
};

const emitDevAuditEvent = (payload: NotifyAdminsAuditPayload) => {
  if (!import.meta.env.DEV || typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('admin-notify:audit', { detail: payload }));
};

export async function notifyAdmins(
  type: NotifType,
  title: string,
  content: string,
  actionUrl: string,
  options?: NotifyAdminsOptions
): Promise<void> {
  try {
    const { data: admins } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('role', 'admin');

    if (!admins || admins.length === 0) {
      emitDevAuditEvent({
        type,
        title,
        actionUrl,
        eventKey: options?.eventKey?.trim(),
        adminCount: 0,
        inserted: 0,
        deduped: 0,
        errors: 0,
      });
      return;
    }

    const eventKey = options?.eventKey?.trim();
    const dedupeWindowSeconds =
      typeof options?.dedupeWindowSeconds === 'number' && options.dedupeWindowSeconds > 0
        ? options.dedupeWindowSeconds
        : 300;
    const dedupeSince = new Date(Date.now() - dedupeWindowSeconds * 1000).toISOString();
    let inserted = 0;
    let deduped = 0;
    let errors = 0;

    for (const a of admins) {
      if (eventKey) {
        const { data: existing, error: existingError } = await supabase
          .from('notifications')
          .select('id')
          .eq('user_id', a.user_id)
          .eq('type', type)
          .eq('action_url', actionUrl)
          .contains('metadata', { eventKey })
          .gte('created_at', dedupeSince)
          .limit(1)
          .maybeSingle();

        if (existingError) {
          console.warn('notifyAdmins dedupe query failed; continuing insert', existingError);
        } else if (existing?.id) {
          deduped += 1;
          continue;
        }
      }

      const { error } = await supabase.rpc('create_notification', {
        p_user_id: a.user_id,
        p_type: type,
        p_title: title,
        p_content: content,
        p_action_url: actionUrl,
        p_metadata: {
          ...(options?.metadata || {}),
          ...(eventKey ? { eventKey } : {}),
        },
      });
      if (error) {
        errors += 1;
        console.error('notifyAdmins RPC error for admin', a.user_id, error);
      } else {
        inserted += 1;
      }
    }

    emitDevAuditEvent({
      type,
      title,
      actionUrl,
      eventKey,
      adminCount: admins.length,
      inserted,
      deduped,
      errors,
    });
  } catch (err) {
    console.error('notifyAdmins error (ignored):', err);
    emitDevAuditEvent({
      type,
      title,
      actionUrl,
      eventKey: options?.eventKey?.trim(),
      adminCount: 0,
      inserted: 0,
      deduped: 0,
      errors: 1,
    });
  }
}
