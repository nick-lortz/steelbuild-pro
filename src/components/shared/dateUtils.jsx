/**
 * Date Utilities for consistent date/time handling across the app
 * Fixes: date input formatting, timezone issues, string conversions
 */

/**
 * Convert a date (string, Date object) to YYYY-MM-DD format for input[type="date"]
 */
export const formatDateForInput = (date) => {
  if (!date) return '';
  
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    
    // Use local date without timezone conversion
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  } catch {
    return '';
  }
};

/**
 * Convert YYYY-MM-DD string from input[type="date"] back to ISO string for storage
 * Preserves date without timezone conversion
 */
export const parseInputDate = (dateStr) => {
  if (!dateStr) return null;
  
  try {
    // dateStr is YYYY-MM-DD from input[type="date"] (date-only, no time)
    // Return as-is without timezone conversion to avoid offset drift
    const [year, month, day] = dateStr.split('-').map(Number);
    if (!year || !month || !day) return null;
    
    return dateStr; // Store string directly without timezone math
  } catch {
    return null;
  }
};

/**
 * Format date for display (e.g., "Jan 15, 2026")
 */
export const formatDateDisplay = (date) => {
  if (!date) return '-';
  
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return '-';
  }
};

/**
 * Parse time input (HH:MM) - returns as-is for storage
 */
export const parseTimeInput = (timeStr) => {
  if (!timeStr) return null;
  const timeRegex = /^\d{2}:\d{2}$/;
  return timeRegex.test(timeStr) ? timeStr : null;
};

/**
 * Validate that end date is after start date
 */
export const isValidDateRange = (startDate, endDate) => {
  if (!startDate || !endDate) return true;
  
  try {
    const start = new Date(startDate);
    const end = new Date(endDate);
    return end >= start;
  } catch {
    return false;
  }
};