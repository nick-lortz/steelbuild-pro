import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

const IS_PREVIEW = window.location.hostname.includes('preview') || 
                   window.location.hostname.includes('sandbox');

/**
 * Centralized auth: login, logout, me — single source of truth.
 * Handles 401 (redirect to login) vs 404 (env mismatch — stop further calls).
 */
export function useAuth() {
  const { data: user, isLoading, error } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      try {
        return await base44.auth.me();
      } catch (err) {
        const status = err?.response?.status ?? err?.status;
        if (status === 401) {
          if (!IS_PREVIEW) {
            base44.auth.redirectToLogin(window.location.pathname);
          }
          return null;
        }
        if (status === 404) {
          // App not found — environment mismatch, surface to UI
          console.error('[AUTH] App not found (404). Check environment config.');
          return { __env_error__: true };
        }
        return null;
      }
    },
    staleTime: 0,
    gcTime: 5 * 60 * 1000,
    retry: false,
    refetchOnWindowFocus: true,
    refetchOnMount: 'always',
  });

  const isEnvError = user?.__env_error__ === true;

  return {
    user: isEnvError ? null : user,
    isLoading,
    error,
    isEnvError,
  };
}

/**
 * Use this everywhere instead of calling base44.auth directly.
 */
export function useAuthActions() {
  const queryClient = useQueryClient();

  const logout = async () => {
    // Clear all cached state immediately so UI reflects logged-out instantly
    queryClient.setQueryData(['currentUser'], null);
    queryClient.removeQueries({ queryKey: ['currentUser'] });
    queryClient.removeQueries({ queryKey: ['activeProject'] });
    queryClient.removeQueries({ queryKey: ['projects'] });
    try {
      await base44.auth.logout();
    } catch (e) {
      console.error('[AUTH] logout failed, forcing hard redirect', e);
      window.location.href = '/';
    }
  };

  const login = async (nextUrl) => {
    try {
      const isAuthenticated = await base44.auth.isAuthenticated();
      if (isAuthenticated) {
        window.location.href = nextUrl || '/';
        return;
      }
    } catch (e) {
      // fall through
    }
    base44.auth.redirectToLogin(nextUrl || window.location.pathname);
  };

  return { logout, login };
}