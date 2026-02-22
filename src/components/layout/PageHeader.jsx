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
      "border-b border-[hsl(var(--border-default))] bg-[hsl(var(--surface-1))]/95 backdrop-blur-md",
      className
    )}>
      <div className="max-w-[1800px] mx-auto px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[hsl(var(--text-primary))] tracking-tight">{title}</h1>
            {subtitle && (
              <p className="text-sm text-[hsl(var(--text-muted))] font-mono mt-1">{subtitle}</p>
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