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
      "border-b border-[rgba(255,255,255,0.05)] bg-black/95 backdrop-blur-md",
      className
    )}>
      <div className="max-w-[1800px] mx-auto px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[#E5E7EB] tracking-tight">{title}</h1>
            {subtitle && (
              <p className="text-sm text-[#6B7280] font-mono mt-1">{subtitle}</p>
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