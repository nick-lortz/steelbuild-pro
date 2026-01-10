import { useEffect, useRef } from 'react';

export function usePerformanceMonitor(componentName) {
  const renderCountRef = useRef(0);
  const mountTimeRef = useRef(0);

  useEffect(() => {
    mountTimeRef.current = performance.now();
    
    return () => {
      const unmountTime = performance.now();
      const lifetime = unmountTime - mountTimeRef.current;
      
      if (typeof window !== 'undefined' && window.performanceMonitor) {
        window.performanceMonitor.trackComponentLifetime(componentName, lifetime);
      }
    };
  }, [componentName]);

  useEffect(() => {
    renderCountRef.current += 1;
    
    if (typeof window !== 'undefined' && window.performanceMonitor) {
      window.performanceMonitor.trackRender(componentName, renderCountRef.current);
      
      if (renderCountRef.current > 10) {
        console.warn(`${componentName} has re-rendered ${renderCountRef.current} times`);
      }
    }
  });

  return { renderCount: renderCountRef.current };
}

// Global performance monitor
if (typeof window !== 'undefined' && !window.performanceMonitor) {
  window.performanceMonitor = {
    metrics: {
      renders: {},
      lifetimes: {},
      interactions: [],
      errors: []
    },
    
    trackRender(componentName, count) {
      this.metrics.renders[componentName] = count;
    },
    
    trackComponentLifetime(componentName, duration) {
      if (!this.metrics.lifetimes[componentName]) {
        this.metrics.lifetimes[componentName] = [];
      }
      this.metrics.lifetimes[componentName].push(duration);
    },
    
    trackInteraction(name, duration) {
      this.metrics.interactions.push({
        name,
        duration,
        timestamp: Date.now()
      });
      
      if (duration > 200) {
        console.warn(`Slow interaction: ${name} took ${duration}ms`);
      }
    },
    
    trackError(error, errorInfo) {
      this.metrics.errors.push({
        error: error.message,
        stack: error.stack,
        info: errorInfo,
        timestamp: Date.now()
      });
    },
    
    getReport() {
      return {
        ...this.metrics,
        slowRenders: Object.entries(this.metrics.renders)
          .filter(([_, count]) => count > 10)
          .map(([name, count]) => ({ name, count })),
        slowInteractions: this.metrics.interactions
          .filter(i => i.duration > 200)
      };
    }
  };
}

export { };