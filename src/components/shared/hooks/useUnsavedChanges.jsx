/**
 * Hook to detect unsaved form changes and warn user before navigation
 */

import { useEffect, useState, useCallback } from 'react';
import { useBeforeUnload } from 'react-router-dom';

export function useUnsavedChanges(hasUnsavedChanges) {
  const [showWarning, setShowWarning] = useState(false);

  // Warn on browser close/reload
  useBeforeUnload(
    useCallback(
      (event) => {
        if (hasUnsavedChanges) {
          event.preventDefault();
          return (event.returnValue = 'You have unsaved changes. Are you sure you want to leave?');
        }
      },
      [hasUnsavedChanges]
    )
  );

  // Warn on component unmount (navigation)
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  return { showWarning, setShowWarning };
}

/**
 * Hook to prompt user before navigation if changes exist
 */
export function useNavigationPrompt(when, message = 'You have unsaved changes. Discard them?') {
  useEffect(() => {
    if (!when) return;

    const handleClick = (e) => {
      const target = e.target.closest('a[href], button[type="button"]');
      if (!target) return;

      if (target.hasAttribute('data-bypass-prompt')) return;

      const shouldPrompt = window.confirm(message);
      if (!shouldPrompt) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    document.addEventListener('click', handleClick, true);
    return () => document.removeEventListener('click', handleClick, true);
  }, [when, message]);
}