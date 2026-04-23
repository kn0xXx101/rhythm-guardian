export type AssistantUserRole = 'hirer' | 'musician';
type Severity = 'info' | 'tip' | 'action_required';

type AssistantTemplate = {
  id: string;
  routePrefix: string;
  title: string;
  body: string;
  primaryActionLabel: string;
  primaryActionHref: string;
  severity: Severity;
};

export type NavigationContext = {
  role: AssistantUserRole;
  pathname: string;
  tourCompleted: boolean;
  signals?: {
    profileCompletion: number | null;
    documentsSubmitted: boolean | null;
    documentsVerified: boolean | null;
    pendingBookingsCount: number;
    unpaidBookingsCount: number;
    needsServiceConfirmationCount: number;
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

const HIRER_TEMPLATES: AssistantTemplate[] = [
  {
    id: 'hirer-profile-incomplete',
    routePrefix: '/hirer',
    title: 'Complete your profile to book faster',
    body: 'A complete profile helps musicians respond quickly and keeps booking details accurate.',
    primaryActionLabel: 'Complete profile',
    primaryActionHref: '/hirer/profile',
    severity: 'action_required',
  },
  {
    id: 'hirer-unpaid-booking',
    routePrefix: '/hirer',
    title: 'You have a booking waiting for payment',
    body: 'Complete payment in-app to activate escrow protection and move the booking forward.',
    primaryActionLabel: 'Go to bookings',
    primaryActionHref: '/hirer/bookings',
    severity: 'action_required',
  },
  {
    id: 'hirer-home-start-booking',
    routePrefix: '/hirer',
    title: 'Need a musician quickly?',
    body: 'Use Find Musicians to compare profiles, pricing, and availability before you pay.',
    primaryActionLabel: 'Find musicians',
    primaryActionHref: '/hirer/search',
    severity: 'tip',
  },
  {
    id: 'hirer-bookings-track',
    routePrefix: '/hirer/bookings',
    title: 'Track every booking in one place',
    body: 'Check status updates, manage event details, and mark service completed after the event.',
    primaryActionLabel: 'View all bookings',
    primaryActionHref: '/hirer/bookings',
    severity: 'info',
  },
  {
    id: 'hirer-chat-safe-payments',
    routePrefix: '/hirer/chat',
    title: 'Keep communication and payment in-app',
    body: 'Use chat for planning, but complete payments only in Rhythm Guardian for escrow protection.',
    primaryActionLabel: 'Open bookings',
    primaryActionHref: '/hirer/bookings',
    severity: 'action_required',
  },
  {
    id: 'hirer-profile-complete',
    routePrefix: '/hirer/profile',
    title: 'Complete your profile for faster responses',
    body: 'Musicians can respond faster when your event preferences and contact details are up to date.',
    primaryActionLabel: 'Review profile',
    primaryActionHref: '/hirer/profile',
    severity: 'tip',
  },
];

const MUSICIAN_TEMPLATES: AssistantTemplate[] = [
  {
    id: 'musician-profile-incomplete',
    routePrefix: '/musician',
    title: 'Finish your profile to get more bookings',
    body: 'Add instruments, genres, rates, and availability so hirers can book you confidently.',
    primaryActionLabel: 'Update profile',
    primaryActionHref: '/musician/profile',
    severity: 'action_required',
  },
  {
    id: 'musician-verification-needed',
    routePrefix: '/musician',
    title: 'Verification helps you win trust',
    body: 'Submit your verification documents to improve credibility and visibility.',
    primaryActionLabel: 'Open profile',
    primaryActionHref: '/musician/profile',
    severity: 'action_required',
  },
  {
    id: 'musician-confirm-service',
    routePrefix: '/musician',
    title: 'Confirm service to keep payouts moving',
    body: 'After the event, confirm service rendered so escrow can progress once both parties confirm.',
    primaryActionLabel: 'Review bookings',
    primaryActionHref: '/musician/bookings',
    severity: 'action_required',
  },
  {
    id: 'musician-home-profile',
    routePrefix: '/musician',
    title: 'Increase your booking chances',
    body: 'Complete your profile with instruments, genres, rates, and availability so hirers can choose confidently.',
    primaryActionLabel: 'Update profile',
    primaryActionHref: '/musician/profile',
    severity: 'tip',
  },
  {
    id: 'musician-bookings-confirm',
    routePrefix: '/musician/bookings',
    title: 'Keep payouts moving',
    body: 'After the event, confirm service rendered so escrow can progress once both parties confirm.',
    primaryActionLabel: 'Check bookings',
    primaryActionHref: '/musician/bookings',
    severity: 'action_required',
  },
  {
    id: 'musician-chat-safe',
    routePrefix: '/musician/chat',
    title: 'Protect yourself from off-platform risk',
    body: 'Discuss event details in chat, but avoid taking payment or deposit requests outside the platform.',
    primaryActionLabel: 'Review notifications',
    primaryActionHref: '/notifications',
    severity: 'action_required',
  },
  {
    id: 'musician-profile-verify',
    routePrefix: '/musician/profile',
    title: 'Verification helps you win trust',
    body: 'Upload and maintain accurate profile and verification details for better visibility and confidence.',
    primaryActionLabel: 'Go to profile',
    primaryActionHref: '/musician/profile',
    severity: 'info',
  },
];

function isAllowedPath(role: AssistantUserRole, href: string): boolean {
  const allowed = role === 'hirer' ? HIRER_ALLOWED_PATHS : MUSICIAN_ALLOWED_PATHS;
  return allowed.has(href);
}

function matchTemplate(context: NavigationContext): AssistantTemplate | null {
  const templates = context.role === 'hirer' ? HIRER_TEMPLATES : MUSICIAN_TEMPLATES;
  const signals = context.signals;

  if (context.role === 'hirer' && signals) {
    if ((signals.profileCompletion ?? 0) > 0 && (signals.profileCompletion ?? 0) < 80) {
      return templates.find((t) => t.id === 'hirer-profile-incomplete') ?? null;
    }
    if (signals.unpaidBookingsCount > 0) {
      return templates.find((t) => t.id === 'hirer-unpaid-booking') ?? null;
    }
    if (signals.needsServiceConfirmationCount > 0) {
      return {
        id: 'hirer-confirm-service',
        routePrefix: '/hirer',
        title: 'After the event, confirm service completion',
        body: 'Confirming helps release escrow to the musician once both parties confirm.',
        primaryActionLabel: 'Open bookings',
        primaryActionHref: '/hirer/bookings',
        severity: 'action_required',
      };
    }
  }

  if (context.role === 'musician' && signals) {
    if ((signals.profileCompletion ?? 0) > 0 && (signals.profileCompletion ?? 0) < 80) {
      return templates.find((t) => t.id === 'musician-profile-incomplete') ?? null;
    }
    if (signals.documentsVerified === false) {
      return templates.find((t) => t.id === 'musician-verification-needed') ?? null;
    }
    if (signals.needsServiceConfirmationCount > 0) {
      return templates.find((t) => t.id === 'musician-confirm-service') ?? null;
    }
  }

  const byRoute = templates.find((template) => context.pathname.startsWith(template.routePrefix));
  return byRoute ?? templates[0] ?? null;
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
