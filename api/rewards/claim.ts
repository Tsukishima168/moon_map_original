import type { VercelRequest, VercelResponse } from '@vercel/node'
import { verifyTrustedRequest } from '../_utils/verifyTrustedRequest'
import { createAdminClient } from '../_utils/supabase-admin'

/**
 * POST /api/rewards/claim
 * 建立兌獎碼記錄（彩蛋集滿 / 到店徽章）
 * Body: { code: string, reward_id: string, source?: string }
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (!verifyTrustedRequest(req)) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const { code, reward_id, source } = req.body || {}

  if (!code || !reward_id) {
    return res.status(400).json({ error: 'Missing required fields: code, reward_id' })
  }

  try {
    const adminClient = createAdminClient()
    const { error } = await adminClient.from('reward_claims').insert({
      code,
      reward_id,
      source: source || 'moon_map',
    })

    if (error) {
      console.error('[rewards/claim] Supabase error:', error)
      return res.status(500).json({ error: error.message })
    }

    return res.status(200).json({ success: true })
  } catch (err) {
    console.error('[rewards/claim] Unexpected error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
