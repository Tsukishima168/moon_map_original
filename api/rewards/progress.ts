import { randomUUID } from 'node:crypto';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyTrustedRequest } from '../_utils/verifyTrustedRequest.js';

/**
 * Legacy tombstone. Browser-declared egg IDs remain local exploration state and
 * can no longer create or advance a formal reward claim.
 */
export default function handler(req: VercelRequest, res: VercelResponse) {
  const requestId = randomUUID();
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  if (req.method !== 'POST') {
    return res.status(405).json({
      ok: false,
      code: 'NOT_ELIGIBLE',
      request_id: requestId,
      data: { reason: 'method_not_allowed' },
    });
  }

  if (!verifyTrustedRequest(req)) {
    return res.status(403).json({
      ok: false,
      code: 'INVALID_PROOF',
      request_id: requestId,
      data: {},
    });
  }

  return res.status(410).json({
    ok: false,
    code: 'ROLLOUT_DISABLED',
    request_id: requestId,
    data: { reason: 'client_progress_retired' },
  });
}
