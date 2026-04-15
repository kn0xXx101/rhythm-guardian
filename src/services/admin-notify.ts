/**
 * Centralized admin notification utility.
 * Inserts a notification row for every admin user.
 * Uses `supabase as any` to bypass strict type checking on the notifications table.
 */
import { supabase } from '@/lib/supabase';

type NotifType = 'booking' | 'payment' | 'system' | 'message' | 'review' | 'payout';

export async function notifyAdmins(
  type: NotifType,
  title: string,
  content: string,
  actionUrl: string
): Promise<void> {
  try {
    const { data: admins } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('role', 'admin');

    if (!admins || admins.length === 0) return;

    for (const a of admins) {
      const { error } = await supabase.rpc('create_notification', {
        p_user_id: a.user_id,
        p_type: type,
        p_title: title,
        p_content: content,
        p_action_url: actionUrl,
        p_metadata: {},
      });
      if (error) {
        console.error('notifyAdmins RPC error for admin', a.user_id, error);
      }
    }
  } catch (err) {
    console.error('notifyAdmins error (ignored):', err);
  }
}
