import React from 'react';
import { cn } from '@/lib/utils';

/**
 * FilterBar - Standardized filter/search toolbar section
 * 
 * @param {ReactNode} children - Filter controls (search, selects, buttons)
 */
export default function FilterBar({ children, className }) {
  return (
    <div className={cn(
      "border-b border-[hsl(var(--border-subtle))] bg-[hsl(var(--surface-1))]",
      className
    )}>
      <div className="max-w-[1800px] mx-auto px-8 py-3">
        {children}
      </div>
    </div>
  );
}