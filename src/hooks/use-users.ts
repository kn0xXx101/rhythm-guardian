import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { userService, type UserProfile } from '@/services/user';
import { queryKeys } from '@/lib/query-keys';

/**
 * React Query hook for fetching users with optional filters
 */
export function useUsers(filters?: { role?: string; status?: string; search?: string }) {
  return useQuery({
    queryKey: queryKeys.users.list(filters),
    queryFn: () => userService.getUsers(filters),
    staleTime: 1000 * 60 * 2, // 2 minutes - user data changes less frequently
  });
}

/**
 * React Query hook for fetching a single user profile by ID
 */
export function useUserProfile(userId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.users.detail(userId || ''),
    queryFn: () => {
      if (!userId) return null;
      return userService.getUserProfile(userId);
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5, // 5 minutes - individual profiles change rarely
  });
}

/**
 * React Query hook for updating user profile with optimistic update
 */
export function useUpdateUserProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, updates }: { userId: string; updates: Partial<UserProfile> }) =>
      userService.updateUserProfile(userId, updates),
    onMutate: async ({ userId, updates }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.users.detail(userId) });
      await queryClient.cancelQueries({ queryKey: queryKeys.users.all });

      // Snapshot previous values
      const previousProfile = queryClient.getQueryData<UserProfile | null>(
        queryKeys.users.detail(userId)
      );
      const previousUsers = queryClient.getQueryData<UserProfile[]>(queryKeys.users.all);

      // Optimistically update profile
      if (previousProfile) {
        queryClient.setQueryData<UserProfile>(queryKeys.users.detail(userId), {
          ...previousProfile,
          ...updates,
        });
      }

      // Optimistically update users list
      if (previousUsers) {
        queryClient.setQueryData<UserProfile[]>(queryKeys.users.all, (old = []) =>
          old.map((user) => (user.userId === userId ? { ...user, ...updates } : user))
        );
      }

      return { previousProfile, previousUsers };
    },
    onError: (_err, { userId }, context) => {
      // Rollback on error
      if (context?.previousProfile !== undefined) {
        queryClient.setQueryData(queryKeys.users.detail(userId), context.previousProfile);
      }
      if (context?.previousUsers !== undefined) {
        queryClient.setQueryData(queryKeys.users.all, context.previousUsers);
      }
    },
    onSuccess: (_data, { userId }) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: queryKeys.users.detail(userId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
    },
  });
}

/**
 * React Query hook for updating user status (admin operation) with optimistic update
 */
export function useUpdateUserStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      userId,
      status,
    }: {
      userId: string;
      status: 'active' | 'pending' | 'suspended' | 'banned';
    }) => userService.updateUserStatus(userId, status),
    onMutate: async ({ userId, status }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.users.all });

      const previousUsers = queryClient.getQueryData<UserProfile[]>(queryKeys.users.all);
      const previousProfile = queryClient.getQueryData<UserProfile | null>(
        queryKeys.users.detail(userId)
      );

      // Optimistically update
      queryClient.setQueryData<UserProfile[]>(queryKeys.users.all, (old = []) =>
        old.map((user) => (user.userId === userId ? { ...user, status } : user))
      );

      if (previousProfile) {
        queryClient.setQueryData<UserProfile>(queryKeys.users.detail(userId), {
          ...previousProfile,
          status,
        });
      }

      return { previousUsers, previousProfile };
    },
    onError: (_err, { userId }, context) => {
      // Rollback on error
      if (context?.previousUsers !== undefined) {
        queryClient.setQueryData(queryKeys.users.all, context.previousUsers);
      }
      if (context?.previousProfile !== undefined) {
        queryClient.setQueryData(queryKeys.users.detail(userId), context.previousProfile);
      }
    },
    onSuccess: (_data, { userId }) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: queryKeys.users.detail(userId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
    },
  });
}

/**
 * React Query hook for searching users
 */
export function useSearchUsers(query: string, filters?: { role?: string; status?: string }) {
  return useQuery({
    queryKey: [...queryKeys.users.all, 'search', query, filters],
    queryFn: () => userService.searchUsers(query, filters),
    enabled: query.length > 0, // Only run if there's a search query
    staleTime: 1000 * 30, // 30 seconds - search results can change
  });
}

/**
 * Infinite query hook for paginated users
 */
export function useUsersInfinite(filters?: { role?: string; status?: string; search?: string }) {
  return useInfiniteQuery({
    queryKey: queryKeys.users.infinite(filters),
    queryFn: async ({ pageParam = 0 }) => {
      const allUsers = await userService.getUsers(filters);
      const pageSize = 20;
      const start = pageParam * pageSize;
      const end = start + pageSize;
      return {
        data: allUsers.slice(start, end),
        nextCursor: end < allUsers.length ? pageParam + 1 : undefined,
      };
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });
}
