import React from 'react';
import { Button } from "@/components/ui/button";
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
    <div className={cn("flex flex-col items-center justify-center py-12 px-4 text-center", className)}>
      {Icon && (
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <Icon size={32} className="text-muted-foreground" />
        </div>
      )}
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground mb-6 max-w-sm">{description}</p>
      )}
      {action && actionLabel && (
        <Button onClick={action} className="bg-amber-500 hover:bg-amber-600 text-black">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}