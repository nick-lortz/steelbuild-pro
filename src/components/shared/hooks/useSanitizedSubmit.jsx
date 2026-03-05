/**
 * useSanitizedSubmit — Auto-sanitize form data before entity writes
 * 
 * Strips XSS vectors from all string fields using DOMPurify.
 * Use this hook to wrap mutation calls that accept user input.
 * 
 * Usage:
 *   const sanitize = useSanitizedSubmit();
 *   createMutation.mutate(sanitize(formData));
 */

import { useCallback } from 'react';
import DOMPurify from 'isomorphic-dompurify';

// Fields that should be stripped to plain text (no HTML at all)
const PLAIN_TEXT_FIELDS = [
  'title', 'name', 'subject', 'project_number', 'rfi_number_draft',
  'co_number', 'package_number', 'piece_mark', 'area_gridline',
  'email', 'phone', 'location', 'client', 'contact_name',
  'gc_contact', 'gc_email', 'gc_phone', 'inspector',
  'assigned_to', 'project_manager', 'superintendent',
  'crew_name', 'shop_foreman', 'qc_inspector',
];

// Fields that allow limited HTML (rich text editors)
const RICH_TEXT_FIELDS = [
  'description', 'question', 'response', 'background',
  'scope_of_work', 'notes', 'resolution_notes', 'mitigation',
  'corrective_actions', 'explanation', 'review_notes',
  'suggested_response', 'change_summary',
];

const RICH_TEXT_CONFIG = {
  ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'ul', 'ol', 'li', 'a', 'code', 'pre', 'blockquote', 'h1', 'h2', 'h3'],
  ALLOWED_ATTR: ['href', 'target', 'rel'],
  ALLOW_DATA_ATTR: false,
};

const PLAIN_TEXT_CONFIG = {
  ALLOWED_TAGS: [],
  ALLOWED_ATTR: [],
};

function sanitizeValue(key, value) {
  if (typeof value !== 'string') return value;
  if (!value) return value;

  // Plain text fields — strip all HTML
  if (PLAIN_TEXT_FIELDS.includes(key)) {
    return DOMPurify.sanitize(value, PLAIN_TEXT_CONFIG);
  }

  // Rich text fields — allow safe HTML
  if (RICH_TEXT_FIELDS.includes(key)) {
    return DOMPurify.sanitize(value, RICH_TEXT_CONFIG);
  }

  // Default: strip all HTML for unknown string fields
  return DOMPurify.sanitize(value, PLAIN_TEXT_CONFIG);
}

function sanitizeData(data) {
  if (!data || typeof data !== 'object') return data;
  if (Array.isArray(data)) return data.map(item => sanitizeData(item));

  const sanitized = {};
  for (const [key, value] of Object.entries(data)) {
    if (Array.isArray(value)) {
      sanitized[key] = value.map(item =>
        typeof item === 'object' ? sanitizeData(item) : sanitizeValue(key, item)
      );
    } else if (value && typeof value === 'object' && !(value instanceof Date) && !(value instanceof File)) {
      sanitized[key] = sanitizeData(value);
    } else {
      sanitized[key] = sanitizeValue(key, value);
    }
  }
  return sanitized;
}

export default function useSanitizedSubmit() {
  return useCallback((data) => sanitizeData(data), []);
}

// Also export the raw function for use outside React
export { sanitizeData, sanitizeValue };