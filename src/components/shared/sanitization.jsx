/**
 * XSS Sanitization Utilities for User-Generated Content
 * 
 * CRITICAL: All user-generated content MUST be sanitized before rendering
 * 
 * USAGE:
 * import { sanitizeHTML, SafeHTML } from '@/components/shared/sanitization';
 * 
 * // Option 1: Component
 * <SafeHTML content={rfi.question} />
 * 
 * // Option 2: Function
 * const clean = sanitizeHTML(rfi.question);
 */

import DOMPurify from 'isomorphic-dompurify';

/**
 * Default DOMPurify configuration for general content
 */
const DEFAULT_CONFIG = {
  ALLOWED_TAGS: [
    'p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'ul', 'ol', 'li', 'blockquote', 'code', 'pre', 'a', 'span', 'div'
  ],
  ALLOWED_ATTR: ['href', 'target', 'rel', 'class'],
  ALLOW_DATA_ATTR: false,
  ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|cid|xmpp):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i
};

/**
 * Strict config for plain text (no HTML)
 */
const STRICT_CONFIG = {
  ALLOWED_TAGS: [],
  ALLOWED_ATTR: []
};

/**
 * Sanitize HTML content
 * @param {string} dirty - Untrusted user input
 * @param {object} config - DOMPurify config (optional)
 * @returns {string} - Sanitized HTML
 */
export function sanitizeHTML(dirty, config = DEFAULT_CONFIG) {
  if (!dirty) return '';
  return String(DOMPurify.sanitize(dirty, config));
}

/**
 * Sanitize to plain text only (strip all HTML)
 */
export function sanitizePlainText(dirty) {
  if (!dirty) return '';
  return String(DOMPurify.sanitize(dirty, STRICT_CONFIG));
}

/**
 * Sanitize markdown-enabled content (used in ProductionNotes, etc.)
 */
export function sanitizeMarkdown(dirty) {
  if (!dirty) return '';
  
  // Allow more tags for markdown rendering
  const markdownConfig = {
    ...DEFAULT_CONFIG,
    ALLOWED_TAGS: [
      ...DEFAULT_CONFIG.ALLOWED_TAGS,
      'table', 'thead', 'tbody', 'tr', 'th', 'td',
      'img', 'hr', 'dl', 'dt', 'dd'
    ],
    ALLOWED_ATTR: [...DEFAULT_CONFIG.ALLOWED_ATTR, 'src', 'alt', 'title']
  };
  
  return String(DOMPurify.sanitize(dirty, markdownConfig));
}

/**
 * React component for safe HTML rendering
 */
export function SafeHTML({ content, className = '', markdown = false }) {
  const sanitized = markdown 
    ? sanitizeMarkdown(content) 
    : sanitizeHTML(content);
  
  return (
    <div 
      className={className}
      dangerouslySetInnerHTML={{ __html: sanitized }}
    />
  );
}

/**
 * React component for plain text (strips all HTML)
 */
export function SafeText({ content, className = '' }) {
  const sanitized = sanitizePlainText(content);
  
  return <span className={className}>{sanitized}</span>;
}

/**
 * Sanitize object fields (for batch processing)
 * @param {object} obj - Object with potentially unsafe strings
 * @param {string[]} fields - Field names to sanitize
 * @returns {object} - Object with sanitized fields
 */
export function sanitizeObject(obj, fields) {
  const sanitized = { ...obj };
  
  for (const field of fields) {
    if (sanitized[field]) {
      sanitized[field] = sanitizeHTML(sanitized[field]);
    }
  }
  
  return sanitized;
}

/**
 * Sanitize array of objects
 */
export function sanitizeArray(arr, fields) {
  return arr.map(obj => sanitizeObject(obj, fields));
}
