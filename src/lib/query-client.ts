import { QueryClient } from '@tanstack/react-query';

/**
 * Enhanced QueryClient configuration with stale-while-revalidate caching strategy
 * - Stale time: 5 minutes (data is considered fresh for 5 minutes)
 * - Cache time: 10 minutes (unused data stays in cache for 10 minutes)
 * - Retry: 1 attempt for failed requests
 * - Refetch on window focus: disabled (reduce unnecessary refetches)
 * - Refetch on mount: false (use cached data when available, background refetch if stale)
 * 
 * This implements a stale-while-revalidate pattern where:
 * - Fresh data (< 5min) is served immediately from cache
 * - Stale data (5-10min) is served from cache while refetching in background
 * - Data older than 10min is removed from cache and fresh fetch is required
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes - data is considered fresh
      gcTime: 1000 * 60 * 10, // 10 minutes - unused data stays in cache
      retry: 1,
      refetchOnWindowFocus: false, // Don't refetch when window regains focus
      refetchOnReconnect: true, // Refetch when network reconnects
      refetchOnMount: false, // Use cached data, background refetch if stale
    },
    mutations: {
      retry: 1,
      // Optimistic updates and error rollback handled per mutation
    },
  },
});

