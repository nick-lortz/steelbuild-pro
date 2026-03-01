import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';

/**
 * Ensures Base44 SDK is fully initialized with valid appId before running queries.
 * In preview mode, appId may be injected asynchronously.
 * Returns true only when SDK is ready and has a valid app context.
 */
export function useAppReady() {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    let checks = 0;
    const maxChecks = 20; // ~2 seconds with 100ms intervals

    const checkReady = async () => {
      try {
        // Attempt to access app context; if appId is null, this will fail
        const appId = window.__BASE44_APP_ID__ || 
                     (typeof base44?.config?.appId === 'string' ? base44.config.appId : null);
        
        if (!appId && checks < maxChecks) {
          checks++;
          setTimeout(checkReady, 100);
          return;
        }

        if (mounted) {
          if (appId) {
            setIsReady(true);
            setError(null);
            console.log('[AppReady] SDK initialized with appId:', appId);
          } else {
            setError('App context not available in this environment');
            console.error('[AppReady] Failed to initialize: appId is null after max retries');
          }
        }
      } catch (err) {
        if (mounted) {
          setError(err.message);
          console.error('[AppReady] Initialization error:', err);
        }
      }
    };

    checkReady();

    return () => {
      mounted = false;
    };
  }, []);

  return { isReady, error };
}