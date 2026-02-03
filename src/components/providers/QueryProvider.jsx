/**
 * TanStack Query Provider with Global Error Handling
 */

import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { showErrorToast, isAuthError } from '@/components/shared/errorHandling';
import { base44 } from '@/api/base44Client';

// Create QueryClient with global error handling
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Global error handler for all queries
      onError: (error) => {
        // Handle authentication errors
        if (isAuthError(error)) {
          base44.auth.redirectToLogin(window.location.pathname);
          return;
        }
        
        // Show user-friendly error toast
        showErrorToast(error);
      },
      // Retry configuration
      retry: (failureCount, error) => {
        // Don't retry on auth errors
        if (isAuthError(error)) return false;
        
        // Don't retry on client errors (4xx)
        if (error?.response?.status >= 400 && error?.response?.status < 500) {
          return false;
        }
        
        // Retry up to 2 times for server errors
        return failureCount < 2;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      // Stale time defaults
      staleTime: 5000, // Data considered fresh for 5 seconds
      gcTime: 10 * 60 * 1000, // Cache kept for 10 minutes
      // Refetch config
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      refetchOnMount: true
    },
    mutations: {
      // Global error handler for all mutations
      onError: (error) => {
        // Handle authentication errors
        if (isAuthError(error)) {
          base44.auth.redirectToLogin(window.location.pathname);
          return;
        }
        
        // Show user-friendly error toast
        showErrorToast(error);
      },
      // Don't retry mutations by default
      retry: false
    }
  }
});

export function QueryProvider({ children }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

export { queryClient };