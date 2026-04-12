import { supabase } from '@/lib/supabase';
import { Notification, NotificationPreferences } from '@/types/features';

const normalizePreferences = (prefs: NotificationPreferences): NotificationPreferences => ({
  ...prefs,
  email_bookings: prefs.email_bookings ?? true,
  email_messages: prefs.email_messages ?? true,
  email_reviews: prefs.email_reviews ?? true,
  email_promotions: prefs.email_promotions ?? false,
  in_app_bookings: prefs.in_app_bookings ?? true,
  in_app_messages: prefs.in_app_messages ?? true,
  in_app_reviews: prefs.in_app_reviews ?? true,
  in_app_system: prefs.in_app_system ?? true,
  push_bookings: prefs.push_bookings ?? true,
  push_messages: prefs.push_messages ?? true,
});

export const notificationsService = {
  async getNotifications(userId: string, limit: number = 50) {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    
    // Map database columns to frontend interface
    return (data || []).map((row: any) => ({
      id: row.id,
      user_id: row.user_id,
      type: row.type,
      title: row.title,
      message: row.content || row.message,
      link: row.action_url || row.link,
      is_read: row.read !== undefined ? row.read : row.is_read,
      priority: row.priority || 'normal',
      data: row.metadata || {},
      created_at: row.created_at,
      icon: row.icon
    })) as Notification[];
  },

  async getUnreadCount(userId: string) {
    // Try both column names to be resilient
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .or('read.eq.false,is_read.eq.false');

    if (error) {
      // Fallback if 'or' query fails due to missing column
      const { count: fallbackCount, error: fallbackError } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('read', false);
      
      if (fallbackError) {
        console.warn('Failed to fetch unread count with fallback:', fallbackError);
        return 0;
      }
      return fallbackCount || 0;
    }
    return count || 0;
  },

  async markAsRead(notificationId: string) {
    // Try updating both possible column names
    const { error } = await supabase
      .from('notifications')
      .update({ read: true } as any)
      .eq('id', notificationId);

    if (error) {
      const { error: secondError } = await supabase
        .from('notifications')
        .update({ is_read: true } as any)
        .eq('id', notificationId);
      if (secondError) throw secondError;
    }
  },

  async markAllAsRead(userId: string) {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true } as any)
      .eq('user_id', userId)
      .eq('read', false);

    if (error) {
      const { error: secondError } = await supabase
        .from('notifications')
        .update({ is_read: true } as any)
        .eq('user_id', userId)
        .eq('is_read', false);
      if (secondError) throw secondError;
    }
  },

  async createNotification(notification: Omit<Notification, 'id' | 'created_at'>) {
    const payload: any = {
      user_id: notification.user_id,
      type: notification.type,
      title: notification.title,
      content: notification.message,
      read: notification.is_read || false,
      action_url: notification.link,
      metadata: notification.data || {},
    };

    const { data, error } = await supabase
      .from('notifications')
      .insert(payload)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteNotification(id: string) {
    const { error } = await supabase.from('notifications').delete().eq('id', id);

    if (error) throw error;
  },

  async getPreferences(userId: string) {
    const { data, error } = await (supabase as any)
      .from('notification_preferences')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      const defaultPrefs: Omit<NotificationPreferences, 'id' | 'updated_at'> = {
        user_id: userId,
        email_bookings: true,
        email_messages: true,
        email_reviews: true,
        email_promotions: false,
        in_app_bookings: true,
        in_app_messages: true,
        in_app_reviews: true,
        in_app_system: true,
        push_bookings: true,
        push_messages: true,
      };

      const { data: newPrefs, error: createError } = await (supabase as any)
        .from('notification_preferences')
        .insert(defaultPrefs)
        .select()
        .single();

      if (createError) throw createError;
      return normalizePreferences(newPrefs as NotificationPreferences);
    }

    return normalizePreferences(data as NotificationPreferences);
  },

  async updatePreferences(userId: string, preferences: Partial<NotificationPreferences>) {
    const { data, error } = await (supabase as any)
      .from('notification_preferences')
      .upsert(
        { user_id: userId, ...preferences },
        { onConflict: 'user_id' }
      )
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  subscribeToNotifications(userId: string, callback: (notification: Notification) => void) {
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          callback(payload.new as Notification);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },

  getNotificationIcon(type: string) {
    switch (type) {
      case 'booking':
        return '📅';
      case 'message':
        return '💬';
      case 'review':
        return '⭐';
      case 'payment':
        return '💰';
      case 'system':
        return '🔔';
      default:
        return '📢';
    }
  },

  getPriorityColor(priority: string) {
    switch (priority) {
      case 'urgent':
        return 'text-red-600';
      case 'high':
        return 'text-orange-600';
      case 'normal':
        return 'text-blue-600';
      case 'low':
        return 'text-gray-600';
      default:
        return 'text-gray-600';
    }
  },
};
