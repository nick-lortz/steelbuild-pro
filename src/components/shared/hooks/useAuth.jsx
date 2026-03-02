import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

/**
 * Single source of truth for authenticated user.
 */
export function useAuth() {
  const { data: user, isLoading, error } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      try {
        return await base44.auth.me();
      } catch (err) {
        return null;
      }
    },
    staleTime: Infinity,
    gcTime: Infinity,
    retry: false,
    refetchOnWindowFocus: true,
    refetchOnMount: false,
    refetchInterval: false,
    refetchIntervalInBackground: false
  });

  return { user, isLoading, error };
}