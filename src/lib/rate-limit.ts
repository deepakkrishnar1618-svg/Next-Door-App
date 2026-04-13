/**
 * In-memory per-IP rate limiter using a sliding window.
 * NOTE: Resets on server restart and does not share state across
 * Vercel edge instances — sufficient for Hobby plan (single region).
 */

interface Window {
  count: number;
  resetAt: number;
}

const store = new Map<string, Window>();

/** Clean up expired entries to avoid unbounded memory growth */
function prune() {
  const now = Date.now();
  Array.from(store.entries()).forEach(([key, win]) => {
    if (win.resetAt < now) store.delete(key);
  });
}

let pruneTimer: ReturnType<typeof setInterval> | null = null;
if (typeof setInterval !== 'undefined' && !pruneTimer) {
  pruneTimer = setInterval(prune, 60_000);
}

/**
 * Returns `true` when the request should be blocked (rate limit exceeded).
 *
 * @param ip      IP address string from the request
 * @param key     Namespace for the limiter (e.g. "messages", "auth")
 * @param limit   Max requests allowed per `windowMs`
 * @param windowMs  Window size in milliseconds (default 60 000 = 1 min)
 */
export function isRateLimited(
  ip: string,
  key: string,
  limit: number,
  windowMs = 60_000,
): boolean {
  const storeKey = `${key}:${ip}`;
  const now = Date.now();
  const win = store.get(storeKey);

  if (!win || win.resetAt < now) {
    store.set(storeKey, { count: 1, resetAt: now + windowMs });
    return false;
  }

  win.count += 1;
  if (win.count > limit) return true;
  return false;
}

/** Extract the real client IP from Next.js request headers */
export function getClientIp(request: Request): string {
  const xff = (request.headers as Headers).get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  return (request.headers as Headers).get('x-real-ip') ?? 'unknown';
}
