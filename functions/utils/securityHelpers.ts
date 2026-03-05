/**
 * Backend Security Helpers
 * 
 * Shared utilities for backend functions:
 * - requireSecret: fail-fast if env var is missing
 * - guardBodySize: reject oversized payloads
 * - sanitizeForLog: strip secrets from log output
 */

/**
 * Require an environment variable or throw with a clear message.
 * Call at the top of any function that needs a secret.
 *
 * @param {string} name - Environment variable name
 * @param {string} [hint] - Setup hint for the user
 * @returns {string} The secret value
 */
export function requireSecret(name, hint) {
  const value = Deno.env.get(name);
  if (!value) {
    const msg = `Missing required secret: ${name}` + (hint ? `. ${hint}` : '');
    throw new Error(msg);
  }
  return value;
}

/**
 * Guard against oversized request bodies.
 * Call before JSON.parse on the request body.
 *
 * @param {Request} req
 * @param {number} [maxBytes=10485760] - Max body size in bytes (default 10MB)
 * @returns {Promise<string>} The body text
 */
export async function guardBodySize(req, maxBytes = 10 * 1024 * 1024) {
  const contentLength = req.headers.get('content-length');
  if (contentLength && parseInt(contentLength) > maxBytes) {
    throw { status: 413, message: `Request body too large. Maximum: ${(maxBytes / 1024 / 1024).toFixed(0)}MB` };
  }

  const body = await req.text();
  if (body.length > maxBytes) {
    throw { status: 413, message: `Request body too large. Maximum: ${(maxBytes / 1024 / 1024).toFixed(0)}MB` };
  }

  return body;
}

/**
 * Parse JSON body with size guard.
 * Returns the parsed object or throws 400/413.
 */
export async function parseJsonBody(req, maxBytes = 10 * 1024 * 1024) {
  const body = await guardBodySize(req, maxBytes);
  
  if (!body || body.trim() === '') {
    return {};
  }

  try {
    return JSON.parse(body);
  } catch {
    throw { status: 400, message: 'Invalid JSON in request body' };
  }
}

/**
 * Sanitize a string for logging — redact common secret patterns.
 */
export function sanitizeForLog(text) {
  if (!text || typeof text !== 'string') return text;
  return text
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, 'Bearer [REDACTED]')
    .replace(/sk_(?:live|test)_[A-Za-z0-9]+/g, 'sk_***[REDACTED]')
    .replace(/ghp_[A-Za-z0-9]+/g, 'ghp_[REDACTED]')
    .replace(/key[=:]\s*["']?[A-Za-z0-9_-]{20,}["']?/gi, 'key=[REDACTED]');
}

/**
 * Standard error response builder for backend functions.
 */
export function errorResponse(status, message, details = null) {
  return Response.json(
    { error: message, ...(details && { details }) },
    { status }
  );
}

/**
 * Validate that the request method is one of the allowed methods.
 */
export function requireMethod(req, allowed = ['POST']) {
  if (!allowed.includes(req.method)) {
    throw { status: 405, message: `Method ${req.method} not allowed. Use: ${allowed.join(', ')}` };
  }
}