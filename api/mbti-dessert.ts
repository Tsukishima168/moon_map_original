import type { VercelRequest, VercelResponse } from '@vercel/node'
import {
  fetchCanonicalMbtiRecommendation,
  getCanonicalMbtiType,
} from './_utils/menu-source'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed', data: null })
  }

  const mbtiType = getCanonicalMbtiType(
    Array.isArray(req.query.mbti) ? req.query.mbti[0] : req.query.mbti
  )

  if (!mbtiType) {
    return res.status(400).json({
      success: false,
      message: 'Missing required query param: mbti',
      data: null,
    })
  }

  try {
    const recommendation = await fetchCanonicalMbtiRecommendation(mbtiType)

    if (!recommendation) {
      return res.status(404).json({
        success: false,
        message: `No MBTI dessert mapping found for ${mbtiType}`,
        data: null,
      })
    }

    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600')
    return res.status(200).json({
      success: true,
      source: 'supabase_canonical',
      data: recommendation,
    })
  } catch (error) {
    console.error('[mbti-dessert] Failed to fetch canonical MBTI recommendation:', error)
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch canonical MBTI recommendation',
      data: null,
    })
  }
}
