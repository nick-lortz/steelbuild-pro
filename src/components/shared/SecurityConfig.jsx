/**
 * Security Configuration
 * Central security settings for the application
 */

export const SECURITY_CONFIG = {
  // Content Security Policy
  CSP: {
    'default-src': ["'self'"],
    'script-src': ["'self'", "'unsafe-inline'", "'unsafe-eval'", 'https://base44.com'],
    'style-src': ["'self'", "'unsafe-inline'"],
    'img-src': ["'self'", 'data:', 'https:', 'blob:'],
    'font-src': ["'self'", 'data:', 'https://fonts.gstatic.com'],
    'connect-src': ["'self'", 'https://*.base44.app', 'https://base44.com', 'wss://*.base44.app'],
    'frame-src': ["'self'"],
    'object-src': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    'frame-ancestors': ["'none'"],
    'upgrade-insecure-requests': []
  },

  // Input validation
  VALIDATION: {
    maxStringLength: 10000,
    maxObjectDepth: 10,
    maxArrayLength: 1000,
    sanitizeHtml: true,
    allowedHtmlTags: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li', 'code', 'pre']
  },

  // File upload restrictions
  FILE_UPLOAD: {
    maxSize: 50 * 1024 * 1024, // 50MB
    allowedTypes: [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/csv',
      'text/plain',
      'application/zip'
    ]
  },

  // Rate limiting
  RATE_LIMITS: {
    api: {
      windowMs: 60000, // 1 minute
      max: 100
    },
    auth: {
      windowMs: 900000, // 15 minutes
      max: 5
    },
    fileUpload: {
      windowMs: 3600000, // 1 hour
      max: 50
    },
    navigation: {
      windowMs: 60000, // 1 minute
      max: 60
    }
  },

  // API security
  API: {
    requireUserAgent: false, // Don't block legitimate API clients
    blockSuspiciousPatterns: true,
    timeout: 30000
  }
};

export default SECURITY_CONFIG;