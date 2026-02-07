import React from 'react';
import { cn } from '@/lib/utils';

/**
 * LoadingState - Standard loading spinner with message
 */
export default function LoadingState({ message = "Loading...", className }) {
  return (
    <div className={cn("flex items-center justify-center py-20", className)}>
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-sm text-zinc-500">{message}</p>
      </div>
    </div>
  );
}