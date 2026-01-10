import { useState, useCallback, useRef, useEffect } from 'react';

export function useDebouncedInput(initialValue = '', delay = 300, validateOnBlur = true) {
  const [value, setValue] = useState(initialValue);
  const [debouncedValue, setDebouncedValue] = useState(initialValue);
  const [isValidating, setIsValidating] = useState(false);
  const timeoutRef = useRef(null);

  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      setDebouncedValue(value);
      setIsValidating(false);
    }, delay);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [value, delay]);

  const handleChange = useCallback((newValue) => {
    setValue(newValue);
    setIsValidating(true);
  }, []);

  const handleBlur = useCallback(() => {
    if (validateOnBlur) {
      // Force immediate validation on blur
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      setDebouncedValue(value);
      setIsValidating(false);
    }
  }, [value, validateOnBlur]);

  const reset = useCallback(() => {
    setValue(initialValue);
    setDebouncedValue(initialValue);
    setIsValidating(false);
  }, [initialValue]);

  return {
    value,
    debouncedValue,
    isValidating,
    handleChange,
    handleBlur,
    reset,
    setValue
  };
}

export function useThrottledCallback(callback, delay = 16) {
  const timeoutRef = useRef(null);
  const lastRunRef = useRef(0);

  return useCallback((...args) => {
    const now = Date.now();
    const timeSinceLastRun = now - lastRunRef.current;

    if (timeSinceLastRun >= delay) {
      callback(...args);
      lastRunRef.current = now;
    } else {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      timeoutRef.current = setTimeout(() => {
        callback(...args);
        lastRunRef.current = Date.now();
      }, delay - timeSinceLastRun);
    }
  }, [callback, delay]);
}