/**
 * useErrorBanner
 * ==============
 * State hook to wire up ErrorBanner to any page or component.
 *
 * Usage:
 *   const { bannerProps, showError, clearError } = useErrorBanner();
 *   // In a query onError:
 *   onError: (err) => showError(err, 'Task')
 *   // In JSX:
 *   <ErrorBanner {...bannerProps} onRetry={refetch} onSaveLocally={saveDraft} />
 */

import { useState, useCallback } from 'react';

export function useErrorBanner() {
  const [state, setState] = useState({ visible: false, error: null, resourceName: null, timestamp: null });

  const showError = useCallback((error, resourceName) => {
    setState({ visible: true, error, resourceName: resourceName || null, timestamp: new Date() });
  }, []);

  const clearError = useCallback(() => {
    setState({ visible: false, error: null, resourceName: null, timestamp: null });
  }, []);

  return {
    bannerProps: {
      error:        state.error,
      resourceName: state.resourceName,
      timestamp:    state.timestamp,
      isVisible:    state.visible,
      onDismiss:    clearError,
    },
    showError,
    clearError,
    hasError: state.visible,
  };
}