import { toast as sonnerToast } from 'sonner';

export const toast = {
  success: (message, options = {}) => {
    sonnerToast.success(message, {
      duration: 3000,
      ...options,
    });
  },

  error: (message, options = {}) => {
    sonnerToast.error(message, {
      duration: 4000,
      ...options,
    });
  },

  info: (message, options = {}) => {
    sonnerToast.info(message, {
      duration: 3000,
      ...options,
    });
  },

  warning: (message, options = {}) => {
    sonnerToast.warning(message, {
      duration: 3500,
      ...options,
    });
  },

  loading: (message) => {
    return sonnerToast.loading(message);
  },

  promise: (promise, messages) => {
    return sonnerToast.promise(promise, {
      loading: messages.loading || 'Loading...',
      success: messages.success || 'Success!',
      error: messages.error || 'Something went wrong',
    });
  },
};