/**
 * Centralized Error Handling Utilities
 * 
 * Provides standardized error messages and handling across the application.
 * Never expose internal stack traces or technical details to users.
 */

import { toast } from 'sonner';

/**
 * Extract user-friendly error message from various error types
 */
export function getErrorMessage(error) {
  // Base44 API errors with structured response
  if (error?.response?.data?.error) {
    return error.response.data.error;
  }
  
  // Base44 API errors with details array
  if (error?.response?.data?.details && Array.isArray(error.response.data.details)) {
    return error.response.data.details.join(', ');
  }
  
  // HTTP status-based messages
  if (error?.response?.status) {
    switch (error.response.status) {
      case 400:
        return 'Invalid request. Please check your input and try again.';
      case 401:
        return 'Your session has expired. Please log in again.';
      case 403:
        return 'You do not have permission to perform this action.';
      case 404:
        return 'The requested resource was not found.';
      case 409:
        return 'This record already exists or conflicts with existing data.';
      case 422:
        return 'Unable to process your request. Please check the data and try again.';
      case 429:
        return 'Too many requests. Please wait a moment and try again.';
      case 500:
        return 'A server error occurred. Please try again later.';
      case 503:
        return 'Service temporarily unavailable. Please try again shortly.';
      default:
        return 'An unexpected error occurred. Please try again.';
    }
  }
  
  // Network errors
  if (error?.message === 'Network Error' || error?.code === 'ERR_NETWORK') {
    return 'Network connection lost. Please check your internet connection.';
  }
  
  // Timeout errors
  if (error?.code === 'ECONNABORTED' || error?.message?.includes('timeout')) {
    return 'Request timed out. Please try again.';
  }
  
  // Generic error with message
  if (error?.message) {
    // Filter out technical stack traces and internal errors
    const msg = error.message;
    if (msg.includes('Failed to fetch') || msg.includes('fetch')) {
      return 'Unable to connect to server. Please check your connection.';
    }
    // Return message if it's user-friendly (not too technical)
    if (!msg.includes('at ') && !msg.includes('TypeError') && msg.length < 200) {
      return msg;
    }
  }
  
  // Fallback
  return 'An unexpected error occurred. Please try again.';
}

/**
 * Display error toast with user-friendly message
 */
export function showErrorToast(error, customMessage = null) {
  const message = customMessage || getErrorMessage(error);
  
  // Log full error for debugging (only in dev)
  if ((/** @type {any} */ (import.meta).env?.DEV)) {
    console.error('Error details:', error);
  }
  
  toast.error(message, {
    duration: 5000,
    position: 'top-center'
  });
}

/**
 * Display success toast
 */
export function showSuccessToast(message) {
  toast.success(message, {
    duration: 3000,
    position: 'top-center'
  });
}

/**
 * Handle promise rejection with toast
 * Use in async operations that don't have explicit error handling
 */
export function handleAsyncError(promise, customMessage = null) {
  promise.catch(error => {
    showErrorToast(error, customMessage);
  });
}

/**
 * Wrap async function with error handling
 */
export function withErrorHandling(fn, errorMessage = null) {
  return async (...args) => {
    try {
      return await fn(...args);
    } catch (error) {
      showErrorToast(error, errorMessage);
      throw error; // Re-throw to allow caller to handle if needed
    }
  };
}

/**
 * Check if error is authentication-related
 */
export function isAuthError(error) {
  return error?.response?.status === 401 || 
         error?.status === 401 ||
         error?.message?.toLowerCase().includes('unauthorized');
}

/**
 * Check if error is permission-related
 */
export function isPermissionError(error) {
  return error?.response?.status === 403 || 
         error?.status === 403 ||
         error?.message?.toLowerCase().includes('forbidden');
}

/**
 * Check if error is network-related
 */
export function isNetworkError(error) {
  return error?.message === 'Network Error' || 
         error?.code === 'ERR_NETWORK' ||
         !navigator.onLine;
}

/**
 * Context-specific error messages
 */
export const ErrorMessages = {
  // Projects
  PROJECT_CREATE_FAILED: 'Failed to create project. Please verify all required fields.',
  PROJECT_UPDATE_FAILED: 'Failed to update project. Please try again.',
  PROJECT_DELETE_FAILED: 'Failed to delete project. It may have related data.',
  PROJECT_LOAD_FAILED: 'Failed to load projects. Please refresh the page.',
  
  // RFIs
  RFI_CREATE_FAILED: 'Failed to create RFI. Please verify all required fields.',
  RFI_UPDATE_FAILED: 'Failed to update RFI. Please try again.',
  RFI_DELETE_FAILED: 'Failed to delete RFI. Please try again.',
  RFI_LOAD_FAILED: 'Failed to load RFIs. Please refresh the page.',
  
  // Tasks
  TASK_CREATE_FAILED: 'Failed to create task. Check dates and dependencies.',
  TASK_UPDATE_FAILED: 'Failed to update task. Please try again.',
  TASK_DELETE_FAILED: 'Failed to delete task. It may have dependencies.',
  
  // Financials
  FINANCIAL_UPDATE_FAILED: 'Failed to update financial data. Please try again.',
  BUDGET_EXCEEDED: 'This would exceed the project budget.',
  
  // Documents
  DOCUMENT_UPLOAD_FAILED: 'Failed to upload document. File may be too large.',
  DOCUMENT_DELETE_FAILED: 'Failed to delete document. Please try again.',
  
  // Generic
  SAVE_FAILED: 'Failed to save changes. Please try again.',
  LOAD_FAILED: 'Failed to load data. Please refresh the page.',
  DELETE_FAILED: 'Failed to delete. This item may be in use.',
  PERMISSION_DENIED: 'You do not have permission to perform this action.',
  SESSION_EXPIRED: 'Your session has expired. Please log in again.',
  NETWORK_ERROR: 'Network connection lost. Please check your internet.'
};
