import type { VercelRequest, VercelResponse } from '@vercel/node'
import { verifyTrustedRequest } from './_utils/verifyTrustedRequest'
import { createAdminClient } from './_utils/supabase-admin'

interface OrderPayload {
  order_number: string
  customer_name: string
  customer_phone: string
  customer_email: string | null
  total_amount: number
  pickup_date: string
  order_note: string | null
  user_id: string | null
  payment_status: string
  source: string
  ga_client_id: string | null
  referrer?: string | null
  utm_source?: string | null
  utm_medium?: string | null
  utm_campaign?: string | null
  utm_content?: string | null
  utm_term?: string | null
}

interface OrderItemPayload {
  item_name: string
  item_spec: string
  unit_price: number
  quantity: number
  subtotal: number
}

/**
 * POST /api/map-order
 * 建立訂單（shop_orders + shop_order_items）
 * Body: { order: OrderPayload, items: OrderItemPayload[] }
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (!verifyTrustedRequest(req)) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const { order, items } = req.body || {}

  if (!order || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Missing required fields: order, items' })
  }

  try {
    const adminClient = createAdminClient()

    // 1. 建立訂單
    const { data: createdOrder, error: orderError } = await adminClient
      .from('shop_orders')
      .insert(order as OrderPayload)
      .select()
      .single()

    if (orderError) {
      console.error('[map-order] shop_orders insert error:', orderError)
      return res.status(500).json({ error: orderError.message })
    }

    // 2. 建立訂單項目（order_id 由 API 層注入）
    const orderItems = (items as OrderItemPayload[]).map((item) => ({
      ...item,
      order_id: createdOrder.id,
    }))

    const { error: itemsError } = await adminClient
      .from('shop_order_items')
      .insert(orderItems)

    if (itemsError) {
      console.error('[map-order] shop_order_items insert error:', itemsError)
      return res.status(500).json({ error: itemsError.message })
    }

    return res.status(200).json({ success: true, order: createdOrder })
  } catch (err) {
    console.error('[map-order] Unexpected error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
