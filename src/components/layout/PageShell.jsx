import React from 'react';
import { cn } from '@/lib/utils';

/**
 * PageShell - Standard page container wrapper
 * Provides consistent background, min-height, and content width
 */
export default function PageShell({ children, className }) {
  return (
    <div className={cn(
      "min-h-screen bg-[#0A0E13]",
      className
    )}>
      {children}
    </div>
  );
}