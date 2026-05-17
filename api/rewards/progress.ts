import type { VercelRequest, VercelResponse } from '@vercel/node'
import { verifyTrustedRequest } from '../_utils/verifyTrustedRequest.js'
import { createAdminClient } from '../_utils/supabase-admin.js'

const EGG_MASTER_REWARD_ID = 'egg_master_2026_q1'
const VALID_EGG_IDS = new Set(Array.from({ length: 9 }, (_, index) => index + 1))

const getBearerToken = (req: VercelRequest) => {
  const authorization = req.headers.authorization
  if (typeof authorization !== 'string') return null

  const match = authorization.match(/^Bearer\s+(.+)$/i)
  return match?.[1] || null
}

const normalizeEggIds = (value: unknown) => {
  const ids = Array.isArray(value) ? value : [value]
  return Array.from(new Set(ids
    .map((id) => Number(id))
    .filter((id) => Number.isInteger(id) && VALID_EGG_IDS.has(id))))
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (!verifyTrustedRequest(req)) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const body = (req.body || {}) as Record<string, unknown>
  const rewardId = typeof body.reward_id === 'string' ? body.reward_id : ''
  const source = typeof body.source === 'string' ? body.source : 'moon_map'
  const eggIds = normalizeEggIds(body.egg_ids ?? body.egg_id)

  if (rewardId !== EGG_MASTER_REWARD_ID) {
    return res.status(400).json({ error: 'Unsupported reward_id' })
  }

  if (eggIds.length === 0) {
    return res.status(400).json({ error: 'Missing valid egg_ids' })
  }

  try {
    const adminClient = createAdminClient()
    const token = getBearerToken(req)
    if (!token) {
      return res.status(401).json({ error: 'Missing Supabase session' })
    }

    const { data: authData, error: authError } = await adminClient.auth.getUser(token)
    if (authError || !authData.user) {
      return res.status(401).json({ error: 'Invalid Supabase session' })
    }

    const rows = eggIds.map((eggId) => ({
      user_id: authData.user.id,
      reward_id: rewardId,
      proof_key: `egg_${eggId}`,
      source,
    }))

    const { error: upsertError } = await adminClient
      .from('reward_claim_progress')
      .upsert(rows, { onConflict: 'user_id,reward_id,proof_key' })

    if (upsertError) {
      console.error('[rewards/progress] Supabase upsert error:', upsertError)
      return res.status(500).json({ error: upsertError.message })
    }

    const { count, error: countError } = await adminClient
      .from('reward_claim_progress')
      .select('proof_key', { count: 'exact', head: true })
      .eq('user_id', authData.user.id)
      .eq('reward_id', rewardId)

    if (countError) {
      console.error('[rewards/progress] Supabase count error:', countError)
      return res.status(500).json({ error: countError.message })
    }

    return res.status(200).json({ success: true, count: count ?? 0 })
  } catch (err) {
    console.error('[rewards/progress] Unexpected error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
