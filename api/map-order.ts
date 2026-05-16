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

interface CanonicalOrderItem {
  id: string
  name: string
  variant_name?: string
  price: number
  quantity: number
}

interface CanonicalOrderPayload {
  order_id: string
  customer_name: string
  phone: string
  email: string | null
  pickup_time: string
  items: CanonicalOrderItem[]
  total_price: number
  original_price: number
  final_price: number
  discount_amount: number
  promo_code: string | null
  payment_date: string | null
  linepay_transaction_id: string | null
  delivery_method: string
  delivery_address: string | null
  delivery_fee: number
  delivery_notes: string | null
  mbti_type: string | null
  from_mbti_test: boolean
  checkout_site: string
  source_from: string
  utm_source: string | null
  utm_medium: string | null
  utm_campaign: string | null
  utm_content: string | null
  utm_term: string | null
  user_id: string | null
  status: string
}

const MAP_SOURCE = 'moon_map'
const MAP_CHECKOUT_SITE = 'map'

const buildOrderNumber = () => {
  const now = new Date()
  const datePart = `${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`
  const timePart = `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`
  const randPart = Math.floor(Math.random() * 10000).toString().padStart(4, '0')

  return `ORD${datePart}${timePart}${randPart}`
}

const isUniqueViolation = (error: { code?: string; message?: string } | null) => {
  if (!error) return false
  return error.code === '23505' || /duplicate key|unique/i.test(error.message || '')
}

const normalizePickupTime = (pickupDate: string) => {
  const value = String(pickupDate || '').trim()
  if (!value) return new Date().toISOString()
  if (value.includes('T')) return value
  return `${value} 13:00`
}

const normalizeOrderSource = (source: string | null | undefined) => {
  const value = String(source || '').trim()
  return value && value !== 'website' ? value : MAP_SOURCE
}

const toItemId = (item: OrderItemPayload, index: number) => {
  const base = `${item.item_name}-${item.item_spec || 'default'}`
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/gi, '-')
    .replace(/^-+|-+$/g, '')

  return base || `map-item-${index + 1}`
}

const normalizeOrderItems = (items: OrderItemPayload[]): CanonicalOrderItem[] => {
  return items.map((item, index) => ({
    id: toItemId(item, index),
    name: item.item_name,
    variant_name: item.item_spec || undefined,
    price: Number(item.unit_price) || 0,
    quantity: Number(item.quantity) || 1,
  }))
}

const toCanonicalOrder = (
  order: OrderPayload,
  items: OrderItemPayload[],
  orderId: string
): CanonicalOrderPayload => {
  const totalAmount = Number(order.total_amount) || 0

  return {
    order_id: orderId,
    customer_name: order.customer_name,
    phone: order.customer_phone,
    email: order.customer_email || null,
    pickup_time: normalizePickupTime(order.pickup_date),
    items: normalizeOrderItems(items),
    total_price: totalAmount,
    original_price: totalAmount,
    final_price: totalAmount,
    discount_amount: 0,
    promo_code: null,
    payment_date: null,
    linepay_transaction_id: null,
    delivery_method: 'pickup',
    delivery_address: null,
    delivery_fee: 0,
    delivery_notes: order.order_note || null,
    mbti_type: null,
    from_mbti_test: false,
    checkout_site: MAP_CHECKOUT_SITE,
    source_from: normalizeOrderSource(order.source),
    utm_source: order.utm_source || null,
    utm_medium: order.utm_medium || null,
    utm_campaign: order.utm_campaign || null,
    utm_content: order.utm_content || null,
    utm_term: order.utm_term || null,
    user_id: order.user_id || null,
    status: order.payment_status || 'pending',
  }
}

const insertOrderWithRetry = async (
  adminClient: ReturnType<typeof createAdminClient>,
  order: OrderPayload,
  items: OrderItemPayload[]
) => {
  const maxAttempts = 4
  let nextOrderNumber = order.order_number || buildOrderNumber()
  let lastError: { code?: string; message?: string } | null = null

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const canonicalOrder = toCanonicalOrder(order, items, nextOrderNumber)
    const { data, error } = await adminClient
      .from('orders')
      .insert(canonicalOrder)
      .select()
      .single()

    if (!error && data) {
      return { data, error: null }
    }

    lastError = error

    if (!isUniqueViolation(error)) {
      break
    }

    nextOrderNumber = buildOrderNumber()
  }

  return { data: null, error: lastError }
}

/**
 * POST /api/map-order
 * 建立訂單（canonical orders）
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

    const { data: createdOrder, error: orderError } = await insertOrderWithRetry(
      adminClient,
      order as OrderPayload,
      items as OrderItemPayload[]
    )

    if (orderError) {
      console.error('[map-order] orders insert error:', orderError)
      return res.status(500).json({ error: orderError.message })
    }

    return res.status(200).json({
      success: true,
      order: {
        ...createdOrder,
        order_number: createdOrder.order_id,
      },
    })
  } catch (err) {
    console.error('[map-order] Unexpected error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
