/**
 * Structured Logging Utility
 * Consistent log format for debugging and monitoring
 */

const LOG_LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
};

const currentLevel = LOG_LEVELS[import.meta.env.VITE_LOG_LEVEL || 'info'];

function shouldLog(level) {
  return LOG_LEVELS[level] >= currentLevel;
}

function formatLog(level, context, message, data) {
  return {
    timestamp: new Date().toISOString(),
    level,
    context,
    message,
    ...(data && { data })
  };
}

export const logger = {
  debug(context, message, data) {
    if (shouldLog('debug')) {
      console.debug('[DEBUG]', formatLog('debug', context, message, data));
    }
  },
  
  info(context, message, data) {
    if (shouldLog('info')) {
      console.log('[INFO]', formatLog('info', context, message, data));
    }
  },
  
  warn(context, message, data) {
    if (shouldLog('warn')) {
      console.warn('[WARN]', formatLog('warn', context, message, data));
    }
  },
  
  error(context, message, error, data) {
    if (shouldLog('error')) {
      console.error('[ERROR]', formatLog('error', context, message, {
        ...data,
        error: error?.message || error,
        stack: error?.stack
      }));
    }
  },
  
  // Performance logging
  perf(context, operation, durationMs, data) {
    if (shouldLog('info')) {
      console.log('[PERF]', formatLog('info', context, `${operation} took ${durationMs}ms`, data));
    }
  },
  
  // User action logging
  action(context, action, data) {
    if (shouldLog('info')) {
      console.log('[ACTION]', formatLog('info', context, action, data));
    }
  }
};

/**
 * Performance measurement wrapper
 */
export function measurePerf(context, operation, fn) {
  const start = performance.now();
  try {
    const result = fn();
    const duration = performance.now() - start;
    logger.perf(context, operation, Math.round(duration));
    return result;
  } catch (error) {
    const duration = performance.now() - start;
    logger.error(context, `${operation} failed after ${Math.round(duration)}ms`, error);
    throw error;
  }
}

/**
 * Async performance measurement
 */
export async function measurePerfAsync(context, operation, fn) {
  const start = performance.now();
  try {
    const result = await fn();
    const duration = performance.now() - start;
    logger.perf(context, operation, Math.round(duration));
    return result;
  } catch (error) {
    const duration = performance.now() - start;
    logger.error(context, `${operation} failed after ${Math.round(duration)}ms`, error);
    throw error;
  }
}