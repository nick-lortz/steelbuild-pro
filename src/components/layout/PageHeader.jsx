import React from 'react';
import { cn } from '@/lib/utils';

/**
 * PageHeader - Standardized page header with title, subtitle, and actions
 * 
 * @param {string} title - Main page title
 * @param {string} subtitle - Optional subtitle/description/count
 * @param {ReactNode} actions - Action buttons (typically right-aligned)
 * @param {ReactNode} children - Additional header content
 */
export default function PageHeader({ title, subtitle, actions, children, className }) {
  return (
    <div className={cn(
      "border-b border-zinc-800/50 bg-gradient-to-b from-zinc-900 to-zinc-950/50",
      className
    )}>
      <div className="max-w-[1800px] mx-auto px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">{title}</h1>
            {subtitle && (
              <p className="text-sm text-zinc-500 font-mono mt-1">{subtitle}</p>
            )}
          </div>
          {actions && (
            <div className="flex items-center gap-2">
              {actions}
            </div>
          )}
        </div>
        {children}
      </div>
    </div>
  );
}