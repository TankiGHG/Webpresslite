import 'server-only';

/**
 * Per-user upload throttle.
 *
 * Better Auth's rate limiting only covers its own endpoints, and uploads are
 * the other expensive path: each one costs a presigned URL, a download and
 * three `sharp` runs. Keyed by user rather than IP, because an upload always
 * happens in an authenticated session.
 */
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 20;

interface Bucket {
  count: number;
  resetAt: number;
}

const globalForLimit = globalThis as unknown as {
  __webpresslite_upload_limit?: Map<string, Bucket>;
};

function buckets(): Map<string, Bucket> {
  globalForLimit.__webpresslite_upload_limit ??= new Map();
  return globalForLimit.__webpresslite_upload_limit;
}

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
}

export function consumeUploadSlot(userId: string, now = Date.now()): RateLimitResult {
  const store = buckets();
  const existing = store.get(userId);

  if (!existing || existing.resetAt <= now) {
    store.set(userId, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (existing.count >= MAX_PER_WINDOW) {
    return { allowed: false, retryAfterSeconds: Math.ceil((existing.resetAt - now) / 1000) };
  }

  existing.count += 1;
  return { allowed: true, retryAfterSeconds: 0 };
}

/** Exposed for tests; the store is process local either way. */
export function resetUploadLimits(): void {
  buckets().clear();
}

export const UPLOAD_LIMIT = { windowMs: WINDOW_MS, max: MAX_PER_WINDOW };
