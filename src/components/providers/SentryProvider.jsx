import React, { useEffect } from 'react';

let sentryInstance = null;
let sentryInitialized = false;

export function initSentry() {
  // Only init in production
  if (typeof window === 'undefined' || window.location.hostname === 'localhost' || sentryInitialized) {
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
    sentryInstance = Sentry;
    const sentryAny = /** @type {any} */ (Sentry);
    
    Sentry.init({
      dsn,
      environment: env.VITE_APP_ENV || 'production',
      tracesSampleRate: 0.2, // 20% transaction sampling
      profilesSampleRate: 0.1, // 10% profiling
      replaysSessionSampleRate: 0.05, // 5% session replay
      replaysOnErrorSampleRate: 1.0, // 100% replay on error
      
      integrations: [
        new sentryAny.BrowserTracing({
          tracePropagationTargets: ["localhost", /^https:\/\/.*\.base44\.com/],
        }),
        new sentryAny.Replay({ maskAllText: true, blockAllMedia: true }),
      ],

      // Privacy: scrub sensitive data
      beforeSend(event, hint) {
        // Remove PII from breadcrumbs
        if (event.breadcrumbs) {
          event.breadcrumbs = event.breadcrumbs.map(crumb => {
            if (crumb.data) {
              const { notes, attachments, description, ...safe } = crumb.data;
              return { ...crumb, data: safe };
            }
            return crumb;
          });
        }
        
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
      
      ignoreErrors: [
        'ResizeObserver loop limit exceeded',
        'Non-Error promise rejection captured',
      ],
    });
    
    sentryInitialized = true;
  });
}

// Set user context when available
export function setSentryUser(user) {
  if (!sentryInstance || !sentryInitialized) return;
  
  sentryInstance.setUser(user ? {
    id: user.id,
    email: user.email,
    role: user.role,
  } : null);
}

// Set project context
export function setSentryContext(key, data) {
  if (!sentryInstance || !sentryInitialized) return;
  sentryInstance.setContext(key, data);
}

// Add breadcrumb for user actions
export function addSentryBreadcrumb(category, message, data = {}) {
  if (!sentryInstance || !sentryInitialized) return;
  
  sentryInstance.addBreadcrumb({
    category,
    message,
    level: 'info',
    data,
  });
}

// Capture exception with context
export function captureSentryException(error, context = {}) {
  if (!sentryInstance || !sentryInitialized) return;
  
  sentryInstance.captureException(error, {
    contexts: context,
  });
}

// Start performance transaction
export function startSentryTransaction(name, op = 'navigation') {
  if (!sentryInstance || !sentryInitialized) return null;
  
  return sentryInstance.startTransaction({
    name,
    op,
  });
}

export function SentryProvider({ children }) {
  useEffect(() => {
    initSentry();
  }, []);

  return children;
}

export default SentryProvider;