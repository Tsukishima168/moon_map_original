import type { VercelRequest } from '@vercel/node';
import { createHmac, timingSafeEqual } from 'crypto';
import { verifyTrustedRequest } from './verifyTrustedRequest';

const MAX_SIGNATURE_AGE_MS = Number(process.env.DISCORD_NOTIFY_MAX_SIGNATURE_AGE_MS || 5 * 60 * 1000);
const replayGuard = new Map<string, number>();

function getHeaderValue(req: VercelRequest, key: string): string | null {
  const value = req.headers[key.toLowerCase()];
  if (!value) return null;
  if (Array.isArray(value)) return value[0] || null;
  return value;
}

function normalizeHex(value: string): string {
  return value.trim().toLowerCase();
}

function safeEqualHex(a: string, b: string): boolean {
  const left = Buffer.from(normalizeHex(a));
  const right = Buffer.from(normalizeHex(b));
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalJson(item)).join(',')}]`;
  }

  const obj = value as Record<string, unknown>;
  const sortedKeys = Object.keys(obj).sort();
  return `{${sortedKeys
    .map((key) => `${JSON.stringify(key)}:${canonicalJson(obj[key])}`)
    .join(',')}}`;
}

function cleanupReplayGuard(now: number) {
  for (const [key, expiresAt] of replayGuard.entries()) {
    if (expiresAt <= now) {
      replayGuard.delete(key);
    }
  }
}

function verifySignature(req: VercelRequest, secret: string): boolean {
  const signature = getHeaderValue(req, 'x-signature');
  const timestampRaw = getHeaderValue(req, 'x-signature-timestamp') || getHeaderValue(req, 'x-timestamp');

  if (!signature || !timestampRaw) {
    return false;
  }

  const timestampNum = Number(timestampRaw);
  if (!Number.isFinite(timestampNum)) {
    return false;
  }

  const timestampMs = timestampNum > 1e12 ? timestampNum : timestampNum * 1000;
  const now = Date.now();
  if (Math.abs(now - timestampMs) > MAX_SIGNATURE_AGE_MS) {
    return false;
  }

  cleanupReplayGuard(now);
  const replayKey = `${timestampMs}:${normalizeHex(signature)}`;
  if (replayGuard.has(replayKey)) {
    return false;
  }

  const payload = canonicalJson(req.body || {});
  const signedPayload = `${timestampMs}.${payload}`;
  const expectedSignature = createHmac('sha256', secret).update(signedPayload).digest('hex');
  const verified = safeEqualHex(signature, expectedSignature);

  if (!verified) {
    return false;
  }

  replayGuard.set(replayKey, now + MAX_SIGNATURE_AGE_MS);
  return true;
}

export function authorizeDiscordNotifyRequest(req: VercelRequest): boolean {
  const secret = process.env.DISCORD_NOTIFY_SIGNING_SECRET;
  const requireSignature = process.env.DISCORD_NOTIFY_REQUIRE_SIGNATURE === 'true';

  if (secret) {
    const signatureValid = verifySignature(req, secret);
    if (signatureValid) {
      return true;
    }
    if (requireSignature) {
      return false;
    }
  } else if (requireSignature) {
    return false;
  }

  return verifyTrustedRequest(req);
}
