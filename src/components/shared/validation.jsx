/**
 * FORM VALIDATION UTILITIES
 */

export const VALIDATION_RULES = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE: /^\+?1?\s*\(?(\d{3})\)?[-.\s]?(\d{3})[-.\s]?(\d{4})$/,
  MAX_LENGTHS: {
    notes: 5000,
    description: 2000,
    scope_of_work: 10000,
    rfi_question: 5000,
    rfi_response: 5000,
    subject: 200,
    title: 200,
    name: 100
  }
};

export function validateEmail(email) {
  if (!email) return { valid: true };
  if (!VALIDATION_RULES.EMAIL.test(email)) {
    return { valid: false, error: 'Invalid email format' };
  }
  return { valid: true };
}

export function validatePhone(phone) {
  if (!phone) return { valid: true };
  if (!VALIDATION_RULES.PHONE.test(phone)) {
    return { valid: false, error: 'Invalid phone format. Use: (555) 123-4567 or 555-123-4567' };
  }
  return { valid: true };
}

export function validateTextLength(text, fieldName) {
  if (!text) return { valid: true };
  const maxLength = VALIDATION_RULES.MAX_LENGTHS[fieldName] || 1000;
  if (text.length > maxLength) {
    return { 
      valid: false, 
      error: `${fieldName} exceeds maximum length of ${maxLength} characters (current: ${text.length})` 
    };
  }
  return { valid: true };
}

export function validateNumeric(value, options = {}) {
  if (value === null || value === undefined || value === '') {
    return options.required ? { valid: false, error: 'Value is required' } : { valid: true };
  }

  const num = Number(value);
  
  if (isNaN(num)) {
    return { valid: false, error: 'Must be a valid number' };
  }

  if (options.min !== undefined && num < options.min) {
    return { valid: false, error: `Must be at least ${options.min}` };
  }

  if (options.max !== undefined && num > options.max) {
    return { valid: false, error: `Must not exceed ${options.max}` };
  }

  if (options.integer && !Number.isInteger(num)) {
    return { valid: false, error: 'Must be a whole number' };
  }

  if (options.positive && num < 0) {
    return { valid: false, error: 'Must be positive' };
  }

  return { valid: true };
}

export function validatePercent(value) {
  return validateNumeric(value, { min: 0, max: 100 });
}

export function validateCurrency(value) {
  return validateNumeric(value, { min: 0, max: 999999999 });
}

export function validateHours(value) {
  return validateNumeric(value, { min: 0, max: 100000 });
}

export function validateDate(dateString) {
  if (!dateString) return { valid: true };
  
  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    return { valid: false, error: 'Invalid date format' };
  }
  
  return { valid: true };
}

export function validateDateRange(startDate, endDate) {
  if (!startDate || !endDate) return { valid: true };
  
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  if (start > end) {
    return { valid: false, error: 'End date must be after start date' };
  }
  
  return { valid: true };
}

/**
 * Validate all fields in a form
 */
export function validateForm(fields) {
  const errors = {};
  let isValid = true;

  Object.entries(fields).forEach(([key, validation]) => {
    if (!validation.valid) {
      errors[key] = validation.error;
      isValid = false;
    }
  });

  return { isValid, errors };
}