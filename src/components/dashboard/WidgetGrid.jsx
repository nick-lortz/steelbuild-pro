import React from 'react';
import { cn } from '@/lib/utils';

export function WidgetContainer({ children, className }) {
  return (
    <div className={cn("grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4", className)}>
      {children}
    </div>
  );
}