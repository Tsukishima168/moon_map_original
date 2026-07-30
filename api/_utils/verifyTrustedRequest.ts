import type { VercelRequest } from '@vercel/node';

// Methods that only read state. Only these may fall back to a Referer-derived
// origin — a Referer header is somewhat less trustworthy than Origin (present
// on plain navigations, strippable by client privacy settings) so we don't
// let it authorize a state-changing request.
const SAFE_METHODS = new Set(['GET', 'HEAD']);

function normalizeOrigin(value: string): string {
  return value.trim().replace(/\/+$/, '').toLowerCase();
}

// Vercel's own system env var: 'production' | 'preview' | 'development'.
// This is set by the platform, not by any request-controlled value, so it's
// safe to branch on for what belongs in the default allow-list.
//
// Fail closed: an environment we cannot positively identify as local dev is
// treated as production. Widening the allow-list must require an explicit
// development signal, never the mere absence of one.
function isProductionEnv(): boolean {
  const vercelEnv = process.env.VERCEL_ENV;
  if (vercelEnv) {
    return vercelEnv !== 'development';
  }

  const nodeEnv = process.env.NODE_ENV;
  return nodeEnv !== 'development' && nodeEnv !== 'test';
}

function extractOriginHeader(req: VercelRequest): string | null {
  const originHeader = req.headers.origin;
  if (typeof originHeader === 'string' && originHeader) {
    return normalizeOrigin(originHeader);
  }
  return null;
}

function extractRefererOrigin(req: VercelRequest): string | null {
  const refererHeader = req.headers.referer;
  if (typeof refererHeader === 'string' && refererHeader) {
    try {
      return normalizeOrigin(new URL(refererHeader).origin);
    } catch {
      return null;
    }
  }
  return null;
}

// Fixed allow-list only. Do NOT derive allowed origins from any request-controlled
// value (e.g. req.headers.host) — a client can set an arbitrary Host header and
// would otherwise be able to whitelist itself.
function getAllowedOrigins(): string[] {
  const configured = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((origin) => normalizeOrigin(origin))
    .filter(Boolean);

  const defaults = [
    'https://kiwimu.com',
    'https://www.kiwimu.com',
    'https://map.kiwimu.com',
    'https://moonmap.kiwimu.com',
  ];

  // localhost is only ever a legitimate caller in non-production environments.
  // Production must not trust it — it's exactly the origin a client-forged
  // request can trivially claim to be.
  if (!isProductionEnv()) {
    defaults.push('http://localhost:3000', 'http://localhost:5173');
  }

  // Vercel preview deployments (*.vercel.app) are only allowed when explicitly
  // configured via env var — no wildcard/pattern matching against the request.
  const previewOrigin = process.env.ALLOWED_PREVIEW_ORIGIN
    ? normalizeOrigin(process.env.ALLOWED_PREVIEW_ORIGIN)
    : null;

  const allowed = [...defaults, ...configured];
  if (previewOrigin) {
    allowed.push(previewOrigin);
  }

  return Array.from(new Set(allowed));
}

export function verifyTrustedRequest(req: VercelRequest): boolean {
  const expectedToken = process.env.INTERNAL_API_TOKEN;
  const providedToken = req.headers['x-internal-token'];

  if (expectedToken && typeof providedToken === 'string' && providedToken === expectedToken) {
    return true;
  }

  const allowedOrigins = getAllowedOrigins();

  const origin = extractOriginHeader(req);
  if (origin) {
    return allowedOrigins.includes(origin);
  }

  // No Origin header: only safe (non-mutating) methods may fall back to
  // Referer. State-changing methods (POST/PUT/PATCH/DELETE) must present a
  // real Origin header or be rejected outright.
  const method = (req.method || '').toUpperCase();
  if (!SAFE_METHODS.has(method)) {
    return false;
  }

  const refererOrigin = extractRefererOrigin(req);
  if (!refererOrigin) {
    return false;
  }

  return allowedOrigins.includes(refererOrigin);
}
