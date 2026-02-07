import { base44 } from '@/api/base44Client';

/**
 * Normalized function invocation helper
 * Unwraps nested response shapes and provides diagnostics for missing data
 */
export async function invokeNormalized(functionName, payload = {}) {
  try {
    const response = await base44.functions.invoke(functionName, payload);
    
    // Unwrap response.data if present
    const d = response?.data ?? response;
    
    // Unwrap nested data/body/result layers
    const normalized = (d?.data || d?.body || d?.result) || d;
    
    // Dev diagnostics for missing critical keys
    if (process.env.NODE_ENV === 'development' && (!normalized || typeof normalized !== 'object')) {
      console.warn(`[invokeNormalized] ${functionName} returned empty/null:`, normalized);
    }
    
    return normalized;
  } catch (error) {
    console.error(`[invokeNormalized] ${functionName} failed:`, error);
    throw error;
  }
}

/**
 * Validate expected keys exist in response
 */
export function validateResponse(data, expectedKeys, context = '') {
  const missing = [];
  
  if (!data || typeof data !== 'object') {
    return { valid: false, missing: expectedKeys, data: null };
  }
  
  expectedKeys.forEach(key => {
    if (!(key in data)) {
      missing.push(key);
    }
  });
  
  if (missing.length > 0 && process.env.NODE_ENV === 'development') {
    console.warn(`[validateResponse] ${context} missing keys:`, missing);
  }
  
  return { valid: missing.length === 0, missing, data };
}