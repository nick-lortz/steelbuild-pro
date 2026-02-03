/**
 * Backend Structured Logging
 * Consistent format for Deno functions
 */

const LOG_LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
};

const currentLevel = LOG_LEVELS[Deno.env.get('LOG_LEVEL') || 'info'];

function shouldLog(level) {
  return LOG_LEVELS[level] >= currentLevel;
}

function formatLog(level, context, message, data) {
  const log = {
    timestamp: new Date().toISOString(),
    level: level.toUpperCase(),
    context,
    message
  };
  
  if (data) {
    log.data = data;
  }
  
  return JSON.stringify(log);
}

export const logger = {
  debug(context, message, data) {
    if (shouldLog('debug')) {
      console.log(formatLog('debug', context, message, data));
    }
  },
  
  info(context, message, data) {
    if (shouldLog('info')) {
      console.log(formatLog('info', context, message, data));
    }
  },
  
  warn(context, message, data) {
    if (shouldLog('warn')) {
      console.warn(formatLog('warn', context, message, data));
    }
  },
  
  error(context, message, error, data) {
    if (shouldLog('error')) {
      console.error(formatLog('error', context, message, {
        ...data,
        error: error?.message || String(error),
        stack: error?.stack
      }));
    }
  },
  
  audit(context, action, user, entityType, entityId, changes) {
    if (shouldLog('info')) {
      console.log(formatLog('info', context, 'AUDIT', {
        action,
        user,
        entity_type: entityType,
        entity_id: entityId,
        changes
      }));
    }
  }
};

export function logFunctionCall(functionName, user, payload) {
  logger.info(functionName, 'Function invoked', {
    user_email: user?.email,
    user_role: user?.role,
    payload_size: JSON.stringify(payload || {}).length
  });
}

export function logFunctionSuccess(functionName, durationMs, result) {
  logger.info(functionName, `Function completed in ${durationMs}ms`, {
    duration_ms: durationMs,
    result_type: typeof result
  });
}

export function logFunctionError(functionName, durationMs, error) {
  logger.error(functionName, `Function failed after ${durationMs}ms`, error, {
    duration_ms: durationMs
  });
}