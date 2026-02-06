/**
 * Rate Limiting Utility
 * Prevents API abuse with token bucket algorithm
 */

const rateLimitStore = new Map();
const CLEANUP_INTERVAL = 60000; // Clean up every minute

// Default limits: 100 requests per minute per user
const DEFAULT_LIMITS = {
  requests: 100,
  windowMs: 60000
};

/**
 * Check and enforce rate limit
 * @param {string} identifier - User email or IP
 * @param {object} limits - { requests: number, windowMs: number }
 * @returns {object} { allowed: boolean, remaining: number, resetAt: number }
 */
export function checkRateLimit(identifier, limits = DEFAULT_LIMITS) {
  const now = Date.now();
  const key = identifier;
  
  let bucket = rateLimitStore.get(key);
  
  if (!bucket || now > bucket.resetAt) {
    // Create new bucket
    bucket = {
      count: 0,
      resetAt: now + limits.windowMs
    };
    rateLimitStore.set(key, bucket);
  }
  
  // Check limit
  if (bucket.count >= limits.requests) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: bucket.resetAt,
      retryAfter: Math.ceil((bucket.resetAt - now) / 1000)
    };
  }
  
  // Increment counter
  bucket.count++;
  
  return {
    allowed: true,
    remaining: limits.requests - bucket.count,
    resetAt: bucket.resetAt
  };
}

/**
 * Middleware wrapper for rate-limited functions
 */
export function withRateLimit(handler, limits = DEFAULT_LIMITS) {
  return async (req) => {
    try {
      // Extract user identifier
      const authHeader = req.headers.get('Authorization');
      const identifier = authHeader || req.headers.get('x-forwarded-for') || 'anonymous';
      
      const rateCheck = checkRateLimit(identifier, limits);
      
      if (!rateCheck.allowed) {
        return Response.json({
          error: 'Rate limit exceeded',
          retry_after: rateCheck.retryAfter
        }, { 
          status: 429,
          headers: {
            'Retry-After': rateCheck.retryAfter.toString(),
            'X-RateLimit-Limit': limits.requests.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': rateCheck.resetAt.toString()
          }
        });
      }
      
      // Execute handler
      const response = await handler(req);
      
      // Add rate limit headers to response
      if (response instanceof Response) {
        response.headers.set('X-RateLimit-Limit', limits.requests.toString());
        response.headers.set('X-RateLimit-Remaining', rateCheck.remaining.toString());
        response.headers.set('X-RateLimit-Reset', rateCheck.resetAt.toString());
      }
      
      return response;
      
    } catch (error) {
      throw error;
    }
  };
}

// Periodic cleanup of expired buckets
setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of rateLimitStore.entries()) {
    if (now > bucket.resetAt) {
      rateLimitStore.delete(key);
    }
  }
}, CLEANUP_INTERVAL);