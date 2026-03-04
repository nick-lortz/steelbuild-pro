/**
 * Centralized error handling for backend functions
 * Logs structured errors, returns consistent responses
 */

const createErrorResponse = (status, code, message, context = {}) => {
  return {
    status,
    body: JSON.stringify({ error: code, message, ...context })
  };
};

export function handleFunctionError(error, functionName, context = {}) {
  const timestamp = new Date().toISOString();
  const errorLog = {
    timestamp,
    function: functionName,
    error: error?.message || String(error),
    errorCode: error?.code,
    stack: error?.stack?.split('\n').slice(0, 2).join(' '),
    context
  };

  console.error(JSON.stringify(errorLog));

  // Check structured error code first
  if (error?.code === 'VALIDATION_ERROR' || error?.code === 'ZOD_ERROR') {
    return createErrorResponse(400, 'VALIDATION_ERROR', error.message);
  }

  if (error?.code === 'CONFLICT' || error?.code === 'DUPLICATE') {
    return createErrorResponse(409, 'CONFLICT', error.message);
  }

  if (error?.code === 'NOT_FOUND') {
    return createErrorResponse(404, 'NOT_FOUND', error.message);
  }

  if (error?.code === 'FORBIDDEN') {
    return createErrorResponse(403, 'FORBIDDEN', error.message);
  }

  if (error?.code === 'RATE_LIMIT') {
    return createErrorResponse(429, 'RATE_LIMIT', error.message);
  }

  // Map error types to HTTP responses (message-based fallback)
  if (error?.message?.includes('Unauthorized') || error?.status === 401) {
    return createErrorResponse(401, 'UNAUTHORIZED', 'Authentication required');
  }

  if (error?.message?.includes('Forbidden') || error?.status === 403) {
    return createErrorResponse(403, 'FORBIDDEN', 'Insufficient permissions');
  }

  if (error?.message?.includes('not found') || error?.status === 404) {
    return createErrorResponse(404, 'NOT_FOUND', error.message);
  }

  // Specific pattern for duplicate/conflict (must come after NOT_FOUND)
  if (error?.message?.match(/^Duplicate|already exists|unique constraint/i)) {
    return createErrorResponse(409, 'CONFLICT', error.message);
  }

  // Validation errors (must come after specific code checks)
  if (error?.message?.match(/validation|required|invalid|must be/i)) {
    return createErrorResponse(400, 'VALIDATION_ERROR', error.message);
  }

  // Default to 500
  return createErrorResponse(500, 'INTERNAL_ERROR', `Internal error in ${functionName}. Contact support with request ID.`);
}

export function wrapFunction(functionName, handler) {
  return async (req) => {
    const startTime = Date.now();
    try {
      const result = await handler(req);
      const duration = Date.now() - startTime;
      if (duration > 1000) {
        console.warn(JSON.stringify({ function: functionName, duration_ms: duration, level: 'perf' }));
      }
      return result;
    } catch (error) {
      const { status, body } = handleFunctionError(error, functionName);
      return new Response(body, { status, headers: { 'Content-Type': 'application/json' } });
    }
  };
}

export default { handleFunctionError, wrapFunction, createErrorResponse };