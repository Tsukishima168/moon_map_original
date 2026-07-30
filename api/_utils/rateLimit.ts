import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Sliding-window, in-memory rate limiter.
 *
 * HONESTY NOTE — read before relying on this for anything serious:
 * - State lives in this serverless function instance's process memory only.
 *   Vercel may run many concurrent instances per route, and each cold start
 *   gets a fresh, empty Map. This does NOT share limits across instances.
 * - It only dampens a single-instance burst (e.g. a buggy retry loop, one
 *   script hammering one warm instance). It does NOT stop a distributed
 *   attacker who fans requests across many instances/IPs, and it does NOT
 *   survive redeploys or cold starts.
 * - This is defense-in-depth, not a substitute for a real edge/KV-backed
 *   limiter (e.g. Vercel Edge Config, Upstash Redis) or the Origin/token
 *   trust gate in verifyTrustedRequest.ts. Track the real fix in
 *   docs/security/api-trust-gate-v2.md.
 */

interface WindowEntry {
  count: number;
  windowStart: number;
}

const buckets = new Map<string, WindowEntry>();

// Best-effort cleanup so `buckets` doesn't grow unbounded across a long-lived
// warm instance. Runs opportunistically on each call rather than on a timer.
const MAX_BUCKETS = 5000;

function pruneIfNeeded(now: number, windowMs: number) {
  if (buckets.size <= MAX_BUCKETS) return;
  for (const [key, entry] of buckets.entries()) {
    if (now - entry.windowStart >= windowMs) {
      buckets.delete(key);
    }
  }
}

function getClientIp(req: VercelRequest): string {
  const forwardedFor = req.headers['x-forwarded-for'];
  const raw = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor;
  if (typeof raw === 'string' && raw.trim()) {
    // x-forwarded-for can be a comma-separated list; the first entry is the
    // original client as seen by the outermost proxy (Vercel's edge).
    const first = raw.split(',')[0]?.trim();
    if (first) return first;
  }

  const realIp = req.headers['x-real-ip'];
  if (typeof realIp === 'string' && realIp.trim()) {
    return realIp.trim();
  }

  const socketAddr = (req.socket && (req.socket as { remoteAddress?: string }).remoteAddress) || null;
  if (socketAddr) return socketAddr;

  // No usable identity signal at all — fall back to a shared bucket key so
  // these requests are still rate limited together rather than skipping the
  // limiter entirely.
  return 'unknown';
}

export interface RateLimitOptions {
  /** Logical route key, e.g. 'map-order' or 'rewards-claim'. */
  routeKey: string;
  /** Max requests allowed per window, per client key. */
  limit: number;
  /** Sliding window size in milliseconds. */
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
}

/**
 * Checks + records one hit against the sliding window for this client+route.
 * Does not write to the response — callers decide how to respond.
 */
export function checkRateLimit(req: VercelRequest, options: RateLimitOptions): RateLimitResult {
  const { routeKey, limit, windowMs } = options;
  const now = Date.now();
  pruneIfNeeded(now, windowMs);

  const clientKey = `${routeKey}:${getClientIp(req)}`;
  const existing = buckets.get(clientKey);

  if (!existing || now - existing.windowStart >= windowMs) {
    buckets.set(clientKey, { count: 1, windowStart: now });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (existing.count < limit) {
    existing.count += 1;
    return { allowed: true, retryAfterSeconds: 0 };
  }

  const remainingMs = windowMs - (now - existing.windowStart);
  return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil(remainingMs / 1000)) };
}

/**
 * Convenience helper for API route handlers: checks the limit and, if
 * exceeded, writes a 429 response (with Retry-After) and returns true so the
 * caller can `return` immediately. Returns false when the request is allowed
 * to proceed.
 */
export function enforceRateLimit(
  req: VercelRequest,
  res: VercelResponse,
  options: RateLimitOptions
): boolean {
  const result = checkRateLimit(req, options);
  if (result.allowed) {
    return false;
  }

  res.setHeader('Retry-After', String(result.retryAfterSeconds));
  res.status(429).json({
    error: 'Too many requests',
    retryAfterSeconds: result.retryAfterSeconds,
  });
  return true;
}
