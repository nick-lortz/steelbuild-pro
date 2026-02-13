import React, { useId } from 'react';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

/**
 * Accessible form field wrapper
 * Automatically handles label/input association, error messages, and ARIA attributes
 */
export function FormField({ 
  label, 
  required = false, 
  error = null, 
  hint = null,
  children,
  className 
}) {
  const id = useId();
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  
  // Clone children to inject accessibility props
  const accessibleChild = React.cloneElement(children, {
    id,
    'aria-invalid': error ? 'true' : undefined,
    'aria-describedby': [
      error ? errorId : null,
      hint ? hintId : null
    ].filter(Boolean).join(' ') || undefined,
    'aria-required': required ? 'true' : undefined
  });

  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <Label htmlFor={id}>
          {label}
          {required && <span className="text-red-400 ml-1" aria-label="required">*</span>}
        </Label>
      )}
      {accessibleChild}
      {hint && !error && (
        <p id={hintId} className="text-xs text-zinc-500">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="text-xs text-red-400" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export default FormField;