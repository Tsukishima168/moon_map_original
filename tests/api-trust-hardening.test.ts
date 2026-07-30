import assert from 'node:assert/strict';
import test from 'node:test';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyTrustedRequest } from '../api/_utils/verifyTrustedRequest.ts';
import { checkRateLimit, enforceRateLimit } from '../api/_utils/rateLimit.ts';

/**
 * Living-proof test for the map-kiwimu-com API trust hardening.
 * Run with: npx tsx --test tests/api-trust-hardening.test.ts
 * (or: node --test --experimental-strip-types tests/api-trust-hardening.test.ts)
 */

function makeReq(opts: {
  method?: string;
  origin?: string;
  referer?: string;
  ip?: string;
}): VercelRequest {
  const headers: Record<string, string> = {};
  if (opts.origin !== undefined) headers.origin = opts.origin;
  if (opts.referer !== undefined) headers.referer = opts.referer;
  if (opts.ip !== undefined) headers['x-forwarded-for'] = opts.ip;

  return {
    method: opts.method || 'POST',
    headers,
    socket: {},
  } as unknown as VercelRequest;
}

function withEnv<T>(vars: Record<string, string | undefined>, fn: () => T): T {
  const prev: Record<string, string | undefined> = {};
  for (const key of Object.keys(vars)) {
    prev[key] = process.env[key];
    if (vars[key] === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = vars[key];
    }
  }
  try {
    return fn();
  } finally {
    for (const key of Object.keys(prev)) {
      if (prev[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = prev[key];
      }
    }
  }
}

test('production: Origin http://localhost:5173 is rejected', () => {
  withEnv({ VERCEL_ENV: 'production', NODE_ENV: 'production', INTERNAL_API_TOKEN: undefined, ALLOWED_ORIGINS: undefined }, () => {
    const req = makeReq({ method: 'POST', origin: 'http://localhost:5173' });
    assert.equal(verifyTrustedRequest(req), false, 'localhost origin must NOT be trusted in production');
  });
});

test('production: unknown origin is rejected', () => {
  withEnv({ VERCEL_ENV: 'production', NODE_ENV: 'production', INTERNAL_API_TOKEN: undefined, ALLOWED_ORIGINS: undefined }, () => {
    const req = makeReq({ method: 'POST', origin: 'https://evil-attacker.example.com' });
    assert.equal(verifyTrustedRequest(req), false, 'unknown origin must be rejected');
  });
});

test('production: https://map.kiwimu.com passes', () => {
  withEnv({ VERCEL_ENV: 'production', NODE_ENV: 'production', INTERNAL_API_TOKEN: undefined, ALLOWED_ORIGINS: undefined }, () => {
    const req = makeReq({ method: 'POST', origin: 'https://map.kiwimu.com' });
    assert.equal(verifyTrustedRequest(req), true, 'the real production origin must still pass');
  });
});

test('POST with only Referer (no Origin) is rejected even for an allowed host', () => {
  withEnv({ VERCEL_ENV: 'production', NODE_ENV: 'production', INTERNAL_API_TOKEN: undefined, ALLOWED_ORIGINS: undefined }, () => {
    const req = makeReq({ method: 'POST', referer: 'https://map.kiwimu.com/order' });
    assert.equal(verifyTrustedRequest(req), false, 'state-changing POST must not be authorized via Referer fallback');
  });
});

test('GET with only Referer (no Origin) is still allowed to fall back (safe method)', () => {
  withEnv({ VERCEL_ENV: 'production', NODE_ENV: 'production', INTERNAL_API_TOKEN: undefined, ALLOWED_ORIGINS: undefined }, () => {
    const req = makeReq({ method: 'GET', referer: 'https://map.kiwimu.com/order' });
    assert.equal(verifyTrustedRequest(req), true, 'safe GET/HEAD may still use Referer fallback');
  });
});

test('non-production: localhost origin is still trusted (dev workflow preserved)', () => {
  withEnv({ VERCEL_ENV: 'development', NODE_ENV: 'development', INTERNAL_API_TOKEN: undefined, ALLOWED_ORIGINS: undefined }, () => {
    const req = makeReq({ method: 'POST', origin: 'http://localhost:5173' });
    assert.equal(verifyTrustedRequest(req), true, 'localhost must remain usable for local dev');
  });
});

test('rate limit: exceeding the window returns 429 with Retry-After', () => {
  const routeKey = `test-route-${Date.now()}`;
  const limit = 3;
  const windowMs = 60_000;

  for (let i = 0; i < limit; i += 1) {
    const req = makeReq({ method: 'POST', ip: '203.0.113.9' });
    const result = checkRateLimit(req, { routeKey, limit, windowMs });
    assert.equal(result.allowed, true, `request ${i + 1} within limit should be allowed`);
  }

  const overLimitReq = makeReq({ method: 'POST', ip: '203.0.113.9' });
  const overLimitResult = checkRateLimit(overLimitReq, { routeKey, limit, windowMs });
  assert.equal(overLimitResult.allowed, false, 'request beyond the limit must be rejected');
  assert.ok(overLimitResult.retryAfterSeconds > 0, 'retryAfterSeconds must be positive');

  // Also exercise the res.status(429) + Retry-After header path used by route handlers.
  let statusCode: number | null = null;
  let headerValue: string | null = null;
  let jsonBody: unknown = null;
  const fakeRes = {
    setHeader(name: string, value: string) {
      if (name === 'Retry-After') headerValue = value;
    },
    status(code: number) {
      statusCode = code;
      return this;
    },
    json(body: unknown) {
      jsonBody = body;
      return this;
    },
  } as unknown as VercelResponse;

  const blockedReq = makeReq({ method: 'POST', ip: '203.0.113.9' });
  const handled = enforceRateLimit(blockedReq, fakeRes, { routeKey, limit, windowMs });
  assert.equal(handled, true, 'enforceRateLimit must report that it already responded');
  assert.equal(statusCode, 429);
  assert.ok(headerValue && Number(headerValue) > 0, 'Retry-After header must be set');
  assert.ok(jsonBody, 'a JSON error body must be written');
});

test('rate limit: a different IP on the same route is not affected by another IP exceeding its limit', () => {
  const routeKey = `test-route-isolation-${Date.now()}`;
  const limit = 1;
  const windowMs = 60_000;

  const reqA1 = makeReq({ method: 'POST', ip: '198.51.100.1' });
  assert.equal(checkRateLimit(reqA1, { routeKey, limit, windowMs }).allowed, true);
  const reqA2 = makeReq({ method: 'POST', ip: '198.51.100.1' });
  assert.equal(checkRateLimit(reqA2, { routeKey, limit, windowMs }).allowed, false, 'second request from IP A must be blocked');

  const reqB1 = makeReq({ method: 'POST', ip: '198.51.100.2' });
  assert.equal(checkRateLimit(reqB1, { routeKey, limit, windowMs }).allowed, true, 'IP B must have its own independent bucket');
});
