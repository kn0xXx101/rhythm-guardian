export type DashboardTourStep = {
  title: string;
  description: string;
};

export const hirerDashboardTourSteps: DashboardTourStep[] = [
  {
    title: 'Welcome (hirer)',
    description:
      'This short tour follows the hiring journey end to end. On mobile, open the sidebar to reach every area quickly.',
  },
  {
    title: 'Dashboard home',
    description:
      'Use /hirer as your overview: upcoming events, reminders, and anything that needs payment or confirmation.',
  },
  {
    title: 'Find musicians',
    description:
      'Go to Search (/hirer/search). Filter by instrument, availability, and budget. Musicians may list an hourly rate or a flat package price — the price filter treats flat fees as a full-package amount, so widen the range if you expect higher flat-rate gigs.',
  },
  {
    title: 'Profiles and locations',
    description:
      'Open profiles from results to compare rates, media, and availability. Map links help you sanity-check travel and venue location.',
  },
  {
    title: 'Book and pay in-app',
    description:
      'Create bookings from Search with your event details. Checkout runs through our payment partner; you’ll see amounts before you pay. Keep payment and messaging on the platform so records stay clear for support.',
  },
  {
    title: 'My Bookings lifecycle',
    description:
      'Track every request in /hirer/bookings: pending, accepted, and post-event. After the event window, bookings may enter a confirmation phase before closing — both sides should confirm service when things went as agreed.',
  },
  {
    title: 'Confirm service',
    description:
      'Use Complete Service after the performance. When you and the musician have both confirmed, payout processing can proceed according to the booking’s payment state and platform rules.',
  },
  {
    title: 'Refunds and disputes',
    description:
      'If something goes wrong, use in-app flows and accurate details first. Admins can review with platform records when escalation is needed.',
  },
  {
    title: 'Chat, assistant, and notifications',
    description:
      'Use Chat (/hirer/chat) for booking conversations. The AI Assistant entry helps with how-to questions and can escalate to a support ticket if you ask to connect to an admin. Check /notifications for booking and payment updates.',
  },
  {
    title: 'Favorites, referrals, settings',
    description:
      'Shortlist on /favorites, share referrals on /hirer/referrals, and keep /hirer/settings and /hirer/profile current so bookings stay accurate.',
  },
];

export const musicianDashboardTourSteps: DashboardTourStep[] = [
  {
    title: 'Welcome (musician)',
    description:
      'This tour covers profile setup, bookings, payouts, and staying safe on-platform.',
  },
  {
    title: 'Dashboard overview',
    description:
      'Start at /musician for what needs action now: new requests, upcoming gigs, and payout-related states.',
  },
  {
    title: 'Profile and pricing model',
    description:
      'At /musician/profile set instruments, genres, location, and whether you charge hourly or a flat fee. Flat-fee completion counts toward profile completion like hourly rates. Verification badges follow admin review of documents.',
  },
  {
    title: 'Bookings',
    description:
      'Use /musician/bookings to accept or decline, run the gig, and track status after the event. Prefer confirming timing and scope in-app.',
  },
  {
    title: 'Confirm rendering',
    description:
      'After you perform, use Confirm Rendering. When the hirer also confirms completion, payout steps can advance per platform and payment rules.',
  },
  {
    title: 'What you earn',
    description:
      'Booking cards show the gig total and, where available, your estimated net after platform and payment processing fees. Keep payout bank or mobile-money details accurate in settings.',
  },
  {
    title: 'Chat and AI assistant',
    description:
      'Use /musician/chat for clients. The AI Assistant can answer product questions and escalate to support when you ask for an admin.',
  },
  {
    title: 'Notifications',
    description:
      '/notifications keeps you aligned on bookings, confirmations, and payout-related events.',
  },
  {
    title: 'Referrals and reviews',
    description:
      'Grow via /musician/referrals and strong reviews; keep availability and rates updated so search stays trustworthy.',
  },
];

export const adminDashboardTourSteps: DashboardTourStep[] = [
  {
    title: 'Welcome (admin)',
    description:
      'This orientation covers users, bookings, money movement, support, and settings.',
  },
  {
    title: 'Overview',
    description:
      'Use /admin for high-level KPIs and where to drill in when something needs attention.',
  },
  {
    title: 'Users and verification',
    description:
      'Manage accounts at /admin/users (including careful deletion of non-admin accounts — database and auth should stay in sync via the admin edge flow). Review musician verification at /admin/verifications.',
  },
  {
    title: 'Bookings',
    description:
      'Use /admin/bookings for lifecycle states: pending, paid, confirmation windows, completed, expired, and exceptions.',
  },
  {
    title: 'Transactions and payouts',
    description:
      'Use /admin/transactions to monitor payments and releases; keep actions auditable and aligned with notifications.',
  },
  {
    title: 'Communications and support',
    description:
      'Use /admin/communications for chats and tickets; tie resolutions to in-platform evidence where possible.',
  },
  {
    title: 'Risk and fraud',
    description:
      'Use /admin/fraud-monitoring and related tools for patterns that bypass fees or safety controls.',
  },
  {
    title: 'Settings and deployment',
    description:
      'Configure defaults under /admin/settings and /admin/deployment (branding, operations, security).',
  },
  {
    title: 'Operational loop',
    description:
      'Treat notifications and audits as your loop: detect issues, verify facts, resolve, and document.',
  },
];
