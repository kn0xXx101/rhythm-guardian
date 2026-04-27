export type DashboardTourStep = {
  title: string;
  description: string;
};

export const hirerDashboardTourSteps: DashboardTourStep[] = [
  {
    title: 'Welcome to Rhythm Guardian (Hirer)',
    description:
      'This onboarding shows the complete hiring flow. On mobile, open the sidebar menu to reach every feature quickly.',
  },
  {
    title: 'Dashboard home and next actions',
    description:
      'Start at /hirer to review key stats, reminders, and alerts. Use this page as your command center for upcoming events, confirmations, and payment follow-ups.',
  },
  {
    title: 'Find musicians by city, town, or region',
    description:
      'Go to /hirer/search. Filter by instrument, style, budget, and location. Region-aware matching supports town-to-city coverage so your search results reflect your operational area.',
  },
  {
    title: 'View profile details and map links',
    description:
      'From search results, open musician profiles to review rates, media, and availability. Use direct Google Maps links to verify location and plan travel.',
  },
  {
    title: 'Create bookings and pay securely',
    description:
      'Book from /hirer/search with event details, date/time, and location. Payments are handled in-app and tracked so support and refunds rely on verified platform records.',
  },
  {
    title: 'Track booking lifecycle clearly',
    description:
      'Manage all requests in /hirer/bookings. After an event ends, bookings move into the waiting confirmation window before becoming expired, giving both sides time to confirm service.',
  },
  {
    title: 'Confirm service and release payouts',
    description:
      'Use Complete Service after performance delivery. When both parties confirm, payout release is triggered automatically and lifecycle notifications are sent to relevant users and admins.',
  },
  {
    title: 'Refund and dispute workflow',
    description:
      'If needed, submit refund/escalation only after the waiting confirmation window. Provide truthful attestations and details so admin review can resolve disputes with audit visibility.',
  },
  {
    title: 'Messages, reminders, and alerts',
    description:
      'Use /hirer/chat for in-app conversations and /notifications for booking/payment reminders. Keep communication in-platform to preserve protection and evidence.',
  },
  {
    title: 'Favorites, referrals, and account settings',
    description:
      'Use /favorites to shortlist musicians, /hirer/referrals for referral rewards, and /hirer/settings + /hirer/profile to keep account, preferences, and event details accurate.',
  },
];

export const musicianDashboardTourSteps: DashboardTourStep[] = [
  {
    title: 'Welcome to Rhythm Guardian (Musician)',
    description:
      'This onboarding walks through profile setup, booking execution, and payout flow so you can operate confidently from day one.',
  },
  {
    title: 'Dashboard and operational overview',
    description:
      'Start at /musician to monitor booking volume, pending actions, earnings signals, and reminders. This view highlights what needs action now.',
  },
  {
    title: 'Complete profile and verification',
    description:
      'Update /musician/profile with instruments, genres, rates, town/city location, and media. Submit verification documents; badge status is granted only after admin validation.',
  },
  {
    title: 'Receive and manage bookings',
    description:
      'Use /musician/bookings to accept, schedule, and complete gigs. Track waiting confirmation status after event end time and avoid off-platform arrangements.',
  },
  {
    title: 'Service confirmation and payout release',
    description:
      'After performance, use Confirm Rendering in /musician/bookings. Once both sides confirm, payout release is automatically processed and recorded.',
  },
  {
    title: 'Payout readiness and payment details',
    description:
      'Ensure payout account details are correct in your profile settings. In-app payment status and confirmation state determine payout eligibility and release timing.',
  },
  {
    title: 'Chat and trust-safe communication',
    description:
      'Use /musician/chat for all booking communication. Keeping messages and confirmations in-platform improves safety, evidence quality, and dispute handling.',
  },
  {
    title: 'Notifications and reminders',
    description:
      'Use /notifications to stay synced on booking updates, confirmations, and payout events. Respond quickly to reduce delays in completion and payment.',
  },
  {
    title: 'Referrals, reviews, and growth',
    description:
      'Grow with /musician/referrals, maintain quality through reviews, and keep availability/profile data accurate so hirers can confidently book you.',
  },
];

export const adminDashboardTourSteps: DashboardTourStep[] = [
  {
    title: 'Welcome to Rhythm Guardian Admin Console',
    description:
      'This orientation covers the full operational control path: users, bookings, verifications, payments, support, and system settings.',
  },
  {
    title: 'Admin overview and platform health',
    description:
      'Use /admin for aggregate KPIs and activity visibility. This is the fastest entry point for system state before deep operational actions.',
  },
  {
    title: 'Users and verification operations',
    description:
      'Manage accounts at /admin/users and review musician verification at /admin/verifications. Verification relies on profile completeness plus document checks.',
  },
  {
    title: 'Bookings and lifecycle enforcement',
    description:
      'Use /admin/bookings to monitor statuses including waiting confirmation and expired. Review confirmation state, payment progression, and exceptions requiring intervention.',
  },
  {
    title: 'Transactions, payouts, and auditability',
    description:
      'Use /admin/transactions for payment monitoring and payout tracking. Release and failure paths should remain visible through in-app notifications and logs.',
  },
  {
    title: 'Communications and support management',
    description:
      'Use /admin/communications for chats, support tickets, and monitoring tools. Keep dispute and support actions tied to in-platform evidence.',
  },
  {
    title: 'Fraud monitoring and risk controls',
    description:
      'Use /admin/fraud-monitoring and related alerts to detect suspicious behavior, off-platform payment risk, and policy circumvention patterns.',
  },
  {
    title: 'Settings, deployment, and policy controls',
    description:
      'Use /admin/settings and /admin/deployment to configure platform defaults (theme, typography, onboarding context, security, and operations).',
  },
  {
    title: 'You are ready to operate',
    description:
      'Follow notifications and audits as your primary operational loop: detect, verify, resolve, and document. This keeps the marketplace reliable and transparent.',
  },
];
