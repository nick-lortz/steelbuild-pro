/**
 * Robust comparison logic for sorting across SteelBuild-Pro
 * Rules: numeric parsing, alphanumeric split, case-insensitive, whitespace normalization,
 * date parsing, null-safe, with type mismatch logging and created_at fallback
 */

const logger = (msg, context) => {
  if (typeof console !== 'undefined') {
    console.warn(`[SORT_COMPARISON] ${msg}`, context);
  }
};

/**
 * Normalize: trim, collapse whitespace, remove leading punctuation
 */
export const normalize = (val) => {
  if (val == null) return '';
  return String(val)
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/^[^\w]+/, '');
};

/**
 * Extract numeric prefix + suffix from alphanumeric string
 * E.g., "A-007-X" → { prefix: 7, suffix: "-X" }
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
 * Parse numeric string ("007" → 7), handle fallback to NaN
 */
export const parseNumeric = (val) => {
  if (val == null || val === '') return null;
  const normalized = normalize(val);
  const num = parseInt(normalized, 10);
  return isNaN(num) ? null : num;
};

/**
 * Parse ISO date string or timestamp, return Date object or null
 */
export const parseDate = (val) => {
  if (val == null || val === '') return null;
  try {
    const date = new Date(val);
    return isNaN(date.getTime()) ? null : date;
  } catch {
    return null;
  }
};

/**
 * Main comparator function
 * Handles: numeric, alphanumeric, text, date, null/empty
 * Returns: -1 (a < b), 0 (a === b), 1 (a > b)
 */
export const compareValues = (a, b, fieldType = 'auto', fallbackField = null) => {
  // Null/empty handling: always sort to end
  const aIsNull = a == null || a === '';
  const bIsNull = b == null || b === '';
  
  if (aIsNull && bIsNull) return 0;
  if (aIsNull) return 1;
  if (bIsNull) return -1;

  // Date field
  if (fieldType === 'date') {
    const aDate = parseDate(a);
    const bDate = parseDate(b);
    if (aDate && bDate) return aDate.getTime() - bDate.getTime();
    if (aDate) return -1;
    if (bDate) return 1;
    logger(`Invalid date in field`, { a, b });
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
    logger(`Type mismatch: expected numeric`, { a, b });
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
      // Tiebreak by suffix
      return aSplit.suffix.localeCompare(bSplit.suffix, 'en', { 
        sensitivity: 'base' 
      });
    }
    
    // Fallback to text comparison
    return normalize(String(a)).localeCompare(
      normalize(String(b)), 
      'en', 
      { sensitivity: 'base' }
    );
  }

  // Text field (default/auto)
  const aText = normalize(String(a));
  const bText = normalize(String(b));
  return aText.localeCompare(bText, 'en', { sensitivity: 'base' });
};

/**
 * Safe comparator with fallback to created_at
 */
export const safeCompare = (aObj, bObj, fieldName, fieldType = 'auto') => {
  if (!aObj || !bObj) {
    logger('Null object in safeCompare', { aObj, bObj });
    return 0;
  }

  const aVal = aObj[fieldName];
  const bVal = bObj[fieldName];

  const result = compareValues(aVal, bVal, fieldType);
  
  // If values are equal, tiebreak by created_at
  if (result === 0 && aObj.created_date && bObj.created_date) {
    const createdA = parseDate(aObj.created_date);
    const createdB = parseDate(bObj.created_date);
    if (createdA && createdB) {
      return createdA.getTime() - createdB.getTime();
    }
  }

  return result;
};

/**
 * Sort array of objects
 */
export const sortBy = (items, fieldName, fieldType = 'auto', descending = false) => {
  if (!Array.isArray(items)) return items;

  const sorted = [...items].sort((a, b) => {
    const cmp = safeCompare(a, b, fieldName, fieldType);
    return descending ? -cmp : cmp;
  });

  return sorted;
};

export default {
  normalize,
  splitAlphanumeric,
  parseNumeric,
  parseDate,
  compareValues,
  safeCompare,
  sortBy,
};