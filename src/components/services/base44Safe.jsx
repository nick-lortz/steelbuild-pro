import { base44 } from '@/api/base44Client';
import { apiClient } from '@/api/client';

function sanitizeTaskParams(params = {}) {
  const out = { ...params };
  const q = out.q;
  
  if (q == null) {
    delete out.q;
  } else {
    const s = String(q).trim();
    if (!s || s === 'null' || s === 'undefined') {
      delete out.q;
    } else {
      out.q = s;
    }
  }
  
  return out;
}

function logIfHasQ(params, method, caller) {
  const rawQ = params?.q;
  if (rawQ != null) {
    const stack = new Error().stack?.split('\n')[3] || '';
    console.warn(`[TRACE Task.${method}] q="${rawQ}" from:`, stack.trim(), caller);
  }
}

export const base44Safe = {
  entities: {
    Task: {
      list: (sortBy, limit) => {
        // Original signature compatibility
        return apiClient.entities.Task.list(sortBy, limit);
      },
      filter: (params, sortBy, limit) => {
        const sanitized = sanitizeTaskParams(params);
        logIfHasQ(sanitized, 'filter', 'Task.filter');
        return apiClient.entities.Task.filter(sanitized, sortBy, limit);
      }
    }
  }
};