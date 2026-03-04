import type { VercelRequest } from '@vercel/node';

function normalizeOrigin(value: string): string {
  return value.trim().replace(/\/+$/, '').toLowerCase();
}

function extractOrigin(req: VercelRequest): string | null {
  const originHeader = req.headers.origin;
  if (typeof originHeader === 'string' && originHeader) {
    return normalizeOrigin(originHeader);
  }

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

function getAllowedOrigins(req: VercelRequest): string[] {
  const configured = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((origin) => normalizeOrigin(origin))
    .filter(Boolean);

  const defaults = [
    'https://kiwimu.com',
    'https://www.kiwimu.com',
    'https://moonmap.kiwimu.com',
    'http://localhost:3000',
    'http://localhost:5173',
  ];

  const host = req.headers.host;
  if (host) {
    const protocol = host.includes('localhost') ? 'http' : 'https';
    defaults.push(`${protocol}://${host}`);
  }

  return Array.from(new Set([...defaults, ...configured]));
}

export function verifyTrustedRequest(req: VercelRequest): boolean {
  const expectedToken = process.env.INTERNAL_API_TOKEN;
  const providedToken = req.headers['x-internal-token'];

  if (expectedToken && typeof providedToken === 'string' && providedToken === expectedToken) {
    return true;
  }

  const origin = extractOrigin(req);
  if (!origin) {
    return false;
  }

  const allowedOrigins = getAllowedOrigins(req);
  return allowedOrigins.includes(origin);
}
