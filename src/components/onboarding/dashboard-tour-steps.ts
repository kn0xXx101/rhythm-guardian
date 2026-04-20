export type DashboardTourStep = {
  title: string;
  description: string;
};

export const hirerDashboardTourSteps: DashboardTourStep[] = [
  {
    title: 'Welcome to Rhythm Guardian',
    description:
      'This short tour shows where to find key tools. Use the menu (☰) on mobile to open navigation anytime.',
  },
  {
    title: 'Find & book musicians',
    description:
      'Go to Find Musicians to search, compare profiles, and start a booking. Availability and pricing are shown before you pay.',
  },
  {
    title: 'Bookings & payments',
    description:
      'My Bookings is where you track events, messages, and payment status. After the event, use Complete Service so the musician can be paid from escrow.',
  },
  {
    title: 'Messages & notifications',
    description:
      'Use Messages to chat with musicians you are connected with. The bell icon keeps you updated on bookings and reminders.',
  },
  {
    title: 'Your profile',
    description:
      'Keep My Profile up to date so musicians know who they are working with. You are all set — explore the dashboard when you are ready.',
  },
];

export const musicianDashboardTourSteps: DashboardTourStep[] = [
  {
    title: 'Welcome to Rhythm Guardian',
    description:
      'This short tour highlights how to get bookings and get paid. On mobile, tap the menu (☰) to move around the app.',
  },
  {
    title: 'Profile & verification',
    description:
      'Complete My Profile with instruments, rates, and availability. Submit verification documents; a verified badge appears only after admin review.',
  },
  {
    title: 'Bookings & payouts',
    description:
      'My Bookings lists upcoming and past gigs. After the scheduled end time, use Confirm Rendering. Payout moves forward once both you and the hirer confirm.',
  },
  {
    title: 'Dashboard & earnings',
    description:
      'The dashboard summarizes bookings and earnings. Platform and processing fees are shown before hirers pay; rates applied to a booking stay fixed for that booking.',
  },
  {
    title: 'Messages & notifications',
    description:
      'Reply to hirers in Messages. Notifications help you catch booking updates and confirmation reminders. You are ready to go.',
  },
];
