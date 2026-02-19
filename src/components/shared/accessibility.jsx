/**
 * WCAG 2.1 AA Accessibility Utilities
 * Steel Construction Industry Standards
 */

/**
 * Keyboard navigation handler for custom components
 */
export function handleKeyboardNav(event, onEnter, onEscape) {
  switch (event.key) {
    case 'Enter':
    case ' ':
      event.preventDefault();
      if (onEnter) onEnter(event);
      break;
    case 'Escape':
      event.preventDefault();
      if (onEscape) onEscape(event);
      break;
    case 'Tab':
      // Allow default tab behavior
      break;
    default:
      break;
  }
}

import React from 'react';

/**
 * Focus trap for modals (WCAG 2.1 AA requirement)
 */
export function useFocusTrap(isOpen, containerRef) {
  React.useEffect(() => {
    if (!isOpen || !containerRef.current) return;

    const container = containerRef.current;
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    // Focus first element on open
    firstElement?.focus();

    const handleTabKey = (e) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault();
        lastElement?.focus();
      } else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault();
        firstElement?.focus();
      }
    };

    container.addEventListener('keydown', handleTabKey);
    return () => container.removeEventListener('keydown', handleTabKey);
  }, [isOpen, containerRef]);
}

/**
 * Announce changes to screen readers
 */
export function announceToScreenReader(message, priority = 'polite') {
  const announcement = document.createElement('div');
  announcement.setAttribute('role', 'status');
  announcement.setAttribute('aria-live', priority);
  announcement.setAttribute('aria-atomic', 'true');
  announcement.className = 'sr-only';
  announcement.textContent = message;
  
  document.body.appendChild(announcement);
  
  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
}

/**
 * ARIA attributes for data tables
 */
export function getTableA11yProps(caption) {
  return {
    role: 'table',
    'aria-label': caption,
    'aria-describedby': `${caption}-description`
  };
}

/**
 * ARIA attributes for tabs
 */
export function getTabA11yProps(id, selected, controls) {
  return {
    role: 'tab',
    id: `tab-${id}`,
    'aria-selected': selected,
    'aria-controls': controls,
    tabIndex: selected ? 0 : -1
  };
}

export function getTabPanelA11yProps(id, labelledBy) {
  return {
    role: 'tabpanel',
    id: `panel-${id}`,
    'aria-labelledby': labelledBy,
    tabIndex: 0
  };
}

/**
 * Skip to main content link (WCAG 2.1 AA requirement)
 */
export function SkipToMainContent() {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-amber-500 focus:text-black focus:rounded"
    >
      Skip to main content
    </a>
  );
}

/**
 * Screen reader only text
 */
export function ScreenReaderOnly({ children }) {
  return (
    <span className="sr-only">
      {children}
    </span>
  );
}

/**
 * Color contrast checker (WCAG AA requires 4.5:1 for normal text)
 */
export function checkColorContrast(foreground, background) {
  // Simplified - in production use a proper contrast calculation library
  const luminance = (r, g, b) => {
    const [rs, gs, bs] = [r, g, b].map(c => {
      c = c / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  };
  
  // Parse hex colors
  const fg = foreground.replace('#', '');
  const bg = background.replace('#', '');
  
  const fgLum = luminance(
    parseInt(fg.substr(0, 2), 16),
    parseInt(fg.substr(2, 2), 16),
    parseInt(fg.substr(4, 2), 16)
  );
  
  const bgLum = luminance(
    parseInt(bg.substr(0, 2), 16),
    parseInt(bg.substr(2, 2), 16),
    parseInt(bg.substr(4, 2), 16)
  );
  
  const ratio = (Math.max(fgLum, bgLum) + 0.05) / (Math.min(fgLum, bgLum) + 0.05);
  
  return {
    ratio: ratio.toFixed(2),
    passesAA: ratio >= 4.5,
    passesAAA: ratio >= 7
  };
}