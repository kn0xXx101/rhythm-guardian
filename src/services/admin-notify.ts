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

    await (supabase as any).from('notifications').insert(
      admins.map((a: any) => ({
        user_id: a.user_id,
        type,
        title,
        content,
        read: false,
        action_url: actionUrl,
      }))
    );
  } catch (err) {
    // Never throw — notifications are non-critical
    console.error('notifyAdmins error (ignored):', err);
  }
}
