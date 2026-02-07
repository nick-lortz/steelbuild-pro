import React from 'react';
import { cn } from '@/lib/utils';

/**
 * ContentSection - Standardized content area wrapper
 * 
 * @param {ReactNode} children - Page content
 */
export default function ContentSection({ children, className }) {
  return (
    <div className={cn(
      "max-w-[1800px] mx-auto px-8 py-6",
      className
    )}>
      {children}
    </div>
  );
}