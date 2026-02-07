/**
 * Normalize backend function responses to a consistent shape.
 * 
 * Solves "page returns a number" and inconsistent response shapes by enforcing:
 * {
 *   ok: true,
 *   data: {...},
 *   warnings: [],
 *   meta: { version, ts }
 * }
 * 
 * @param {*} response - Raw response from base44.functions.invoke()
 * @param {string} functionName - Function name for debug logging
 * @returns {object} Normalized response
 */
export function normalizeInvoke(response, functionName = 'unknown') {
  try {
    // First unwrap: response.data if Axios response
    const firstUnwrap = response?.data ?? response;

    // Second unwrap: nested data/body/result/output
    const secondUnwrap = 
      firstUnwrap?.data ?? 
      firstUnwrap?.body ?? 
      firstUnwrap?.result ?? 
      firstUnwrap?.output ?? 
      firstUnwrap;

    // Check if already normalized (has ok + data fields)
    if (typeof secondUnwrap === 'object' && secondUnwrap !== null && 'ok' in secondUnwrap && 'data' in secondUnwrap) {
      console.debug(`[normalizeInvoke:${functionName}] Already normalized:`, secondUnwrap);
      return secondUnwrap;
    }

    // Detect primitives (number, string, boolean)
    if (typeof secondUnwrap !== 'object' || secondUnwrap === null) {
      console.warn(`[normalizeInvoke:${functionName}] Primitive response detected:`, secondUnwrap);
      return {
        ok: true,
        data: { value: secondUnwrap },
        warnings: [`Function returned primitive value instead of object. Wrapped in {value: ${secondUnwrap}}`],
        meta: { 
          functionName, 
          ts: new Date().toISOString(),
          normalized: true 
        }
      };
    }

    // Default: assume the unwrapped object IS the data
    console.debug(`[normalizeInvoke:${functionName}] Normalized to data object:`, secondUnwrap);
    return {
      ok: true,
      data: secondUnwrap,
      warnings: secondUnwrap.warnings || [],
      meta: {
        functionName,
        ts: new Date().toISOString(),
        normalized: true
      }
    };
  } catch (error) {
    console.error(`[normalizeInvoke:${functionName}] Normalization error:`, error);
    return {
      ok: false,
      data: null,
      warnings: [`Failed to normalize response: ${error.message}`],
      meta: {
        functionName,
        ts: new Date().toISOString(),
        error: error.message
      }
    };
  }
}

/**
 * Validation schemas for specific functions (enforce response contracts).
 * Add new functions here to validate response shapes.
 */
export const FUNCTION_CONTRACTS = {
  getWorkPackagesBoardData: {
    required: ['project', 'snapshot', 'packages'],
    optional: ['needsAttention', 'tasksByPackage', 'ai', 'warnings']
  },
  getScheduleWorkspaceData: {
    required: ['project', 'snapshot', 'tasks'],
    optional: ['exceptions', 'ai', 'warnings']
  },
  getFabricationControlData: {
    required: ['project', 'snapshot', 'packages'],
    optional: ['shipping', 'holds', 'ai', 'warnings']
  },
  getDeliveryManagementData: {
    required: ['project', 'snapshot', 'deliveries'],
    optional: ['conflicts', 'ai', 'warnings']
  },
  getFinancialsDashboardData: {
    required: ['project', 'snapshot', 'breakdown', 'billing'],
    optional: ['ai', 'warnings', 'integrityWarnings']
  },
  getBudgetControlData: {
    required: ['project', 'snapshot', 'lines'],
    optional: ['drivers', 'commitments', 'ai', 'warnings', 'integrityWarnings']
  },
  getLookAheadData: {
    required: ['project', 'readiness', 'weeks'],
    optional: ['constraints', 'ai', 'warnings']
  }
};

/**
 * Validate normalized response against function contract.
 * 
 * @param {object} normalized - Normalized response from normalizeInvoke()
 * @param {string} functionName - Function name
 * @returns {object} { valid: boolean, missingFields: string[] }
 */
export function validateContract(normalized, functionName) {
  const contract = FUNCTION_CONTRACTS[functionName];
  if (!contract) {
    console.debug(`[validateContract] No contract defined for ${functionName}`);
    return { valid: true, missingFields: [] };
  }

  const data = normalized.data || {};
  const missing = [];

  contract.required.forEach(field => {
    if (!(field in data)) {
      missing.push(field);
    }
  });

  if (missing.length > 0) {
    console.error(`[validateContract:${functionName}] Missing required fields:`, missing);
    console.error(`[validateContract:${functionName}] Received data:`, data);
  }

  return { valid: missing.length === 0, missingFields: missing };
}

/**
 * Safe invoke wrapper that normalizes + validates responses.
 * 
 * @param {string} functionName - Backend function name
 * @param {object} payload - Function payload
 * @returns {Promise<object>} Normalized response
 */
export async function safeInvoke(functionName, payload = {}) {
  try {
    const response = await base44.functions.invoke(functionName, payload);
    const normalized = normalizeInvoke(response, functionName);
    const validation = validateContract(normalized, functionName);

    if (!validation.valid) {
      normalized.warnings.push(`Contract validation failed: missing ${validation.missingFields.join(', ')}`);
    }

    return normalized;
  } catch (error) {
    console.error(`[safeInvoke:${functionName}] Invoke error:`, error);
    return {
      ok: false,
      data: null,
      warnings: [`Function invocation failed: ${error.message}`],
      meta: {
        functionName,
        ts: new Date().toISOString(),
        error: error.message
      }
    };
  }
}