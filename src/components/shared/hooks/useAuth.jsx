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
        if ((err?.response?.status === 401 || err?.status === 401) && 
            !window.location.hostname.includes('preview')) {
          base44.auth.redirectToLogin(window.location.pathname);
          return null;
        }
        return null;
      }
    },
    staleTime: 0,
    gcTime: 5 * 60 * 1000,
    retry: false,
    refetchOnWindowFocus: true,
    refetchOnMount: 'always'
  });

  return { user, isLoading, error };
}