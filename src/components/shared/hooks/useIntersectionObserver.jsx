import { useEffect, useRef, useState } from 'react';

export function useIntersectionObserver(options = {}) {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const [hasIntersected, setHasIntersected] = useState(false);
  const elementRef = useRef(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsIntersecting(entry.isIntersecting);
        if (entry.isIntersecting && !hasIntersected) {
          setHasIntersected(true);
        }
      },
      {
        threshold: options.threshold || 0.1,
        rootMargin: options.rootMargin || '50px',
        ...options
      }
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, [options.threshold, options.rootMargin, hasIntersected]);

  return { elementRef, isIntersecting, hasIntersected };
}

// Lazy load component when visible
export function LazyComponent({ children, fallback = null, ...options }) {
  const { elementRef, hasIntersected } = useIntersectionObserver(options);

  return (
    <div ref={elementRef}>
      {hasIntersected ? children : fallback}
    </div>
  );
}