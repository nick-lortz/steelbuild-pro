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
      "border-b border-zinc-800/50 bg-zinc-950/30",
      className
    )}>
      <div className="max-w-[1800px] mx-auto px-8 py-3">
        {children}
      </div>
    </div>
  );
}