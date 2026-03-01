import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

/**
 * Single source of truth for authenticated user
 * Use this hook throughout the app instead of separate useQuery calls
 */
export function useAuth() {
  const { data: user, isLoading, error } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      try {
        return await base44.auth.me();
      } catch (err) {
        const status = err?.response?.status || err?.status;
        if (status === 401 && !window.location.hostname.includes('preview')) {
          base44.auth.redirectToLogin(window.location.pathname);
          return null;
        }
        // For non-auth errors (network, etc.), throw so React Query can retry
        if (status !== 401) throw err;
        return null;
      }
    },
    staleTime: Infinity,
    gcTime: Infinity,
    retry: (failureCount, err) => {
      const status = err?.response?.status || err?.status;
      // Don't retry auth failures, retry transient errors up to 3x
      if (status === 401 || status === 403) return false;
      return failureCount < 3;
    },
    refetchOnWindowFocus: true,
    refetchOnMount: false,
    refetchInterval: false,
    refetchIntervalInBackground: false
  });

  return { user, isLoading, error };
}