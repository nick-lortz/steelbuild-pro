// PII redaction utilities for external API calls

export function redactPII(text = "") {
  if (!text) return "";
  
  return String(text)
    // Email addresses
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[REDACTED_EMAIL]")
    // Phone numbers (US format)
    .replace(/\b(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g, "[REDACTED_PHONE]")
    // Street addresses
    .replace(/\b\d{1,5}\s+[A-Za-z0-9.\s]+(?:St|Street|Ave|Avenue|Rd|Road|Blvd|Boulevard|Ln|Lane|Dr|Drive)\b/gi, "[REDACTED_ADDRESS]")
    // SSN
    .replace(/\b\d{3}-\d{2}-\d{4}\b/g, "[REDACTED_SSN]")
    // Credit card (basic)
    .replace(/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, "[REDACTED_CARD]");
}

export function redactFinancials(obj) {
  if (!obj || typeof obj !== "object") return obj;
  
  const redacted = { ...obj };
  
  // Remove or mask sensitive financial fields
  const sensitiveFields = [
    "contract_value",
    "total_budget",
    "actual_cost",
    "estimated_cost",
    "amount",
    "unit_cost",
    "cost_impact",
    "budgeted_amount",
    "total_amount",
    "scheduled_value"
  ];
  
  for (const field of sensitiveFields) {
    if (field in redacted && typeof redacted[field] === "number") {
      // Replace with magnitude indicators instead of exact values
      const value = redacted[field];
      if (value < 1000) redacted[field] = "<$1K";
      else if (value < 10000) redacted[field] = "$1K-$10K";
      else if (value < 100000) redacted[field] = "$10K-$100K";
      else if (value < 500000) redacted[field] = "$100K-$500K";
      else redacted[field] = ">$500K";
    }
  }
  
  return redacted;
}

export function buildMinimalPayload(entity, allowedFields) {
  if (!entity || typeof entity !== "object") return null;
  
  const minimal = {};
  for (const field of allowedFields) {
    if (field in entity) {
      minimal[field] = entity[field];
    }
  }
  
  return minimal;
}