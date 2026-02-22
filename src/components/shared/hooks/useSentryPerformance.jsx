import { useEffect, useRef } from 'react';
import { startSentryTransaction, addSentryBreadcrumb } from '@/components/providers/SentryProvider';

/**
 * Track performance for data fetching operations
 */
export function useSentryPerformance(operationName, enabled = true) {
  const transactionRef = useRef(null);

  const startSpan = (spanName, op = 'http.client') => {
    if (!enabled || !transactionRef.current) return null;
    
    return transactionRef.current.startChild({
      op,
      description: spanName,
    });
  };

  const finishSpan = (span) => {
    if (span) span.finish();
  };

  useEffect(() => {
    if (!enabled) return;

    transactionRef.current = startSentryTransaction(operationName, 'navigation');
    
    return () => {
      if (transactionRef.current) {
        transactionRef.current.finish();
      }
    };
  }, [operationName, enabled]);

  return { startSpan, finishSpan };
}

/**
 * Track mutations with breadcrumbs
 */
export function useSentryMutation(entityName) {
  return {
    onMutate: (variables) => {
      addSentryBreadcrumb(
        'mutation',
        `${entityName} mutation started`,
        { entity: entityName, action: 'create/update' }
      );
    },
    onSuccess: () => {
      addSentryBreadcrumb(
        'mutation',
        `${entityName} mutation succeeded`,
        { entity: entityName, status: 'success' }
      );
    },
    onError: (error) => {
      addSentryBreadcrumb(
        'mutation',
        `${entityName} mutation failed`,
        { entity: entityName, status: 'error', error: error.message }
      );
    },
  };
}

/**
 * Track user navigation
 */
export function trackNavigation(from, to, metadata = {}) {
  addSentryBreadcrumb(
    'navigation',
    `Navigated from ${from} to ${to}`,
    metadata
  );
}

/**
 * Track filter/sort changes
 */
export function trackFilterChange(module, filters) {
  addSentryBreadcrumb(
    'ui.interaction',
    `${module} filters changed`,
    { module, filters }
  );
}