/**
 * Enterprise Performance Optimization System
 * Comprehensive performance monitoring and optimization utilities
 */

import { memo, useMemo, useCallback, lazy, Suspense, useState, useEffect, useRef } from 'react';
import { debounce, throttle } from 'lodash';
import logger from './structuredLogging';

class PerformanceMonitor {
  constructor() {
    this.metrics = new Map();
    this.observers = new Map();
    this.thresholds = {
      renderTime: 16,
      apiResponse: 1000,
      bundleSize: 250000,
      memoryUsage: 50 * 1024 * 1024,
      cumulativeLayoutShift: 0.1,
      firstContentfulPaint: 2000,
      largestContentfulPaint: 2500
    };
    
    if (typeof window !== 'undefined') {
      this.initializeObservers();
      this.startMemoryMonitoring();
    }
  }
  
  initializeObservers() {
    if ('PerformanceObserver' in window) {
      try {
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          this.recordMetric('largestContentfulPaint', lastEntry.startTime);
        });
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
        this.observers.set('lcp', lcpObserver);
      } catch (e) {}
      
      try {
        const fidObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach(entry => {
            this.recordMetric('firstInputDelay', entry.processingStart - entry.startTime);
          });
        });
        fidObserver.observe({ entryTypes: ['first-input'] });
        this.observers.set('fid', fidObserver);
      } catch (e) {}
      
      try {
        const clsObserver = new PerformanceObserver((list) => {
          let clsValue = 0;
          const entries = list.getEntries();
          entries.forEach(entry => {
            if (!entry.hadRecentInput) {
              clsValue += entry.value;
            }
          });
          this.recordMetric('cumulativeLayoutShift', clsValue);
        });
        clsObserver.observe({ entryTypes: ['layout-shift'] });
        this.observers.set('cls', clsObserver);
      } catch (e) {}
      
      try {
        const longTaskObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach(entry => {
            this.recordMetric('longTask', entry.duration);
            if (entry.duration > 50) {
              logger.warn('Long task detected', {
                duration: entry.duration,
                startTime: entry.startTime,
                name: entry.name
              });
            }
          });
        });
        longTaskObserver.observe({ entryTypes: ['longtask'] });
        this.observers.set('longtask', longTaskObserver);
      } catch (e) {}
    }
    
    this.createIntersectionObserver();
  }
  
  createIntersectionObserver() {
    if ('IntersectionObserver' in window) {
      this.intersectionObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              const element = entry.target;
              element.dispatchEvent(new CustomEvent('elementVisible'));
            }
          });
        },
        { rootMargin: '50px' }
      );
    }
  }
  
  startMemoryMonitoring() {
    if ('memory' in performance) {
      setInterval(() => {
        const memInfo = performance.memory;
        this.recordMetric('memoryUsage', memInfo.usedJSHeapSize);
        
        if (memInfo.usedJSHeapSize > this.thresholds.memoryUsage) {
          logger.warn('High memory usage detected', {
            used: memInfo.usedJSHeapSize,
            total: memInfo.totalJSHeapSize,
            limit: memInfo.jsHeapSizeLimit
          });
        }
      }, 30000);
    }
  }
  
  recordMetric(name, value, metadata = {}) {
    const timestamp = Date.now();
    
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    
    const metric = { value, timestamp, ...metadata };
    this.metrics.get(name).push(metric);
    
    const entries = this.metrics.get(name);
    if (entries.length > 100) {
      entries.shift();
    }
    
    this.checkThreshold(name, value);
  }
  
  checkThreshold(name, value) {
    const threshold = this.thresholds[name];
    if (threshold && value > threshold) {
      logger.warn(`Performance threshold exceeded: ${name}`, {
        value,
        threshold,
        exceedBy: value - threshold
      });
    }
  }
  
  getMetrics(name = null) {
    if (name) {
      return this.metrics.get(name) || [];
    }
    
    const allMetrics = {};
    for (const [key, values] of this.metrics.entries()) {
      allMetrics[key] = values;
    }
    return allMetrics;
  }
  
  getAverageMetric(name, timeWindow = 60000) {
    const entries = this.metrics.get(name) || [];
    const cutoff = Date.now() - timeWindow;
    const recentEntries = entries.filter(entry => entry.timestamp > cutoff);
    
    if (recentEntries.length === 0) return null;
    
    const sum = recentEntries.reduce((acc, entry) => acc + entry.value, 0);
    return sum / recentEntries.length;
  }
  
  generatePerformanceReport() {
    return {
      timestamp: new Date().toISOString(),
      coreWebVitals: {
        lcp: this.getAverageMetric('largestContentfulPaint'),
        fid: this.getAverageMetric('firstInputDelay'),
        cls: this.getAverageMetric('cumulativeLayoutShift')
      },
      performance: {
        memoryUsage: this.getAverageMetric('memoryUsage'),
        longTasks: this.getMetrics('longTask').length,
        renderTime: this.getAverageMetric('renderTime')
      },
      thresholds: this.thresholds
    };
  }
  
  observeElement(element) {
    if (this.intersectionObserver) {
      this.intersectionObserver.observe(element);
    }
  }
  
  unobserveElement(element) {
    if (this.intersectionObserver) {
      this.intersectionObserver.unobserve(element);
    }
  }
  
  cleanup() {
    this.observers.forEach(observer => observer.disconnect());
    if (this.intersectionObserver) {
      this.intersectionObserver.disconnect();
    }
  }
}

const performanceMonitor = new PerformanceMonitor();

export class PerformanceOptimizer {
  static memoizeComponent(Component, areEqual = null) {
    return memo(Component, areEqual);
  }
  
  static memoizeValue(factory, deps) {
    return useMemo(factory, deps);
  }
  
  static memoizeCallback(callback, deps) {
    return useCallback(callback, deps);
  }
  
  static createDebouncedFunction(func, delay = 300) {
    return debounce(func, delay);
  }
  
  static createThrottledFunction(func, delay = 100) {
    return throttle(func, delay);
  }
  
  static createLazyComponent(importFunction, fallback = null) {
    const LazyComponent = lazy(importFunction);
    
    return function LazyWrapper(props) {
      return (
        <Suspense fallback={fallback || <div>Loading...</div>}>
          <LazyComponent {...props} />
        </Suspense>
      );
    };
  }
  
  static createVirtualizedList(items, itemHeight, containerHeight, renderItem) {
    const visibleCount = Math.ceil(containerHeight / itemHeight);
    const totalHeight = items.length * itemHeight;
    
    return {
      totalHeight,
      visibleCount,
      getVisibleItems: (scrollTop) => {
        const startIndex = Math.floor(scrollTop / itemHeight);
        const endIndex = Math.min(startIndex + visibleCount + 1, items.length);
        
        return {
          startIndex,
          endIndex,
          items: items.slice(startIndex, endIndex),
          offsetY: startIndex * itemHeight
        };
      }
    };
  }
  
  static createOptimizedImage(src, options = {}) {
    const { width, height, quality = 80, format = 'webp', lazy = true } = options;
    const optimizedSrc = this.buildOptimizedImageUrl(src, { width, height, quality, format });
    
    return {
      src: optimizedSrc,
      loading: lazy ? 'lazy' : 'eager',
      width,
      height
    };
  }
  
  static buildOptimizedImageUrl(src, options) {
    return src;
  }
  
  static createAsyncChunk(importFunction) {
    return () => importFunction().then(module => module.default || module);
  }
  
  static measurePerformance(name) {
    return function(target, propertyKey, descriptor) {
      const originalMethod = descriptor.value;
      
      descriptor.value = async function(...args) {
        const start = performance.now();
        
        try {
          const result = await originalMethod.apply(this, args);
          const duration = performance.now() - start;
          
          performanceMonitor.recordMetric('renderTime', duration, {
            component: name,
            method: propertyKey
          });
          
          return result;
        } catch (error) {
          const duration = performance.now() - start;
          logger.error(`Performance measurement failed for ${name}.${propertyKey}`, {
            duration
          }, error);
          throw error;
        }
      };
      
      return descriptor;
    };
  }
  
  static createOptimizedAPICall(apiFunction, options = {}) {
    const { cache = true, cacheTime = 5 * 60 * 1000, retry = 3, timeout = 10000 } = options;
    const cache_map = new Map();
    
    return async function(...args) {
      const cacheKey = JSON.stringify(args);
      
      if (cache && cache_map.has(cacheKey)) {
        const cached = cache_map.get(cacheKey);
        if (Date.now() - cached.timestamp < cacheTime) {
          return cached.data;
        }
      }
      
      const start = performance.now();
      
      try {
        const result = await apiFunction(...args);
        const duration = performance.now() - start;
        
        performanceMonitor.recordMetric('apiResponse', duration, {
          endpoint: args[0],
          method: args[1] || 'GET'
        });
        
        if (cache) {
          cache_map.set(cacheKey, {
            data: result,
            timestamp: Date.now()
          });
        }
        
        return result;
      } catch (error) {
        const duration = performance.now() - start;
        logger.error('API call failed', {
          duration,
          endpoint: args[0],
          method: args[1] || 'GET'
        }, error);
        throw error;
      }
    };
  }
}

export function usePerformanceMonitoring(componentName) {
  const recordRender = useCallback(() => {
    const start = performance.now();
    
    return () => {
      const duration = performance.now() - start;
      performanceMonitor.recordMetric('renderTime', duration, {
        component: componentName
      });
    };
  }, [componentName]);
  
  return { recordRender };
}

export function useVirtualScroll(items, itemHeight, containerRef) {
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);
  
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    
    const updateHeight = () => {
      setContainerHeight(container.clientHeight);
    };
    
    const handleScroll = () => {
      setScrollTop(container.scrollTop);
    };
    
    updateHeight();
    container.addEventListener('scroll', handleScroll);
    window.addEventListener('resize', updateHeight);
    
    return () => {
      container.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', updateHeight);
    };
  }, []);
  
  const virtualizer = useMemo(() => {
    return PerformanceOptimizer.createVirtualizedList(items, itemHeight, containerHeight, null);
  }, [items, itemHeight, containerHeight]);
  
  const visibleItems = useMemo(() => {
    return virtualizer.getVisibleItems(scrollTop);
  }, [virtualizer, scrollTop]);
  
  return {
    visibleItems,
    totalHeight: virtualizer.totalHeight
  };
}

export function useIntersectionObserver(callback, options = {}) {
  const elementRef = useRef();
  
  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;
    
    performanceMonitor.observeElement(element);
    
    const handleVisible = () => {
      callback();
    };
    
    element.addEventListener('elementVisible', handleVisible);
    
    return () => {
      element.removeEventListener('elementVisible', handleVisible);
      performanceMonitor.unobserveElement(element);
    };
  }, [callback]);
  
  return elementRef;
}

export function useDebounce(value, delay) {
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

export function useThrottle(value, delay) {
  const [throttledValue, setThrottledValue] = useState(value);
  const lastRan = useRef(Date.now());
  
  useEffect(() => {
    const handler = setTimeout(() => {
      if (Date.now() - lastRan.current >= delay) {
        setThrottledValue(value);
        lastRan.current = Date.now();
      }
    }, delay - (Date.now() - lastRan.current));
    
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  
  return throttledValue;
}

export function PerformanceDashboard() {
  const [metrics, setMetrics] = useState({});
  const [report, setReport] = useState(null);
  
  useEffect(() => {
    const updateMetrics = () => {
      setMetrics(performanceMonitor.getMetrics());
      setReport(performanceMonitor.generatePerformanceReport());
    };
    
    updateMetrics();
    const interval = setInterval(updateMetrics, 5000);
    
    return () => clearInterval(interval);
  }, []);
  
  const exportReport = () => {
    const reportData = JSON.stringify(report, null, 2);
    const blob = new Blob([reportData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `performance-report-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };
  
  if (!report) return <div>Loading performance data...</div>;
  
  return (
    <div className="performance-dashboard p-6 bg-white rounded-lg shadow">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Performance Dashboard</h2>
        <button
          onClick={exportReport}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
          Export Report
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-gray-50 p-4 rounded">
          <h3 className="font-semibold mb-2">Core Web Vitals</h3>
          <div className="space-y-2">
            <div>LCP: {report.coreWebVitals.lcp?.toFixed(2) || 'N/A'}ms</div>
            <div>FID: {report.coreWebVitals.fid?.toFixed(2) || 'N/A'}ms</div>
            <div>CLS: {report.coreWebVitals.cls?.toFixed(3) || 'N/A'}</div>
          </div>
        </div>
        
        <div className="bg-gray-50 p-4 rounded">
          <h3 className="font-semibold mb-2">Performance</h3>
          <div className="space-y-2">
            <div>Memory: {(report.performance.memoryUsage / 1024 / 1024).toFixed(2) || 'N/A'}MB</div>
            <div>Long Tasks: {report.performance.longTasks}</div>
            <div>Render Time: {report.performance.renderTime?.toFixed(2) || 'N/A'}ms</div>
          </div>
        </div>
        
        <div className="bg-gray-50 p-4 rounded">
          <h3 className="font-semibold mb-2">Thresholds</h3>
          <div className="space-y-2 text-sm">
            <div>Render: &lt;{report.thresholds.renderTime}ms</div>
            <div>API: &lt;{report.thresholds.apiResponse}ms</div>
            <div>Memory: &lt;{(report.thresholds.memoryUsage / 1024 / 1024).toFixed(0)}MB</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export { performanceMonitor, PerformanceOptimizer };
export default PerformanceOptimizer;