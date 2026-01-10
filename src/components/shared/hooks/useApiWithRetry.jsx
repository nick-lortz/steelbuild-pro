import { useState, useCallback } from 'react';
import { toast } from '@/components/ui/notifications';

const RETRY_DELAYS = [1000, 2000, 4000]; // Exponential backoff
const MAX_RETRIES = 3;

export function useApiWithRetry() {
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);

  const executeWithRetry = useCallback(async (apiCall, options = {}) => {
    const { 
      maxRetries = MAX_RETRIES,
      onError,
      showToast = true,
      retryDelays = RETRY_DELAYS
    } = options;

    let lastError;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        setRetryCount(attempt);
        
        if (attempt > 0) {
          setIsRetrying(true);
          if (showToast) {
            toast.info(`Retrying... (${attempt}/${maxRetries})`);
          }
          await new Promise(resolve => 
            setTimeout(resolve, retryDelays[attempt - 1] || retryDelays[retryDelays.length - 1])
          );
        }
        
        const result = await apiCall();
        setIsRetrying(false);
        setRetryCount(0);
        return result;
        
      } catch (error) {
        lastError = error;
        
        // Don't retry on certain errors
        if (error?.response?.status === 401 || error?.response?.status === 403) {
          throw error;
        }
        
        // Don't retry on last attempt
        if (attempt === maxRetries) {
          break;
        }
      }
    }
    
    setIsRetrying(false);
    
    if (showToast) {
      toast.error(`Failed after ${maxRetries + 1} attempts`);
    }
    
    if (onError) {
      onError(lastError);
    }
    
    throw lastError;
  }, []);

  return {
    executeWithRetry,
    retryCount,
    isRetrying
  };
}