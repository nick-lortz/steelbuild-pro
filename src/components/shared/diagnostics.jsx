import { useEffect, useRef } from 'react';

/**
 * Hook to track component renders
 * Usage: useRenderCount('ComponentName');
 */
export function useRenderCount(componentName) {
  const renderCount = useRef(0);
  renderCount.current += 1;
  
  console.log(`[RENDER] ${componentName} - Render #${renderCount.current}`, {
    timestamp: new Date().toISOString()
  });
}

/**
 * Hook to track effect execution
 * Usage: useEffectLogger('ComponentName', 'effectDescription', deps);
 */
export function useEffectLogger(componentName, effectName, deps = []) {
  useEffect(() => {
    console.log(`[EFFECT] ${componentName} - ${effectName} FIRED`, {
      timestamp: new Date().toISOString(),
      deps
    });
    
    return () => {
      console.log(`[EFFECT] ${componentName} - ${effectName} CLEANUP`, {
        timestamp: new Date().toISOString()
      });
    };
  }, deps);
}

/**
 * Hook to track mount/unmount
 * Usage: useMountLogger('ComponentName');
 */
export function useMountLogger(componentName) {
  useEffect(() => {
    console.log(`[MOUNT] ${componentName} MOUNTED`, {
      timestamp: new Date().toISOString()
    });
    
    return () => {
      console.log(`[UNMOUNT] ${componentName} UNMOUNTED`, {
        timestamp: new Date().toISOString()
      });
    };
  }, [componentName]);
}

/**
 * Enable diagnostics for all components
 * Add to top of Layout.js or main entry point:
 * if (import.meta.env.DEV) enableGlobalDiagnostics();
 */
export function enableGlobalDiagnostics() {
  const originalUseEffect = useEffect;
  const effectCounts = new Map();
  
  window.React = window.React || {};
  window.React.useEffect = function diagnosticUseEffect(effect, deps) {
    const stack = new Error().stack;
    const component = stack?.split('\n')[2]?.trim() || 'Unknown';
    
    const key = component;
    effectCounts.set(key, (effectCounts.get(key) || 0) + 1);
    
    if (effectCounts.get(key) > 2) {
      console.warn(`[DIAGNOSTIC] Effect firing frequently in ${component}`, {
        count: effectCounts.get(key),
        deps
      });
    }
    
    return originalUseEffect(effect, deps);
  };
}