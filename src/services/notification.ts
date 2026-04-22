// Notification Service
// Handles in-app notifications, chat message notifications, and notification sounds

import { supabase } from '@/lib/supabase';

let sharedAudio: HTMLAudioElement | null = null;
let soundUnlocked = false;
let currentTone: 'default' | 'chime' | 'bell' | 'soft' = 'default';
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

const TONE_STORAGE_KEY = 'notification_sound';

const getTone = (): 'default' | 'chime' | 'bell' | 'soft' => {
  if (typeof window === 'undefined') return 'default';
  const stored = window.localStorage.getItem(TONE_STORAGE_KEY);
  if (stored === 'default' || stored === 'chime' || stored === 'bell' || stored === 'soft') {
    return stored;
  }
  return 'default';
};

const saveTone = (tone: 'default' | 'chime' | 'bell' | 'soft') => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(TONE_STORAGE_KEY, tone);
};

const playToneWithOscillator = (tone: 'default' | 'chime' | 'bell' | 'soft') => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const notes =
      tone === 'chime'
        ? [660, 880]
        : tone === 'bell'
          ? [740, 988, 740]
          : tone === 'soft'
            ? [523]
            : [800, 600];

    const total = notes.length;
    notes.forEach((freq, idx) => {
      const start = audioContext.currentTime + idx * 0.08;
      const osc = audioContext.createOscillator();
      const gain = audioContext.createGain();

      osc.type = tone === 'bell' ? 'triangle' : tone === 'soft' ? 'sine' : 'square';
      osc.frequency.setValueAtTime(freq, start);

      gain.gain.setValueAtTime(tone === 'soft' ? 0.12 : 0.24, start);
      gain.gain.exponentialRampToValueAtTime(0.01, start + (idx === total - 1 ? 0.24 : 0.12));

      osc.connect(gain);
      gain.connect(audioContext.destination);
      osc.start(start);
      osc.stop(start + (idx === total - 1 ? 0.26 : 0.14));
    });
  } catch (error) {
    console.error('Could not play oscillator tone:', error);
  }
};

// Notification sound
const playNotificationSound = () => {
  const tone = currentTone || getTone();
  if (tone !== 'default') {
    playToneWithOscillator(tone);
    return;
  }

  const a = getAudio();
  if (!a) return;
  try {
    a.currentTime = 0;
    a.play().catch((err) => console.log('Could not play notification sound:', err));
  } catch {
    // ignore
  }
};

export const setNotificationTone = (tone: 'default' | 'chime' | 'bell' | 'soft') => {
  currentTone = tone;
  saveTone(tone);
};

export const loadNotificationTone = async (userId: string): Promise<void> => {
  try {
    const { data } = await supabase
      .from('user_settings')
      .select('notification_sound')
      .eq('user_id', userId)
      .maybeSingle();
    const dbTone = (data as { notification_sound?: string } | null)?.notification_sound;
    if (dbTone === 'default' || dbTone === 'chime' || dbTone === 'bell' || dbTone === 'soft') {
      setNotificationTone(dbTone);
      return;
    }
  } catch (error) {
    console.warn('Failed to load notification tone, using local preference', error);
  }
  setNotificationTone(getTone());
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
  setNotificationTone,
  loadNotificationTone,
};
