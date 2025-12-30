// Utility functions for handling dates without timezone issues

/**
 * Parses a date string (YYYY-MM-DD) to a Date object at midnight local time
 * Prevents timezone offset issues when working with date-only values
 */
export const parseLocalDate = (dateString) => {
  if (!dateString) return null;
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
};

/**
 * Formats a Date object to YYYY-MM-DD string for storage
 * Always uses local timezone to match user's input
 */
export const formatLocalDate = (date) => {
  if (!date) return null;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};