import React, { Suspense, startTransition } from 'react';
import { usePerformanceMonitor } from './hooks/usePerformanceMonitor';

export function PerformanceWrapper({ 
  children, 
  name = 'Component',
  fallback = <div className="flex items-center justify-center p-8"><div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" /></div>
}) {
  usePerformanceMonitor(name);
  
  return (
    <Suspense fallback={fallback}>
      {children}
    </Suspense>
  );
}

export function withPerformance(Component, name) {
  return function PerformanceEnhanced(props) {
    return (
      <PerformanceWrapper name={name || Component.displayName || Component.name}>
        <Component {...props} />
      </PerformanceWrapper>
    );
  };
}

export function deferredTransition(callback) {
  startTransition(() => {
    callback();
  });
}