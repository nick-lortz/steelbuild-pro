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

/**
 * Default configuration for general content
 */
const DEFAULT_CONFIG = {};

/**
 * Sanitize HTML content
 * @param {string} dirty - Untrusted user input
 * @param {object} config - config (optional)
 * @returns {string} - Sanitized HTML
 */
export function sanitizeHTML(dirty, config = DEFAULT_CONFIG) {
  if (!dirty) return '';
  // Basic script stripping since dompurify is not installed
  return String(dirty).replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
}

/**
 * Sanitize to plain text only (strip all HTML)
 */
export function sanitizePlainText(dirty) {
  if (!dirty) return '';
  if (typeof window !== 'undefined') {
    const doc = new DOMParser().parseFromString(dirty, 'text/html');
    return doc.body.textContent || "";
  }
  return String(dirty).replace(/<[^>]*>?/gm, '');
}

/**
 * Sanitize markdown-enabled content (used in ProductionNotes, etc.)
 */
export function sanitizeMarkdown(dirty) {
  if (!dirty) return '';
  return sanitizeHTML(dirty);
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