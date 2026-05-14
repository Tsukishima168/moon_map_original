import type { VercelRequest, VercelResponse } from '@vercel/node'
import { randomBytes } from 'crypto'
import { verifyTrustedRequest } from '../_utils/verifyTrustedRequest'
import { createAdminClient } from '../_utils/supabase-admin'

const REWARD_IDS = {
  eggMaster: 'egg_master_2026_q1',
  storeVisit: 'store_visit_2026_q1',
} as const

const ALLOWED_REWARD_IDS = new Set<string>(Object.values(REWARD_IDS))
const STORE_LOCATION = { lat: 23.0473181, lng: 120.1987003 }
const STORE_RADIUS_METERS = 100

const distanceMeters = (lat1: number, lng1: number, lat2: number, lng2: number) => {
  const radius = 6371e3
  const phi1 = lat1 * Math.PI / 180
  const phi2 = lat2 * Math.PI / 180
  const deltaPhi = (lat2 - lat1) * Math.PI / 180
  const deltaLambda = (lng2 - lng1) * Math.PI / 180

  const a = Math.sin(deltaPhi / 2) ** 2 +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) ** 2
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return radius * c
}

const buildClaimCode = (rewardId: string) => {
  const prefix = rewardId === REWARD_IDS.storeVisit ? 'store' : 'egg_master'
  return `${prefix}_${Date.now()}_${randomBytes(16).toString('hex')}`
}

const buildClaimExpiry = () => new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString()

const getBearerToken = (req: VercelRequest) => {
  const authorization = req.headers.authorization
  if (typeof authorization !== 'string') return null

  const match = authorization.match(/^Bearer\s+(.+)$/i)
  return match?.[1] || null
}

const isValidClaimProof = (body: Record<string, unknown>, rewardId: string) => {
  if (rewardId === REWARD_IDS.storeVisit) {
    const latitude = Number(body.latitude)
    const longitude = Number(body.longitude)

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return false
    }

    return distanceMeters(latitude, longitude, STORE_LOCATION.lat, STORE_LOCATION.lng) <= STORE_RADIUS_METERS
  }

  return false
}

const getEggProgressCount = async (adminClient: ReturnType<typeof createAdminClient>, userId: string) => {
  const { count, error } = await adminClient
    .from('reward_claim_progress')
    .select('proof_key', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('reward_id', REWARD_IDS.eggMaster)

  if (error) {
    throw error
  }

  return count ?? 0
}

/**
 * POST /api/rewards/claim
 * 建立兌獎碼記錄（彩蛋集滿 / 到店徽章）
 * Body: { reward_id: string, source?: string, latitude?: number, longitude?: number }
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (!verifyTrustedRequest(req)) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const body = (req.body || {}) as Record<string, unknown>
  const reward_id = typeof body.reward_id === 'string' ? body.reward_id : ''
  const source = typeof body.source === 'string' ? body.source : 'moon_map'

  if (!reward_id) {
    return res.status(400).json({ error: 'Missing required field: reward_id' })
  }

  if (!ALLOWED_REWARD_IDS.has(reward_id)) {
    return res.status(400).json({ error: 'Unsupported reward_id' })
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

    if (reward_id === REWARD_IDS.eggMaster) {
      const completedEggCount = await getEggProgressCount(adminClient, authData.user.id)
      if (completedEggCount < 9) {
        return res.status(400).json({ error: 'Reward claim proof is incomplete' })
      }
    } else if (!isValidClaimProof(body, reward_id)) {
      return res.status(400).json({ error: 'Reward claim proof is invalid' })
    }

    const code = buildClaimCode(reward_id)
    const { error } = await adminClient.from('reward_claims').insert({
      code,
      reward_id,
      source,
      expires_at: buildClaimExpiry(),
    })

    if (error) {
      console.error('[rewards/claim] Supabase error:', error)
      return res.status(500).json({ error: error.message })
    }

    return res.status(200).json({ success: true, code })
  } catch (err) {
    console.error('[rewards/claim] Unexpected error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
