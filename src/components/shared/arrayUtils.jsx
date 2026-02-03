/**
 * Performance-optimized array utilities
 * Pre-indexing and grouping to eliminate N+1 loops
 */

/**
 * Group array by key (O(n) instead of O(n²))
 */
export function groupBy(array, keyFn) {
  const groups = {};
  
  for (const item of array) {
    const key = typeof keyFn === 'function' ? keyFn(item) : item[keyFn];
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(item);
  }
  
  return groups;
}

/**
 * Index array by key for O(1) lookups
 */
export function indexBy(array, keyFn) {
  const index = {};
  
  for (const item of array) {
    const key = typeof keyFn === 'function' ? keyFn(item) : item[keyFn];
    index[key] = item;
  }
  
  return index;
}

/**
 * Multi-index for multiple keys (e.g., project_id + status)
 */
export function multiIndexBy(array, keyFns) {
  const index = {};
  
  for (const item of array) {
    const keys = keyFns.map(fn => 
      typeof fn === 'function' ? fn(item) : item[fn]
    );
    const compositeKey = keys.join('::');
    
    if (!index[compositeKey]) {
      index[compositeKey] = [];
    }
    index[compositeKey].push(item);
  }
  
  return index;
}

/**
 * Count by key
 */
export function countBy(array, keyFn) {
  const counts = {};
  
  for (const item of array) {
    const key = typeof keyFn === 'function' ? keyFn(item) : item[keyFn];
    counts[key] = (counts[key] || 0) + 1;
  }
  
  return counts;
}

/**
 * Sum by key
 */
export function sumBy(array, keyFn, valueFn) {
  const sums = {};
  
  for (const item of array) {
    const key = typeof keyFn === 'function' ? keyFn(item) : item[keyFn];
    const value = typeof valueFn === 'function' ? valueFn(item) : item[valueFn] || 0;
    sums[key] = (sums[key] || 0) + value;
  }
  
  return sums;
}