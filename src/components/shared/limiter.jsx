// Gentle concurrency limiter - prevents request stampedes

let active = 0;
const queue = [];
const MAX_CONCURRENT = 4; // Tune lower if needed (2-3 for preview environments)

export async function withConcurrency(fn) {
  // Wait if at max concurrent requests
  if (active >= MAX_CONCURRENT) {
    await new Promise((resolve) => queue.push(resolve));
  }

  active++;

  try {
    return await fn();
  } finally {
    active--;
    const next = queue.shift();
    if (next) next();
  }
}

export function getActiveRequests() {
  return active;
}

export function getQueuedRequests() {
  return queue.length;
}

export function setMaxConcurrent(max) {
  if (max > 0 && max <= 20) {
    MAX_CONCURRENT = max;
  }
}