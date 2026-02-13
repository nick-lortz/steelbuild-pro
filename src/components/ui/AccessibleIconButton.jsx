import React from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * Accessible Icon-Only Button
 * Ensures all icon buttons have accessible names
 */
export function IconButton({ 
  icon: Icon, 
  label, 
  onClick, 
  variant = "ghost",
  size = "icon",
  className,
  ...props 
}) {
  return (
    <Button
      variant={variant}
      size={size}
      onClick={onClick}
      aria-label={label}
      className={className}
      {...props}
    >
      <Icon size={16} aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </Button>
  );
}