import { useEffect } from 'react';

export function initSentry() {
  // Only init in production
  if (typeof window === 'undefined' || window.location.hostname === 'localhost') {
    return;
  }

  const env = /** @type {any} */ (import.meta).env || {};
  const dsn = env.VITE_SENTRY_DSN;
  if (!dsn) {
    console.warn('Sentry DSN not configured');
    return;
  }

  // Lazy load Sentry
  import('@sentry/react').then((Sentry) => {
    const sentryAny = /** @type {any} */ (Sentry);
    Sentry.init({
      dsn,
      environment: env.VITE_APP_ENV || 'production',
      tracesSampleRate: 0.1, // 10% transaction sampling
      replaysSessionSampleRate: 0.05, // 5% session replay
      replaysOnErrorSampleRate: 1.0, // 100% replay on error
      
      integrations: [
        new sentryAny.Replay({ maskAllText: true, blockAllMedia: true }),
      ],

      // Filter out noise
      beforeSend(event) {
        // Ignore network errors (usually user connection)
        if (event.exception?.values[0]?.value?.includes('Network')) {
          return null;
        }
        // Ignore aborted requests (user navigated away)
        if (event.exception?.values[0]?.value?.includes('abort')) {
          return null;
        }
        return event;
      },
    });
  });
}

export function SentryProvider({ children }) {
  useEffect(() => {
    initSentry();
  }, []);

  return children;
}

export default SentryProvider;
