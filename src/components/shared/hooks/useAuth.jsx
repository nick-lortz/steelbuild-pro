import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAppReady } from './useAppReady';

/**
 * Single source of truth for authenticated user.
 * Will not fire until appId is resolved to prevent /api/apps/null calls.
 */
export function useAuth() {
  const { isReady } = useAppReady();

  const { data: user, isLoading, error } = useQuery({
    queryKey: ['currentUser'],
    enabled: isReady,
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

  return { user, isLoading: !isReady || isLoading, error };
}