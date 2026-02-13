import { toast as sonnerToast } from 'sonner';

/**
 * WCAG 4.1.3 Compliant Toast with aria-live announcements
 */

// Create live region for screen reader announcements
if (typeof document !== 'undefined') {
  const createLiveRegion = () => {
    if (!document.getElementById('a11y-announcer')) {
      const announcer = document.createElement('div');
      announcer.id = 'a11y-announcer';
      announcer.setAttribute('role', 'status');
      announcer.setAttribute('aria-live', 'polite');
      announcer.setAttribute('aria-atomic', 'true');
      announcer.className = 'sr-only';
      document.body.appendChild(announcer);
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createLiveRegion);
  } else {
    createLiveRegion();
  }
}

const announce = (message) => {
  const announcer = document.getElementById('a11y-announcer');
  if (announcer) {
    announcer.textContent = '';
    setTimeout(() => {
      announcer.textContent = message;
    }, 100);
  }
};

export const toast = {
  success: (message, options = {}) => {
    announce(`Success: ${message}`);
    sonnerToast.success(message, {
      duration: 3000,
      ...options,
    });
  },

  error: (message, options = {}) => {
    announce(`Error: ${message}`);
    sonnerToast.error(message, {
      duration: 4000,
      ...options,
    });
  },

  info: (message, options = {}) => {
    announce(`Info: ${message}`);
    sonnerToast.info(message, {
      duration: 3000,
      ...options,
    });
  },

  warning: (message, options = {}) => {
    announce(`Warning: ${message}`);
    sonnerToast.warning(message, {
      duration: 3500,
      ...options,
    });
  },

  loading: (message) => {
    announce(`Loading: ${message}`);
    return sonnerToast.loading(message);
  },

  promise: (promise, messages) => {
    return sonnerToast.promise(promise, {
      loading: messages.loading || 'Loading...',
      success: (data) => {
        const msg = typeof messages.success === 'function' 
          ? messages.success(data) 
          : messages.success || 'Success!';
        announce(`Success: ${msg}`);
        return msg;
      },
      error: (err) => {
        const msg = typeof messages.error === 'function'
          ? messages.error(err)
          : messages.error || 'Something went wrong';
        announce(`Error: ${msg}`);
        return msg;
      }
    });
  },
};