/**
 * Server-side comparison utilities (Deno)
 * Mirrors frontend logic for backend sorting, validation, and logging
 */

const log = (level, msg, context) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [SORT_${level}] ${msg}`, JSON.stringify(context || {}));
};

/**
 * Normalize string: trim, collapse whitespace, remove leading punctuation
 */
export const normalize = (val) => {
  if (val == null) return '';
  return String(val)
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/^[^\w]+/, '');
};

/**
 * Split alphanumeric into { prefix: number, suffix: string, isNumeric: bool }
 */
export const splitAlphanumeric = (str) => {
  const normalized = normalize(str);
  const match = normalized.match(/^([A-Z]?)[\s\-]*(\d+)(.*)$/i);
  
  if (!match) {
    return { prefix: Number.MAX_SAFE_INTEGER, suffix: normalized, isNumeric: false };
  }
  
  const [, letter, numStr, suffix] = match;
  const prefix = parseInt(numStr, 10);
  const fullSuffix = letter ? `${letter}${suffix}` : suffix;
  
  return { prefix, suffix: fullSuffix.trim(), isNumeric: true };
};

/**
 * Parse numeric string or number, return integer or null
 */
export const parseNumeric = (val) => {
  if (val == null || val === '') return null;
  const normalized = normalize(val);
  const num = parseInt(normalized, 10);
  return isNaN(num) ? null : num;
};

/**
 * Parse ISO date or timestamp string
 */
export const parseDate = (val) => {
  if (val == null || val === '') return null;
  try {
    const timestamp = new Date(val).getTime();
    return isNaN(timestamp) ? null : timestamp; // Return milliseconds for easier comparison
  } catch {
    return null;
  }
};

/**
 * Compare two values with type awareness
 */
export const compareValues = (a, b, fieldType = 'auto') => {
  // Null/empty handling: sort to end
  const aIsNull = a == null || a === '';
  const bIsNull = b == null || b === '';
  
  if (aIsNull && bIsNull) return 0;
  if (aIsNull) return 1;
  if (bIsNull) return -1;

  try {
    // Date field
    if (fieldType === 'date') {
      const aTimestamp = parseDate(a);
      const bTimestamp = parseDate(b);
      if (aTimestamp && bTimestamp) {
        return aTimestamp - bTimestamp;
      }
      if (aTimestamp) return -1;
      if (bTimestamp) return 1;
      log('WARN', 'Invalid date in comparison', { a, b });
      return 0;
    }

    // Numeric field
    if (fieldType === 'numeric') {
      const aNum = parseNumeric(a);
      const bNum = parseNumeric(b);
      if (aNum != null && bNum != null) {
        return aNum - bNum;
      }
      if (aNum != null) return -1;
      if (bNum != null) return 1;
      log('WARN', 'Type mismatch: expected numeric', { a, b, fieldType });
      return 0;
    }

    // Alphanumeric field (code like RFI-007)
    if (fieldType === 'alphanumeric') {
      const aSplit = splitAlphanumeric(a);
      const bSplit = splitAlphanumeric(b);
      
      // Both are numeric codes
      if (aSplit.isNumeric && bSplit.isNumeric) {
        if (aSplit.prefix !== bSplit.prefix) {
          return aSplit.prefix - bSplit.prefix;
        }
        // Tiebreak by suffix (case-insensitive)
        return aSplit.suffix.localeCompare(bSplit.suffix, 'en', { 
          sensitivity: 'base' 
        });
      }
      
      // Fallback to text
      return normalize(String(a)).localeCompare(
        normalize(String(b)), 
        'en', 
        { sensitivity: 'base' }
      );
    }

    // Text field (default)
    return normalize(String(a)).localeCompare(normalize(String(b)), 'en', { 
      sensitivity: 'base' 
    });
  } catch (err) {
    log('ERROR', 'Comparison failed', { a, b, fieldType, error: err.message });
    return 0;
  }
};

/**
 * Safe compare with created_at fallback
 */
export const safeCompare = (aObj, bObj, fieldName, fieldType = 'auto') => {
  if (!aObj || !bObj) {
    log('WARN', 'Null object in safeCompare', { fieldName });
    return 0;
  }

  const aVal = aObj[fieldName];
  const bVal = bObj[fieldName];

  const result = compareValues(aVal, bVal, fieldType);
  
  // If equal, tiebreak by created_date
  if (result === 0 && aObj.created_date && bObj.created_date) {
    const createdA = parseDate(aObj.created_date);
    const createdB = parseDate(bObj.created_date);
    if (createdA && createdB) {
      return createdA - createdB;
    }
  }

  return result;
};

/**
 * Sort array of objects (server-side)
 */
export const sortBy = (items, fieldName, fieldType = 'auto', descending = false) => {
  if (!Array.isArray(items)) {
    log('WARN', 'sortBy called on non-array', { fieldName, type: typeof items });
    return items;
  }

  try {
    const sorted = [...items].sort((a, b) => {
      const cmp = safeCompare(a, b, fieldName, fieldType);
      return descending ? -cmp : cmp;
    });

    log('INFO', 'Sort completed', { 
      fieldName, 
      fieldType, 
      count: sorted.length, 
      descending 
    });

    return sorted;
  } catch (err) {
    log('ERROR', 'Sort failed', { fieldName, error: err.message });
    return items;
  }
};

/**
 * Validate sort parameters before use
 */
export const validateSortParams = (fieldName, fieldType, allowedFields) => {
  if (!allowedFields || !allowedFields.includes(fieldName)) {
    log('WARN', 'Unsupported sort field', { fieldName, allowed: allowedFields });
    return false;
  }

  const validTypes = ['auto', 'numeric', 'alphanumeric', 'date'];
  if (!validTypes.includes(fieldType)) {
    log('WARN', 'Unsupported field type', { fieldType, valid: validTypes });
    return false;
  }

  return true;
};

/**
 * Export for test/inspection
 */
export default {
  normalize,
  splitAlphanumeric,
  parseNumeric,
  parseDate,
  compareValues,
  safeCompare,
  sortBy,
  validateSortParams,
};