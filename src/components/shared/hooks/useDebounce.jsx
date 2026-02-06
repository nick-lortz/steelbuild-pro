import { useState, useEffect } from 'react';

/**
 * Debounce hook - delays value update until user stops typing
 * Usage: const debouncedSearch = useDebounce(searchTerm, 300);
 */
export function useDebounce(value, delay = 300) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}