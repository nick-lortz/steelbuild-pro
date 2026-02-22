import React from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * EmptyState - Standard empty state component
 * 
 * @param {ReactComponent} icon - Lucide icon component
 * @param {string} title - Empty state title
 * @param {string} description - Empty state description
 * @param {string} actionLabel - CTA button label
 * @param {function} onAction - CTA button click handler
 */
export default function EmptyState({ 
  icon: Icon, 
  title, 
  description, 
  actionLabel, 
  onAction,
  className 
}) {
  return (
    <div className={cn("text-center py-20", className)}>
      {Icon && <Icon size={64} className="mx-auto mb-4 text-zinc-700" />}
      <h3 className="text-lg font-bold text-zinc-400 mb-2">{title}</h3>
      {description && (
        <p className="text-sm text-zinc-600 mb-6 max-w-md mx-auto">{description}</p>
      )}
      {actionLabel && onAction && (
        <Button 
          onClick={onAction}
          className="bg-amber-500 hover:bg-amber-600 text-black font-bold"
        >
          {actionLabel}
        </Button>
      )}
    </div>
  );
}