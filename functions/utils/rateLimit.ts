/**
 * Simple In-Memory Rate Limiter
 * 
 * NOTE: This is a basic implementation. For production at scale, use:
 * - Redis-backed rate limiting
 * - Distributed rate limiting (if multiple backend instances)
 * - Base44 platform-level rate limiting
 */

const rateLimitStore = new Map();

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, data] of rateLimitStore.entries()) {
    if (now - data.windowStart > data.windowMs) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

/**
 * Check if request should be rate limited
 * 
 * @param {string} identifier - User email or IP
 * @param {number} maxRequests - Max requests per window
 * @param {number} windowMs - Time window in milliseconds
 * @returns {object} { allowed: boolean, remaining: number, resetAt: number }
 */
export function checkRateLimit(identifier, maxRequests = 100, windowMs = 60 * 1000) {
  const now = Date.now();
  const key = `${identifier}:${windowMs}`;
  
  let entry = rateLimitStore.get(key);
  
  // Create new window if doesn't exist or expired
  if (!entry || (now - entry.windowStart) > windowMs) {
    entry = {
      count: 0,
      windowStart: now,
      windowMs
    };
    rateLimitStore.set(key, entry);
  }
  
  // Check limit
  if (entry.count >= maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: entry.windowStart + windowMs,
      retryAfter: Math.ceil((entry.windowStart + windowMs - now) / 1000)
    };
  }
  
  // Increment and allow
  entry.count++;
  
  return {
    allowed: true,
    remaining: maxRequests - entry.count,
    resetAt: entry.windowStart + windowMs
  };
}

/**
 * Create rate limit response
 */
export function rateLimitResponse(retryAfter) {
  return new Response(
    JSON.stringify({
      error: 'Rate limit exceeded',
      message: 'Too many requests. Please try again later.',
      retry_after_seconds: retryAfter
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(retryAfter)
      }
    }
  );
}