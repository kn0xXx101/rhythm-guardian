import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export interface SearchUser {
  userId: string;
  fullName: string;
  location?: string;
  avatarUrl?: string;
  role?: string;
}

/**
 * React Query hook for searching users/musicians by name
 */
export function useSearchUsers(query: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['searchUsers', query],
    queryFn: async (): Promise<SearchUser[]> => {
      if (!query.trim()) return [];

      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, full_name, location, avatar_url, role')
        .or(`full_name.ilike.%${query}%,location.ilike.%${query}%`)
        .eq('status', 'active')
        .neq('role', 'admin')
        .limit(10);

      if (error) throw error;

      return (data || []).map((profile) => ({
        userId: profile.user_id,
        fullName: profile.full_name || 'Unknown',
        location: profile.location || undefined,
        avatarUrl: profile.avatar_url || undefined,
        role: profile.role || undefined,
      }));
    },
    enabled: options?.enabled !== false && query.trim().length > 0,
    staleTime: 1000 * 30, // 30 seconds
  });
}
