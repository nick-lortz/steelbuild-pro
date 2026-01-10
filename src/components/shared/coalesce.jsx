// Request coalescing - deduplicates identical in-flight requests

const inFlight = new Map();

export function coalescedJSON(key, executeFn) {
  if (inFlight.has(key)) {
    return inFlight.get(key);
  }

  const promise = executeFn()
    .then(async (response) => {
      inFlight.delete(key);
      return response.json();
    })
    .catch((error) => {
      inFlight.delete(key);
      return Promise.reject(error);
    });

  inFlight.set(key, promise);
  return promise;
}

export function clearCoalescedCache(key) {
  if (key) {
    inFlight.delete(key);
  } else {
    inFlight.clear();
  }
}

export function getInFlightCount() {
  return inFlight.size;
}