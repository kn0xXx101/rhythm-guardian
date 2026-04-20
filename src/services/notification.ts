// Notification Service
// Handles in-app notifications, chat message notifications, and notification sounds

import { supabase } from '@/lib/supabase';

let sharedAudio: HTMLAudioElement | null = null;
let soundUnlocked = false;
const makeChannelSuffix = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

function getAudio(): HTMLAudioElement | null {
  if (typeof window === 'undefined') return null;
  if (sharedAudio) return sharedAudio;
  try {
    const a = new Audio('/notification.mp3');
    a.preload = 'auto';
    a.volume = 0.5;
    sharedAudio = a;
    return a;
  } catch {
    return null;
  }
}

/**
 * Mobile browsers (esp. iOS) often block audio until a user gesture occurs.
 * Call this once on first interaction to "unlock" sound playback.
 */
export function unlockNotificationSoundOnce(): void {
  if (soundUnlocked) return;
  const a = getAudio();
  if (!a) return;
  soundUnlocked = true;
  const prevVol = a.volume;
  a.volume = 0;
  const p = a.play();
  if (p && typeof (p as any).catch === 'function') {
    (p as Promise<void>)
      .then(() => {
        a.pause();
        a.currentTime = 0;
        a.volume = prevVol;
      })
      .catch(() => {
        // If the unlock play failed, keep unlocked=false so we can retry on a later gesture.
        soundUnlocked = false;
        a.volume = prevVol;
      });
  }
}

// Notification sound
const playNotificationSound = () => {
  const a = getAudio();
  if (!a) return;
  try {
    a.currentTime = 0;
    a.play().catch((err) => console.log('Could not play notification sound:', err));
  } catch {
    // ignore
  }
};

// Request notification permission
export const requestNotificationPermission = async (): Promise<boolean> => {
  if (!('Notification' in window)) {
    console.log('This browser does not support notifications');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  return false;
};

// Show browser notification
export const showBrowserNotification = (title: string, body: string, icon?: string) => {
  if (Notification.permission === 'granted') {
    new Notification(title, {
      body,
      icon: icon || '/logo.svg',
      badge: '/logo.svg',
      tag: 'rhythm-guardian',
    });
  }
};

// Create a notification for new chat message
export const createChatNotification = async (
  receiverId: string,
  senderName: string,
  messagePreview: string
): Promise<void> => {
  try {
    // Get receiver's role to set appropriate action_url
    const { data: receiverProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('user_id', receiverId)
      .single();

    const receiverRole = receiverProfile?.role || 'hirer';
    
    // Set action_url based on receiver's role
    let actionUrl = '/dashboard/messages'; // fallback
    switch (receiverRole) {
      case 'admin':
        actionUrl = '/admin/chat';
        break;
      case 'hirer':
        actionUrl = '/hirer/chat';
        break;
      case 'musician':
        actionUrl = '/musician/chat';
        break;
      default:
        actionUrl = '/dashboard/messages';
        break;
    }

    await supabase.from('notifications').insert({
      user_id: receiverId,
      type: 'message',
      title: `New message from ${senderName}`,
      content: messagePreview.substring(0, 100),
      read: false,
      action_url: actionUrl,
      metadata: {
        sender_name: senderName,
        message_preview: messagePreview,
      },
    });
  } catch (error) {
    console.error('Error creating chat notification:', error);
  }
};

// Subscribe to new messages and create notifications
export const subscribeToNewMessages = (
  userId: string,
  onNewMessage: (notification: any) => void
) => {
  const suffix = makeChannelSuffix();
  const channel = supabase
    .channel(`new-messages:${userId}:${suffix}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `receiver_id=eq.${userId}`,
      },
      async (payload) => {
        const message = payload.new as any;
        
        // Fetch sender details
        const { data: sender } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('user_id', message.sender_id)
          .single();

        const senderName = sender?.full_name || 'Someone';
        
        // NOTE: Don't create notification here - the database trigger handles it
        // This subscription is only for real-time UI updates and sounds
        
        // Play sound
        playNotificationSound();

        // Show browser notification
        showBrowserNotification(
          `New message from ${senderName}`,
          message.content.substring(0, 100)
        );

        // Call callback for UI updates
        onNewMessage({
          type: 'message',
          title: `New message from ${senderName}`,
          content: message.content,
        });
      }
    )
    .subscribe();

  return channel;
};

// Subscribe to system notifications
export const subscribeToNotifications = (
  userId: string,
  onNewNotification: (notification: any) => void
) => {
  const suffix = makeChannelSuffix();
  const channel = supabase
    .channel(`notifications:${userId}:${suffix}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        const notification = payload.new as any;
        
        // Play sound for non-message notifications
        if (notification.type !== 'message') {
          playNotificationSound();
        }

        // Show browser notification
        showBrowserNotification(
          notification.title,
          notification.content
        );

        // Call callback
        onNewNotification(notification);
      }
    )
    .subscribe();

  return channel;
};

export default {
  requestNotificationPermission,
  showBrowserNotification,
  createChatNotification,
  subscribeToNewMessages,
  subscribeToNotifications,
  playNotificationSound,
  unlockNotificationSoundOnce,
};
