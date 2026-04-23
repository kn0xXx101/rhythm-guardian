export type AssistantUserRole = 'hirer' | 'musician';
type Severity = 'info' | 'tip' | 'action_required';

export type NavigationContext = {
  role: AssistantUserRole;
  pathname: string;
  tourCompleted: boolean;
  signals?: {
    profileCompletion: number | null;
    documentsSubmitted: boolean | null;
    documentsVerified: boolean | null;
    totalBookingsCount: number;
    activeBookingsCount: number;
    pendingBookingsCount: number;
    unpaidBookingsCount: number;
    needsServiceConfirmationCount: number;
    unreadNotificationsCount: number;
  };
};

export type NavigationMessage = {
  id: string;
  title: string;
  body: string;
  severity: Severity;
  primaryAction: {
    label: string;
    href: string;
  };
};

const HIRER_ALLOWED_PATHS = new Set([
  '/hirer',
  '/hirer/search',
  '/hirer/bookings',
  '/hirer/chat',
  '/hirer/profile',
  '/hirer/settings',
  '/notifications',
  '/favorites',
]);

const MUSICIAN_ALLOWED_PATHS = new Set([
  '/musician',
  '/musician/profile',
  '/musician/bookings',
  '/musician/chat',
  '/musician/settings',
  '/notifications',
]);

function pluralize(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

function isAllowedPath(role: AssistantUserRole, href: string): boolean {
  const allowed = role === 'hirer' ? HIRER_ALLOWED_PATHS : MUSICIAN_ALLOWED_PATHS;
  return allowed.has(href);
}

function matchTemplate(context: NavigationContext): NavigationMessage | null {
  const signals = context.signals;

  if (context.role === 'hirer' && signals) {
    if (signals.unpaidBookingsCount > 0) {
      return {
        id: 'hirer-unpaid-booking-flow',
        routePrefix: '/hirer/bookings',
        title: 'Action needed: complete booking payment',
        body: `You have ${pluralize(
          signals.unpaidBookingsCount,
          'booking',
          'bookings'
        )} waiting for payment. Complete payment in-app to activate escrow and confirm the booking.`,
        primaryActionLabel: 'Review unpaid bookings',
        primaryActionHref: '/hirer/bookings',
        severity: 'action_required',
      };
    }
    if (signals.needsServiceConfirmationCount > 0) {
      return {
        id: 'hirer-confirm-service-flow',
        routePrefix: '/hirer/bookings',
        title: 'Action needed: confirm completed services',
        body: `${pluralize(
          signals.needsServiceConfirmationCount,
          'booking',
          'bookings'
        )} need your service confirmation. Confirm after the event so payout can proceed correctly.`,
        primaryActionLabel: 'Confirm in bookings',
        primaryActionHref: '/hirer/bookings',
        severity: 'action_required',
      };
    }
    if ((signals.profileCompletion ?? 0) > 0 && (signals.profileCompletion ?? 0) < 80) {
      return {
        id: 'hirer-profile-incomplete-flow',
        routePrefix: '/hirer/profile',
        title: 'Improve booking success with a stronger profile',
        body: `Your profile is ${signals.profileCompletion}% complete. Finish key details so musicians can respond faster with confidence.`,
        primaryActionLabel: 'Complete profile',
        primaryActionHref: '/hirer/profile',
        severity: 'action_required',
      };
    }
    if (signals.totalBookingsCount === 0) {
      return {
        id: 'hirer-first-booking-flow',
        routePrefix: '/hirer/search',
        title: 'Ready to make your first booking?',
        body: 'Start with Find Musicians to compare profiles, availability, and pricing before checkout.',
        primaryActionLabel: 'Find musicians',
        primaryActionHref: '/hirer/search',
        severity: 'tip',
      };
    }
    if (signals.unreadNotificationsCount > 0) {
      return {
        id: 'hirer-unread-notifications-flow',
        routePrefix: '/notifications',
        title: 'You have unread updates',
        body: `You have ${pluralize(
          signals.unreadNotificationsCount,
          'unread notification',
          'unread notifications'
        )}. Check updates for booking and payment activity.`,
        primaryActionLabel: 'View notifications',
        primaryActionHref: '/notifications',
        severity: 'info',
      };
    }
    return null;
  }

  if (context.role === 'musician' && signals) {
    if (signals.needsServiceConfirmationCount > 0) {
      return {
        id: 'musician-confirm-service-flow',
        routePrefix: '/musician/bookings',
        title: 'Action needed: confirm rendered services',
        body: `${pluralize(
          signals.needsServiceConfirmationCount,
          'booking',
          'bookings'
        )} are waiting for your confirmation. Confirm after each event so payout can progress.`,
        primaryActionLabel: 'Confirm in bookings',
        primaryActionHref: '/musician/bookings',
        severity: 'action_required',
      };
    }
    if (signals.documentsVerified === false) {
      return {
        id: 'musician-verification-flow',
        routePrefix: '/musician/profile',
        title: 'Complete verification to build trust',
        body: signals.documentsSubmitted
          ? 'Your verification is under review. Keep your profile complete while you wait.'
          : 'Submit verification documents from your profile to improve trust and booking conversion.',
        primaryActionLabel: 'Open profile',
        primaryActionHref: '/musician/profile',
        severity: 'action_required',
      };
    }
    if (
      (signals.profileCompletion ?? 0) > 0 &&
      (signals.profileCompletion ?? 0) < 80 &&
      signals.documentsVerified !== true
    ) {
      return {
        id: 'musician-profile-incomplete-flow',
        routePrefix: '/musician/profile',
        title: 'Improve visibility with a complete profile',
        body: `Your profile is ${signals.profileCompletion}% complete. Add missing details to increase hirer confidence.`,
        primaryActionLabel: 'Update profile',
        primaryActionHref: '/musician/profile',
        severity: 'action_required',
      };
    }
    if (signals.totalBookingsCount === 0) {
      return {
        id: 'musician-new-account-flow',
        routePrefix: '/musician/profile',
        title: 'Set up your profile to attract first bookings',
        body: 'Complete instruments, genres, rates, and availability so your listing is ready for hirers.',
        primaryActionLabel: 'Set up profile',
        primaryActionHref: '/musician/profile',
        severity: 'tip',
      };
    }
    if (signals.unreadNotificationsCount > 0) {
      return {
        id: 'musician-unread-notifications-flow',
        routePrefix: '/notifications',
        title: 'You have unread updates',
        body: `You have ${pluralize(
          signals.unreadNotificationsCount,
          'unread notification',
          'unread notifications'
        )}. Review updates related to bookings and confirmations.`,
        primaryActionLabel: 'View notifications',
        primaryActionHref: '/notifications',
        severity: 'info',
      };
    }
    return null;
  }

  // If no real signals are available, avoid fabricating stateful guidance.
  return null;
}

export function resolveNavigationMessage(context: NavigationContext): NavigationMessage | null {
  if (!context.tourCompleted) return null;
  const template = matchTemplate(context);
  if (!template) return null;
  if (!isAllowedPath(context.role, template.primaryActionHref)) return null;

  return {
    id: template.id,
    title: template.title,
    body: template.body,
    severity: template.severity,
    primaryAction: {
      label: template.primaryActionLabel,
      href: template.primaryActionHref,
    },
  };
}
