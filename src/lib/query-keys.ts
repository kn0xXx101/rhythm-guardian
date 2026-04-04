/**
 * Centralized query key factory for React Query
 * Provides type-safe, consistent query keys throughout the application
 */

export const queryKeys = {
  // Bookings
  bookings: {
    all: ['bookings'] as const,
    lists: () => [...queryKeys.bookings.all, 'list'] as const,
    list: (filters?: { userId?: string; status?: string }) =>
      [...queryKeys.bookings.lists(), filters] as const,
    details: () => [...queryKeys.bookings.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.bookings.details(), id] as const,
    infinite: (filters?: { userId?: string; status?: string }) =>
      [...queryKeys.bookings.all, 'infinite', filters] as const,
  },

  // Messages/Chat
  messages: {
    all: ['messages'] as const,
    lists: () => [...queryKeys.messages.all, 'list'] as const,
    list: (chatId?: string) => [...queryKeys.messages.lists(), chatId] as const,
    details: () => [...queryKeys.messages.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.messages.details(), id] as const,
    infinite: (chatId?: string) => [...queryKeys.messages.all, 'infinite', chatId] as const,
    conversations: () => [...queryKeys.messages.all, 'conversations'] as const,
  },

  // Users/Profiles
  users: {
    all: ['users'] as const,
    lists: () => [...queryKeys.users.all, 'list'] as const,
    list: (filters?: { role?: string; status?: string }) =>
      [...queryKeys.users.lists(), filters] as const,
    details: () => [...queryKeys.users.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.users.details(), id] as const,
    profile: (id?: string) => [...queryKeys.users.all, 'profile', id] as const,
    infinite: (filters?: { role?: string; status?: string }) =>
      [...queryKeys.users.all, 'infinite', filters] as const,
  },

  // Transactions
  transactions: {
    all: ['transactions'] as const,
    lists: () => [...queryKeys.transactions.all, 'list'] as const,
    list: (filters?: { userId?: string; type?: string }) =>
      [...queryKeys.transactions.lists(), filters] as const,
    details: () => [...queryKeys.transactions.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.transactions.details(), id] as const,
    summary: (userId?: string) => [...queryKeys.transactions.all, 'summary', userId] as const,
    infinite: (filters?: { userId?: string; type?: string }) =>
      [...queryKeys.transactions.all, 'infinite', filters] as const,
  },

  // Analytics/Dashboard
  analytics: {
    all: ['analytics'] as const,
    dashboard: () => [...queryKeys.analytics.all, 'dashboard'] as const,
    stats: (type?: string) => [...queryKeys.analytics.all, 'stats', type] as const,
  },
} as const;
