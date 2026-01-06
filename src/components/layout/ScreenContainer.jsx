import React from 'react';
import { cn } from '@/lib/utils';

export default function ScreenContainer({ children, className, noPadding = false }) {
  return (
    <div 
      className={cn(
        "min-h-screen pb-20 lg:pb-0",
        !noPadding && "p-4 lg:p-6",
        "safe-top safe-bottom",
        className
      )}
    >
      {children}
    </div>
  );
}