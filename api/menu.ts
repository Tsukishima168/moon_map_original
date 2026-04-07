import type { VercelRequest, VercelResponse } from '@vercel/node'

const SHOP_MENU_API_URL =
  process.env.SHOP_MENU_API_URL || 'https://shop.kiwimu.com/api/menu/categories'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed', data: [] })
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 5000)

  try {
    const upstream = await fetch(SHOP_MENU_API_URL, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
      },
    })

    const payload = await upstream.json().catch(() => null)

    if (!upstream.ok) {
      return res.status(502).json({
        success: false,
        message: `Shared menu upstream failed with HTTP ${upstream.status}`,
        data: [],
        upstream: payload,
      })
    }

    if (!payload?.success || !Array.isArray(payload.data)) {
      return res.status(502).json({
        success: false,
        message: 'Shared menu upstream returned an invalid payload',
        data: [],
      })
    }

    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600')
    return res.status(200).json({
      success: true,
      source: 'shop',
      data: payload.data,
      total: payload.total ?? payload.data.length,
    })
  } catch (error) {
    console.error('[menu] Failed to fetch shared menu source:', error)
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch shared menu source',
      data: [],
    })
  } finally {
    clearTimeout(timeout)
  }
}
