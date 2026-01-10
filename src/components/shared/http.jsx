// HTTP client with rate limit handling, retries, and exponential backoff

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const jitter = (ms) => ms + Math.floor(Math.random() * (ms * 0.2));

export async function http(url, options = {}) {
  const { ignore429 = false, maxRetries = 3, ...fetchOptions } = options;
  let attempt = 0;

  while (true) {
    const res = await fetch(url, {
      ...fetchOptions,
      headers: {
        "Content-Type": "application/json",
        ...(fetchOptions.headers || {})
      }
    });

    // Success or non-retryable error
    if (res.status !== 429) {
      if (!res.ok && res.status !== 404) {
        throw new Error(`${res.status} ${res.statusText}`);
      }
      return res;
    }

    // 429 handling
    if (ignore429) throw new Error("429 Too Many Requests");

    const retryAfterHeader = res.headers.get("Retry-After");
    const retryAfterMs = retryAfterHeader ? Number(retryAfterHeader) * 1000 : 0;

    if (attempt >= maxRetries) {
      throw new Error("429: Max retries exceeded");
    }

    attempt++;
    const backoff = retryAfterMs || jitter(2 ** attempt * 300); // 300ms, 600ms, 1200ms (+jitter)
    console.warn(`[HTTP] 429 on ${url}, retrying after ${backoff}ms (attempt ${attempt}/${maxRetries})`);
    await sleep(backoff);
  }
}

export async function httpJSON(url, options = {}) {
  const res = await http(url, options);
  return res.json();
}