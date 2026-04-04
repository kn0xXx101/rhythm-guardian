/**
 * Push Notification Service
 * Handles browser push notification registration and management
 */

let registration: ServiceWorkerRegistration | null = null;

/**
 * Register service worker for push notifications
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) {
    console.warn('Service workers are not supported in this browser');
    return null;
  }

  try {
    registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });

    console.log('Service worker registered successfully:', registration.scope);
    return registration;
  } catch (error) {
    console.error('Service worker registration failed:', error);
    return null;
  }
}

/**
 * Get service worker registration
 */
export function getServiceWorkerRegistration(): ServiceWorkerRegistration | null {
  return registration;
}

/**
 * Request push notification subscription
 * Note: This requires a VAPID key from your backend/server
 */
export async function subscribeToPushNotifications(
  vapidPublicKey?: string
): Promise<PushSubscription | null> {
  if (!registration) {
    registration = await registerServiceWorker();
    if (!registration) {
      console.warn('Cannot subscribe to push: service worker not registered');
      return null;
    }
  }

  try {
    // Check if already subscribed
    let subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      return subscription;
    }

    // Check if push is supported
    if (!('PushManager' in window)) {
      console.warn('Push messaging is not supported in this browser');
      return null;
    }

    // Subscribe with VAPID key (if provided)
    // Note: You need to get a VAPID key from your backend/server
    const subscribeOptions: PushSubscriptionOptionsInit = {
      userVisibleOnly: true,
      applicationServerKey: vapidPublicKey
        ? urlBase64ToUint8Array(vapidPublicKey)
        : undefined,
    };

    subscription = await registration.pushManager.subscribe(subscribeOptions);
    console.log('Push subscription successful');

    // You should send the subscription to your backend server here
    // Example: await fetch('/api/push/subscribe', { method: 'POST', body: JSON.stringify(subscription) });

    return subscription;
  } catch (error) {
    console.error('Failed to subscribe to push notifications:', error);
    return null;
  }
}

/**
 * Unsubscribe from push notifications
 */
export async function unsubscribeFromPushNotifications(): Promise<boolean> {
  if (!registration) {
    return false;
  }

  try {
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      const success = await subscription.unsubscribe();
      if (success) {
        // Notify your backend server that the user unsubscribed
        // Example: await fetch('/api/push/unsubscribe', { method: 'POST' });
        console.log('Push subscription cancelled');
      }
      return success;
    }
    return true;
  } catch (error) {
    console.error('Failed to unsubscribe from push notifications:', error);
    return false;
  }
}

/**
 * Check if push notifications are supported
 */
export function isPushNotificationSupported(): boolean {
  return (
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window &&
    Notification.permission !== 'denied'
  );
}

/**
 * Get current push subscription
 */
export async function getPushSubscription(): Promise<PushSubscription | null> {
  if (!registration) {
    registration = await registerServiceWorker();
    if (!registration) {
      return null;
    }
  }

  try {
    return await registration.pushManager.getSubscription();
  } catch (error) {
    console.error('Failed to get push subscription:', error);
    return null;
  }
}

/**
 * Convert VAPID public key from base64 URL to Uint8Array
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}


