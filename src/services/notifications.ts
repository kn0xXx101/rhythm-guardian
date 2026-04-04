import type { ChatNotification } from '@/types/chat';

export class NotificationService {
  private static instance: NotificationService;
  private permission: NotificationPermission = 'default';
  private isSupported: boolean = false;

  private constructor() {
    this.isSupported = 'Notification' in window;
    if (this.isSupported) {
      this.permission = Notification.permission;
    }
  }

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  // Request notification permission
  public async requestPermission(): Promise<NotificationPermission> {
    if (!this.isSupported) {
      throw new Error('Notifications are not supported in this browser');
    }

    if (this.permission === 'granted') {
      return this.permission;
    }

    try {
      this.permission = await Notification.requestPermission();
      return this.permission;
    } catch (error) {
      console.error('Failed to request notification permission:', error);
      throw new Error('Failed to request notification permission');
    }
  }

  // Show a chat notification
  public async showChatNotification(notification: ChatNotification): Promise<void> {
    if (!this.canShowNotifications()) {
      console.warn('Cannot show notifications - permission not granted or not supported');
      return;
    }

    try {
      const notif = new Notification(notification.title, {
        body: notification.body,
        icon: notification.icon || '/favicon.ico',
        badge: '/favicon.ico',
        tag: `chat-${notification.contactId}`, // Prevents duplicate notifications
        requireInteraction: false,
        silent: false,
        data: {
          contactId: notification.contactId,
          messageId: notification.messageId,
          timestamp: new Date(notification.timestamp).getTime(),
        },
      });

      // Auto-close after 5 seconds
      setTimeout(() => {
        notif.close();
      }, 5000);

      // Handle notification click
      notif.onclick = (event) => {
        event.preventDefault();
        window.focus();

        // Navigate to chat with the contact
        const chatUrl = window.location.pathname.includes('/hirer/')
          ? `/hirer/chat?contact=${notification.contactId}`
          : `/musician/chat?contact=${notification.contactId}`;

        window.location.href = chatUrl;
        notif.close();
      };

      // Handle notification close
      notif.onclose = () => {
        console.log('Notification closed');
      };

      // Handle notification error
      notif.onerror = (error) => {
        console.error('Notification error:', error);
      };
    } catch (error) {
      console.error('Failed to show notification:', error);
    }
  }

  public async showSystemNotification(
    title: string,
    body: string,
    options?: { icon?: string; link?: string; tag?: string }
  ): Promise<void> {
    if (!this.canShowNotifications()) {
      return;
    }

    try {
      const notif = new Notification(title, {
        body,
        icon: options?.icon || '/favicon.ico',
        badge: '/favicon.ico',
        tag: options?.tag,
        requireInteraction: false,
        silent: false,
        data: {
          link: options?.link,
        },
      });

      setTimeout(() => {
        notif.close();
      }, 5000);

      notif.onclick = (event) => {
        event.preventDefault();
        window.focus();
        if (options?.link) {
          window.location.href = options.link;
        }
        notif.close();
      };
    } catch (error) {
      console.error('Failed to show notification:', error);
    }
  }

  // Show typing notification (less intrusive)
  public showTypingNotification(contactName: string, contactId: number): void {
    if (!this.canShowNotifications()) return;

    try {
      const notif = new Notification(`${contactName} is typing...`, {
        icon: '/favicon.ico',
        tag: `typing-${contactId}`,
        requireInteraction: false,
        silent: true, // Silent for typing indicators
      });

      // Auto-close typing notification quickly
      setTimeout(() => {
        notif.close();
      }, 2000);
    } catch (error) {
      console.error('Failed to show typing notification:', error);
    }
  }

  // Check if we can show notifications
  public canShowNotifications(): boolean {
    return this.isSupported && this.permission === 'granted';
  }

  // Get current permission status
  public getPermissionStatus(): NotificationPermission {
    return this.permission;
  }

  // Check if notifications are supported
  public isNotificationSupported(): boolean {
    return this.isSupported;
  }

  // Create notification for new message
  public createMessageNotification(
    senderName: string,
    messageText: string,
    contactId: number | string,
    messageId: string,
    senderImage?: string
  ): ChatNotification {
    // Truncate long messages
    const truncatedMessage =
      messageText.length > 100 ? messageText.substring(0, 100) + '...' : messageText;

    return {
      id: `notif-${messageId}`,
      title: `New message from ${senderName}`,
      body: truncatedMessage,
      icon: senderImage || '/favicon.ico',
      contactId,
      messageId,
      timestamp: new Date().toISOString(),
    };
  }

  // Show notification for new message
  public async notifyNewMessage(
    senderName: string,
    messageText: string,
    contactId: number | string,
    messageId: string,
    senderImage?: string
  ): Promise<void> {
    const notification = this.createMessageNotification(
      senderName,
      messageText,
      contactId,
      messageId,
      senderImage
    );

    await this.showChatNotification(notification);
  }

  // Clear all notifications for a specific contact
  public clearContactNotifications(contactId: number | string): void {
    // This is a limitation of the Web Notifications API
    // We can't programmatically clear existing notifications
    // But we can prevent new ones with the same tag
    console.log(`Clearing notifications for contact ${contactId}`);
  }

  // Play notification sound
  public playNotificationSound(): void {
    try {
      // Create audio context for notification sound
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

      // Create a simple beep sound
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1);

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.2);
    } catch (error) {
      console.error('Failed to play notification sound:', error);
    }
  }

  // Initialize notification service
  public async initialize(): Promise<boolean> {
    if (!this.isSupported) {
      console.warn('Notifications not supported in this browser');
      return false;
    }

    try {
      await this.requestPermission();
      return this.permission === 'granted';
    } catch (error) {
      console.error('Failed to initialize notifications:', error);
      return false;
    }
  }
}

export const notificationService = NotificationService.getInstance();
