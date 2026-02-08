import { format, isValid } from "date-fns";

/**
 * Converts input to a valid Date object or returns null
 */
export function toValidDate(input) {
  if (!input) return null;
  const d = input instanceof Date ? input : new Date(input);
  return Number.isFinite(d.getTime()) ? d : null;
}

/**
 * Safely converts to ISO string with fallback
 */
export function safeISO(input) {
  const d = toValidDate(input);
  return d ? d.toISOString() : null;
}

/**
 * Safely formats a date with date-fns
 * Returns fallback string if date is invalid
 */
export function safeFormat(input, pattern = "yyyy-MM-dd", fallback = "—") {
  if (!input) return fallback;
  const d = input instanceof Date ? input : new Date(input);
  return isValid(d) ? format(d, pattern) : fallback;
}

/**
 * Display date with fallback for UI
 */
export function displayDate(input, pattern = "MMM d, yyyy", fallback = "—") {
  return safeFormat(input, pattern, fallback);
}

/**
 * Convert Unix timestamp (handles both seconds and milliseconds)
 */
export function fromUnixTime(ts) {
  if (!ts || typeof ts !== 'number') return null;
  const ms = ts < 1e12 ? ts * 1000 : ts;
  return toValidDate(ms);
}

/**
 * Diagnostic helper - logs date parsing issues
 */
export function debugDate(input, label = "date") {
  console.debug(`[${label}] raw:`, input, "type:", typeof input);
  const d = new Date(input);
  console.debug(`[${label}] parsed:`, d, "time:", d.getTime(), "valid:", !Number.isNaN(d.getTime()));
  return d;
}