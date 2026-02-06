import React, { useState } from 'react';
import { Input } from '@/components/ui/input';

/**
 * Validated numeric input - prevents corruption from invalid chars
 * Usage: <NumericInput value={amount} onChange={(val) => setAmount(val)} />
 */
export function NumericInput({ 
  value, 
  onChange, 
  min, 
  max, 
  decimals = 2, 
  allowNegative = true,
  ...props 
}) {
  const [displayValue, setDisplayValue] = useState(value?.toString() || '');

  const handleChange = (e) => {
    const raw = e.target.value;
    setDisplayValue(raw);

    // Allow empty
    if (raw === '' || raw === '-') {
      onChange(null);
      return;
    }

    // Validate numeric
    const pattern = allowNegative 
      ? /^-?\d*\.?\d*$/
      : /^\d*\.?\d*$/;
    
    if (!pattern.test(raw)) {
      return; // Reject invalid input
    }

    const num = parseFloat(raw);
    
    // Check if valid number
    if (isNaN(num)) {
      onChange(null);
      return;
    }

    // Apply min/max constraints
    let validated = num;
    if (min !== undefined && num < min) validated = min;
    if (max !== undefined && num > max) validated = max;

    // Round to decimals
    if (decimals !== undefined) {
      validated = Math.round(validated * Math.pow(10, decimals)) / Math.pow(10, decimals);
    }

    onChange(validated);
  };

  const handleBlur = () => {
    // Format on blur
    if (value !== null && value !== undefined) {
      setDisplayValue(decimals !== undefined ? value.toFixed(decimals) : value.toString());
    } else {
      setDisplayValue('');
    }
  };

  return (
    <Input
      {...props}
      type="text"
      inputMode="decimal"
      value={displayValue}
      onChange={handleChange}
      onBlur={handleBlur}
    />
  );
}