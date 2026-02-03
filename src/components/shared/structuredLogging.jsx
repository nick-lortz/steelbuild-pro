/**
 * Structured Logging for Backend Functions
 * Logs JSON format for CloudFlare Workers Analytics / Sentry
 */

export function createLogger(functionName) {
  return {
    info: (message, data = {}) => {
      console.log(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'info',
        function: functionName,
        message,
        ...data
      }));
    },

    error: (message, error, data = {}) => {
      console.error(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'error',
        function: functionName,
        message,
        error: error?.message || String(error),
        stack: error?.stack?.split('\n').slice(0, 3).join(' '),
        ...data
      }));
    },

    warn: (message, data = {}) => {
      console.warn(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'warn',
        function: functionName,
        message,
        ...data
      }));
    },

    perf: (operationName, durationMs, data = {}) => {
      // Log slow operations (> 1s)
      if (durationMs > 1000) {
        console.warn(JSON.stringify({
          timestamp: new Date().toISOString(),
          level: 'perf',
          function: functionName,
          operation: operationName,
          duration_ms: durationMs,
          ...data
        }));
      }
    }
  };
}

export default createLogger;