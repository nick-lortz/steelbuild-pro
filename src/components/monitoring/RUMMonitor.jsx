// Real User Monitoring Service
class RUMMonitor {
  constructor() {
    this.metrics = {
      pageLoads: [],
      apiCalls: [],
      interactions: [],
      errors: [],
      longTasks: [],
      memoryWarnings: [],
      routeChanges: []
    };
    
    this.observers = new Map();
    this.sessionId = this.generateSessionId();
    this.startTime = Date.now();
    
    if (typeof window !== 'undefined') {
      this.init();
    }
  }

  generateSessionId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  init() {
    // Monitor long tasks (>50ms)
    if ('PerformanceObserver' in window) {
      try {
        const longTaskObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.duration > 50) {
              this.trackLongTask({
                name: entry.name,
                duration: entry.duration,
                startTime: entry.startTime,
                timestamp: Date.now()
              });
            }
          }
        });
        longTaskObserver.observe({ entryTypes: ['longtask', 'measure'] });
        this.observers.set('longtask', longTaskObserver);
      } catch (e) {
        console.warn('Long task observer not supported');
      }

      // Monitor layout shifts
      try {
        const clsObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.hadRecentInput) continue;
            this.trackMetric('cls', entry.value);
          }
        });
        clsObserver.observe({ entryTypes: ['layout-shift'] });
        this.observers.set('cls', clsObserver);
      } catch (e) {
        console.warn('CLS observer not supported');
      }

      // Monitor first input delay
      try {
        const fidObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            this.trackMetric('fid', entry.processingStart - entry.startTime);
          }
        });
        fidObserver.observe({ entryTypes: ['first-input'] });
        this.observers.set('fid', fidObserver);
      } catch (e) {
        console.warn('FID observer not supported');
      }
    }

    // Monitor memory warnings
    if (performance.memory) {
      this.memoryCheckInterval = setInterval(() => {
        const { usedJSHeapSize, totalJSHeapSize, jsHeapSizeLimit } = performance.memory;
        const usagePercent = (usedJSHeapSize / jsHeapSizeLimit) * 100;
        
        if (usagePercent > 90) {
          this.trackMemoryWarning({
            usedMB: Math.round(usedJSHeapSize / 1048576),
            totalMB: Math.round(totalJSHeapSize / 1048576),
            limitMB: Math.round(jsHeapSizeLimit / 1048576),
            usagePercent: Math.round(usagePercent),
            timestamp: Date.now()
          });
        }
      }, 5000);
    }

    // Monitor unhandled errors
    window.addEventListener('error', (event) => {
      this.trackError({
        message: event.message,
        source: event.filename,
        line: event.lineno,
        column: event.colno,
        stack: event.error?.stack,
        timestamp: Date.now()
      });
    });

    window.addEventListener('unhandledrejection', (event) => {
      this.trackError({
        message: event.reason?.message || 'Unhandled Promise Rejection',
        stack: event.reason?.stack,
        timestamp: Date.now()
      });
    });
  }

  trackPageLoad(route, metrics) {
    this.metrics.pageLoads.push({
      route,
      ...metrics,
      timestamp: Date.now(),
      sessionId: this.sessionId
    });
    
    // Keep last 50 entries
    if (this.metrics.pageLoads.length > 50) {
      this.metrics.pageLoads.shift();
    }

    this.sendToBackend('pageload', { route, ...metrics });
  }

  trackRouteChange(from, to, duration) {
    this.metrics.routeChanges.push({
      from,
      to,
      duration,
      timestamp: Date.now(),
      sessionId: this.sessionId
    });

    if (this.metrics.routeChanges.length > 50) {
      this.metrics.routeChanges.shift();
    }

    this.sendToBackend('route_change', { from, to, duration });
  }

  trackApiCall(endpoint, duration, status, error = null) {
    this.metrics.apiCalls.push({
      endpoint,
      duration,
      status,
      error,
      timestamp: Date.now(),
      sessionId: this.sessionId
    });

    if (this.metrics.apiCalls.length > 100) {
      this.metrics.apiCalls.shift();
    }

    if (duration > 2000 || error) {
      this.sendToBackend('slow_api', { endpoint, duration, status, error });
    }
  }

  trackInteraction(name, duration) {
    this.metrics.interactions.push({
      name,
      duration,
      timestamp: Date.now(),
      sessionId: this.sessionId
    });

    if (this.metrics.interactions.length > 50) {
      this.metrics.interactions.shift();
    }

    if (duration > 200) {
      this.sendToBackend('slow_interaction', { name, duration });
    }
  }

  trackError(error) {
    this.metrics.errors.push({
      ...error,
      sessionId: this.sessionId
    });

    if (this.metrics.errors.length > 20) {
      this.metrics.errors.shift();
    }

    this.sendToBackend('error', error);
  }

  trackLongTask(task) {
    this.metrics.longTasks.push({
      ...task,
      sessionId: this.sessionId
    });

    if (this.metrics.longTasks.length > 50) {
      this.metrics.longTasks.shift();
    }

    if (task.duration > 100) {
      this.sendToBackend('long_task', task);
    }
  }

  trackMemoryWarning(warning) {
    this.metrics.memoryWarnings.push({
      ...warning,
      sessionId: this.sessionId
    });

    this.sendToBackend('memory_warning', warning);
  }

  trackMetric(name, value) {
    this.sendToBackend('web_vital', { name, value });
  }

  sendToBackend(eventType, data) {
    // Silently fail - don't block app on monitoring issues
    try {
      if (typeof navigator === 'undefined') return;
      
      const payload = JSON.stringify({
        eventType,
        data,
        sessionId: this.sessionId,
        timestamp: Date.now(),
        userAgent: navigator.userAgent,
        url: window.location.href
      });

      // Use sendBeacon for non-blocking sends
      // Ignore result - monitoring should never break the app
      navigator.sendBeacon('/api/rum', payload);
    } catch (e) {
      // Silently ignore monitoring errors
    }
  }

  getReport() {
    return {
      sessionId: this.sessionId,
      sessionDuration: Date.now() - this.startTime,
      metrics: this.metrics,
      summary: {
        totalErrors: this.metrics.errors.length,
        totalLongTasks: this.metrics.longTasks.length,
        avgPageLoad: this.calculateAvg(this.metrics.pageLoads.map(p => p.duration)),
        avgApiDuration: this.calculateAvg(this.metrics.apiCalls.map(a => a.duration)),
        slowInteractions: this.metrics.interactions.filter(i => i.duration > 200).length
      }
    };
  }

  calculateAvg(values) {
    if (values.length === 0) return 0;
    return Math.round(values.reduce((sum, v) => sum + v, 0) / values.length);
  }

  destroy() {
    this.observers.forEach(observer => observer.disconnect());
    if (this.memoryCheckInterval) {
      clearInterval(this.memoryCheckInterval);
    }
  }
}

// Global singleton
if (typeof window !== 'undefined' && !window.rumMonitor) {
  window.rumMonitor = new RUMMonitor();
}

export default typeof window !== 'undefined' ? window.rumMonitor : null;