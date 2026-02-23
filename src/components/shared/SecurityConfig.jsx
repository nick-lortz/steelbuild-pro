/**
 * Enterprise Security Configuration
 * Centralized security settings and policies
 */

export const SECURITY_CONFIG = {
  // Content Security Policy
  CSP: {
    'default-src': ["'self'"],
    'script-src': ["'self'", "'unsafe-inline'", 'https://js.stripe.com'],
    'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
    'font-src': ["'self'", 'https://fonts.gstatic.com'],
    'img-src': ["'self'", 'data:', 'https:', 'blob:'],
    'connect-src': ["'self'", 'https://api.stripe.com', 'wss:'],
    'frame-src': ["'self'", 'https://js.stripe.com'],
    'object-src': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    'frame-ancestors': ["'none'"],
    'upgrade-insecure-requests': []
  },

  // Rate limiting configuration
  RATE_LIMITS: {
    api: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 1000, // limit each IP to 1000 requests per windowMs
      message: 'Too many requests from this IP'
    },
    auth: {
      windowMs: 15 * 60 * 1000,
      max: 5, // limit each IP to 5 auth attempts per windowMs
      message: 'Too many authentication attempts'
    },
    upload: {
      windowMs: 60 * 1000, // 1 minute
      max: 10, // limit uploads
      message: 'Too many file uploads'
    }
  },

  // Session configuration
  SESSION: {
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    secure: true, // HTTPS only
    httpOnly: true,
    sameSite: 'strict'
  },

  // File upload restrictions
  FILE_UPLOAD: {
    maxSize: 50 * 1024 * 1024, // 50MB
    allowedTypes: [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/gif',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'text/csv'
    ],
    quarantineTime: 5 * 60 * 1000 // 5 minutes
  },

  // Input validation
  VALIDATION: {
    maxStringLength: 10000,
    maxArrayLength: 1000,
    maxObjectDepth: 10,
    sanitizeHtml: true,
    allowedHtmlTags: ['b', 'i', 'u', 'strong', 'em', 'p', 'br', 'ul', 'ol', 'li']
  },

  // API security
  API: {
    requireApiKey: true,
    requireUserAgent: true,
    blockSuspiciousPatterns: true,
    logAllRequests: true
  }
};

export default SECURITY_CONFIG;