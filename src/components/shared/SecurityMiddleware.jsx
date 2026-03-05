/**
 * Enterprise Security Middleware
 * Implements comprehensive security controls
 */

import DOMPurify from 'isomorphic-dompurify';
import { SECURITY_CONFIG } from './SecurityConfig.js';

export const sanitizeInput = (input, options = {}) => {
  if (typeof input !== 'string') return input;
  
  const config = { ...SECURITY_CONFIG.VALIDATION, ...options };
  
  if (input.length > config.maxStringLength) {
    throw new Error(`Input exceeds maximum length of ${config.maxStringLength}`);
  }
  
  if (config.sanitizeHtml) {
    return DOMPurify.sanitize(input, {
      ALLOWED_TAGS: config.allowedHtmlTags,
      ALLOWED_ATTR: ['href', 'title', 'alt'],
      FORBID_SCRIPT: true,
      FORBID_TAGS: ['script', 'object', 'embed', 'form', 'input'],
      FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover']
    });
  }
  
  return input;
};

export const sanitizeObject = (obj, depth = 0) => {
  if (depth > SECURITY_CONFIG.VALIDATION.maxObjectDepth) {
    throw new Error('Object nesting too deep');
  }
  
  if (Array.isArray(obj)) {
    if (obj.length > SECURITY_CONFIG.VALIDATION.maxArrayLength) {
      throw new Error('Array too large');
    }
    return obj.map(item => sanitizeObject(item, depth + 1));
  }
  
  if (obj && typeof obj === 'object') {
    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
      const cleanKey = sanitizeInput(key);
      sanitized[cleanKey] = sanitizeObject(value, depth + 1);
    }
    return sanitized;
  }
  
  return sanitizeInput(obj);
};

export const generateCSRFToken = () => {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
};

export const validateCSRFToken = (token, sessionToken) => {
  if (!token || !sessionToken) return false;
  return token === sessionToken;
};

export const validateRequest = (request) => {
  const userAgent = request.headers.get('user-agent');
  const contentType = request.headers.get('content-type');
  
  if (SECURITY_CONFIG.API.requireUserAgent && !userAgent) {
    throw new Error('User agent required');
  }
  
  if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
    if (!contentType || !contentType.includes('application/json')) {
      throw new Error('Invalid content type');
    }
  }
  
  if (SECURITY_CONFIG.API.blockSuspiciousPatterns) {
    // Only check URL for injection patterns — NOT request body.
    // Body content like "select W18x50" or "create shop drawings" is legitimate steel terminology.
    const urlPatterns = [
      /<script[^>]*>.*?<\/script>/gi,
      /javascript:/i,
      /vbscript:/i,
      /onload\s*=/i,
      /onerror\s*=/i,
      /onclick\s*=/i,
      /\b(union\s+select|drop\s+table|insert\s+into|delete\s+from|alter\s+table)\b/i,
    ];
    
    const url = request.url;
    if (urlPatterns.some(pattern => pattern.test(url))) {
      throw new Error('Suspicious request pattern detected');
    }
  }
  
  return true;
};

export const validateFileUpload = (file) => {
  const config = SECURITY_CONFIG.FILE_UPLOAD;
  
  if (file.size > config.maxSize) {
    throw new Error(`File size exceeds ${config.maxSize / (1024 * 1024)}MB limit`);
  }
  
  if (!config.allowedTypes.includes(file.type)) {
    throw new Error(`File type ${file.type} not allowed`);
  }
  
  const filename = file.name;
  if (!/^[a-zA-Z0-9._\- ()]+$/.test(filename)) {
    throw new Error('Invalid filename characters');
  }
  
  if (filename.length > 255) {
    throw new Error('Filename too long');
  }

  // Block dangerous double extensions (e.g., report.pdf.exe)
  const BLOCKED_EXTS = ['.exe','.bat','.cmd','.com','.scr','.pif','.vbs','.vbe','.js','.jse','.wsf','.wsh','.ps1','.msi','.dll','.hta','.lnk'];
  const parts = filename.toLowerCase().split('.');
  for (let i = 1; i < parts.length; i++) {
    if (BLOCKED_EXTS.includes('.' + parts[i])) {
      throw new Error(`Blocked file extension: .${parts[i]}`);
    }
  }
  
  return true;
};

export const getSecurityHeaders = () => {
  const csp = Object.entries(SECURITY_CONFIG.CSP)
    .map(([directive, sources]) => `${directive} ${sources.join(' ')}`)
    .join('; ');
  
  return {
    'Content-Security-Policy': csp,
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload'
  };
};

export default {
  sanitizeInput,
  sanitizeObject,
  generateCSRFToken,
  validateCSRFToken,
  validateRequest,
  validateFileUpload,
  getSecurityHeaders
};