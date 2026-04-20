import React from 'react';
import { Search, Calendar, MessageCircle, User, Home, Gift } from 'lucide-react';

export interface NavigationItem {
  name: string;
  path: string;
  icon: React.ReactNode;
  exact?: boolean;
  keywords?: string[]; // For search functionality
}

export interface NavigationSection {
  title: string;
  items: NavigationItem[];
}

export const hirerNavigationSections: NavigationSection[] = [
  {
    title: 'Main',
    items: [
      {
        name: 'Dashboard',
        path: '/hirer',
        icon: <Home className="animated-icon" />,
        exact: true,
        keywords: ['dashboard', 'home', 'overview'],
      },
      {
        name: 'Find Musicians',
        path: '/hirer/search',
        icon: <Search className="animated-icon" />,
        keywords: ['search', 'find', 'musicians', 'browse'],
      },
      {
        name: 'My Profile',
        path: '/hirer/profile',
        icon: <User className="animated-icon" />,
        keywords: ['profile', 'account', 'settings', 'edit'],
      },
    ],
  },
  {
    title: 'Activities',
    items: [
      {
        name: 'My Bookings',
        path: '/hirer/bookings',
        icon: <Calendar className="animated-icon" />,
        keywords: ['bookings', 'appointments', 'schedule', 'calendar'],
      },
      {
        name: 'Messages',
        path: '/hirer/chat',
        icon: <MessageCircle className="animated-icon" />,
        keywords: ['messages', 'chat', 'conversations'],
      },
      {
        name: 'Referrals',
        path: '/hirer/referrals',
        icon: <Gift className="animated-icon" />,
        keywords: ['referrals', 'invite', 'rewards', 'points'],
      },
    ],
  },
];

export const musicianNavigationSections: NavigationSection[] = [
  {
    title: 'Main',
    items: [
      {
        name: 'Dashboard',
        path: '/musician',
        icon: <Home className="animated-icon" />,
        exact: true,
        keywords: ['dashboard', 'home', 'overview'],
      },
      {
        name: 'My Profile',
        path: '/musician/profile',
        icon: <User className="animated-icon" />,
        keywords: ['profile', 'account', 'settings', 'edit'],
      },
    ],
  },
  {
    title: 'Activities',
    items: [
      {
        name: 'My Bookings',
        path: '/musician/bookings',
        icon: <Calendar className="animated-icon" />,
        keywords: ['bookings', 'appointments', 'schedule', 'calendar'],
      },
      {
        name: 'Messages',
        path: '/musician/chat',
        icon: <MessageCircle className="animated-icon" />,
        keywords: ['messages', 'chat', 'conversations'],
      },
      {
        name: 'Referrals',
        path: '/musician/referrals',
        icon: <Gift className="animated-icon" />,
        keywords: ['referrals', 'invite', 'rewards', 'points'],
      },
    ],
  },
];

// Legacy flat arrays for backward compatibility (if needed)
export const hirerNavigationItems: NavigationItem[] = hirerNavigationSections.flatMap(
  (section) => section.items
);
export const musicianNavigationItems: NavigationItem[] = musicianNavigationSections.flatMap(
  (section) => section.items
);
