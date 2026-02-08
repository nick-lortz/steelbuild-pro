import { useState, useEffect } from 'react';
import { toast } from '@/components/ui/notifications';

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline((prev) => {
        if (!prev) {
          toast.success('Connection restored');
        }
        return true;
      });
    };

    const handleOffline = () => {
      setIsOnline((prev) => {
        if (prev) {
          toast.warning('You are offline. Some features may be unavailable.');
        }
        return false;
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return { isOnline, isOffline: !isOnline };
}
