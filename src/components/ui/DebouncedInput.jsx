import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { useDebouncedInput } from '@/components/shared/hooks/useDebouncedInput';
import { cn } from '@/lib/utils';

export function DebouncedInput({
  value: externalValue,
  onChange,
  onValidate,
  debounceMs = 300,
  validateOnBlur = true,
  errorMessage,
  className,
  ...props
}) {
  const { 
    value, 
    debouncedValue, 
    isValidating,
    handleChange, 
    handleBlur 
  } = useDebouncedInput(externalValue, debounceMs, validateOnBlur);

  const [localError, setLocalError] = useState(null);

  React.useEffect(() => {
    if (debouncedValue !== externalValue) {
      onChange?.(debouncedValue);
      
      // Run validation if provided
      if (onValidate) {
        const error = onValidate(debouncedValue);
        setLocalError(error);
      }
    }
  }, [debouncedValue, onChange, onValidate, externalValue]);

  const displayError = errorMessage || localError;

  return (
    <div className="relative">
      <Input
        {...props}
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        onBlur={handleBlur}
        className={cn(
          className,
          displayError && 'border-red-500',
          isValidating && 'border-blue-500'
        )}
      />
      {/* Pre-allocated error space to prevent layout shift */}
      <div className="h-5 mt-1">
        {displayError && (
          <p className="text-xs text-red-400">{displayError}</p>
        )}
      </div>
    </div>
  );
}