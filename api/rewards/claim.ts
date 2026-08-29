import { randomUUID } from 'node:crypto';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyTrustedRequest } from '../_utils/verifyTrustedRequest.js';

/**
 * Legacy tombstone. GPS and client-declared egg progress are never accepted as
 * formal Economy assets. Store visits now use issue_store_visit_proof followed
 * by claim_store_visit_proof; both are server-authoritative RPCs.
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
    data: { reason: 'legacy_reward_claim_retired' },
  });
}
