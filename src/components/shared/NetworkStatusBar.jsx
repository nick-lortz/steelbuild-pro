import React, { useState, useEffect } from 'react';
import { WifiOff, Wifi } from 'lucide-react';
import { cn } from '@/lib/utils';

export function NetworkStatusBar() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showOffline, setShowOffline] = useState(false);
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowOffline(false);
      setShowReconnected(true);
      
      setTimeout(() => {
        setShowReconnected(false);
      }, 3000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowOffline(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!showOffline && !showReconnected) return null;

  return (
    <div
      className={cn(
        'fixed top-0 left-0 right-0 z-50 px-6 py-2 text-center text-sm font-medium transition-all',
        showOffline && 'bg-red-500 text-white',
        showReconnected && 'bg-green-500 text-white'
      )}
    >
      <div className="flex items-center justify-center gap-2">
        {showOffline && (
          <>
            <WifiOff size={16} />
            <span>You are offline. Some features may be unavailable.</span>
          </>
        )}
        {showReconnected && (
          <>
            <Wifi size={16} />
            <span>Connection restored</span>
          </>
        )}
      </div>
    </div>
  );
}