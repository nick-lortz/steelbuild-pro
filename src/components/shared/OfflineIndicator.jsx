import React from 'react';
import { WifiOff } from 'lucide-react';
import { useNetworkStatus } from '@/components/shared/hooks/useNetworkStatus';
import { cn } from '@/lib/utils';

export default function OfflineIndicator() {
  const { isOffline } = useNetworkStatus();

  if (!isOffline) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-red-500 text-white py-2 px-4 flex items-center justify-center gap-2 text-sm">
      <WifiOff size={16} />
      <span>You are offline</span>
    </div>
  );
}