import { useState, useEffect, useRef } from 'react';

export function useThrottledValue(value, delayMs = 250) {
  const [throttledValue, setThrottledValue] = useState(value);
  const lastUpdate = useRef(0);

  useEffect(() => {
    const now = performance.now();
    if (now - lastUpdate.current >= delayMs) {
      setThrottledValue(value);
      lastUpdate.current = now;
    } else {
      const timer = setTimeout(() => {
        setThrottledValue(value);
        lastUpdate.current = performance.now();
      }, delayMs - (now - lastUpdate.current));

      return () => clearTimeout(timer);
    }
  }, [value, delayMs]);

  return throttledValue;
}