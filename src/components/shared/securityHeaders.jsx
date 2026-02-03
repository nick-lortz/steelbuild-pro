/**
 * Security Headers & CSP Configuration
 * Apply in Layout or server configuration
 */

export const SECURITY_HEADERS = {
  // Content Security Policy - prevents XSS, clickjacking, injection
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://*.sentry.io",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    "connect-src 'self' https://*.sentry.io https://*.base44.io",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "upgrade-insecure-requests"
  ].join('; '),

  // Prevent clickjacking
  'X-Frame-Options': 'DENY',

  // Prevent MIME type sniffing
  'X-Content-Type-Options': 'nosniff',

  // Enable XSS protection (legacy, redundant with CSP)
  'X-XSS-Protection': '1; mode=block',

  // Referrer policy
  'Referrer-Policy': 'strict-origin-when-cross-origin',

  // Permissions policy
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=(), payment=()',

  // HSTS - force HTTPS (only in production)
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload'
};

/**
 * Apply headers to response
 * For Base44: headers auto-applied, but document for server deployment
 */
export const applySecurityHeaders = (response) => {
  Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  return response;
};

/**
 * Validation: Check if sensitive values leaked
 * Run in CI/CD before commit
 */
export const SENSITIVE_PATTERNS = [
  /api[_-]?key/i,
  /secret[_-]?key/i,
  /auth[_-]?token/i,
  /bearer\s+[a-z0-9]+/i,
  /sk_live_[a-z0-9]{20,}/i,  // Stripe key
  /sk_test_[a-z0-9]{20,}/i,
  /ghp_[a-z0-9]{36,}/i,       // GitHub token
  /[a-z0-9]{40}/i,            // Generic 40-char token
  /password\s*=\s*[^\s]+/i,
];

/**
 * Check string for secrets (use in pre-commit hook)
 * Returns array of matches or empty if clean
 */
export const detectSecrets = (content, filename = '') => {
  if (!content || typeof content !== 'string') return [];

  // Skip known safe files
  const safeFiles = ['package-lock.json', 'yarn.lock', '.git/', 'node_modules/'];
  if (safeFiles.some(safe => filename.includes(safe))) return [];

  const matches = [];
  SENSITIVE_PATTERNS.forEach(pattern => {
    const found = content.match(pattern);
    if (found) {
      matches.push({
        pattern: pattern.toString(),
        match: found[0].substring(0, 20) + '...',
        lineCount: content.substring(0, content.indexOf(found[0])).split('\n').length
      });
    }
  });

  return matches;
};

/**
 * Sanitize sensitive data from logs/errors
 * Removes API keys, tokens from error messages before sending to Sentry
 */
export const sanitizeLogs = (data) => {
  if (!data) return data;

  const sanitized = typeof data === 'string' ? data : JSON.stringify(data);
  let result = sanitized;

  SENSITIVE_PATTERNS.forEach(pattern => {
    result = result.replace(pattern, '[REDACTED]');
  });

  return result;
};

export default SECURITY_HEADERS;