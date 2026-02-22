import React from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function EmptyState({ 
  icon: Icon, 
  title, 
  description, 
  action, 
  actionLabel,
  className 
}) {
  return (
    <div className={cn(
      "flex flex-col items-center justify-center py-16 px-4 text-center",
      className
    )}>
      {Icon && (
        <div className="mb-4 p-4 rounded-full bg-[hsl(var(--surface-2))] border border-[hsl(var(--border-subtle))]">
          <Icon className="w-8 h-8 text-[hsl(var(--text-muted))]" />
        </div>
      )}
      <h3 className="text-lg font-semibold text-[hsl(var(--text-primary))] mb-2">
        {title}
      </h3>
      <p className="text-sm text-[hsl(var(--text-secondary))] max-w-md mb-6">
        {description}
      </p>
      {action && actionLabel && (
        <Button onClick={action}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}