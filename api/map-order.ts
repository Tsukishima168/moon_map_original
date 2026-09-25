import type { VercelRequest, VercelResponse } from '@vercel/node'
import { verifyTrustedRequest } from './_utils/verifyTrustedRequest.js'
import { createAdminClient } from './_utils/supabase-admin.js'

export interface OrderPayload {
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
  // R4: 第一接觸歸因（來自前端 kw_attr cookie，見 lib/attribution.ts）。
  // 值不可信任，下面一律重新驗證/正規化，壞掉或缺值時當作沒有，不擋建單。
  mbti_type?: string | null
  from_mbti_test?: boolean | null
}

export interface OrderItemPayload {
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

const MAX_TOTAL_AMOUNT = 100000
const MAX_ITEMS_COUNT = 100
const MAX_ITEM_NAME_LENGTH = 200
const MAX_ITEM_SPEC_LENGTH = 200
const MAX_QUANTITY = 1000
// R4: cookie 來的字串欄位做長度上限與格式驗證
const MAX_MBTI_TYPE_LENGTH = 64
const MBTI_TYPE_PATTERN = /^[EI][NS][TF][JP](-[AT])?$/

// Inferred from other Kiwimu sites' usage of the shared `orders.status` column
// (no DB CHECK constraint / enum exists to source this from — see
// shop-kiwimu-com/src/repositories/order.repository.ts and
// order-status-side-effects.service.ts). map only ever sends 'pending' today;
// this whitelist is deliberately generous to avoid blocking future admin flows.
const ALLOWED_PAYMENT_STATUSES = new Set([
  'pending',
  'paid',
  'confirmed',
  'preparing',
  'ready',
  'cancelled',
  'refunded',
])

const STRING_FIELD_MAX_LENGTHS = {
  order_number: 64,
  customer_name: 100,
  customer_phone: 30,
  customer_email: 254,
  pickup_date: 40,
  order_note: 1000,
  user_id: 128,
  payment_status: 30,
  source: 60,
  ga_client_id: 128,
  referrer: 2048,
  utm_source: 200,
  utm_medium: 200,
  utm_campaign: 200,
  utm_content: 200,
  utm_term: 200,
} as const

function isNonEmptyString(value: unknown, maxLength: number): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= maxLength
}

function isOptionalString(value: unknown, maxLength: number): boolean {
  if (value === null || value === undefined) return true
  return typeof value === 'string' && value.length <= maxLength
}

function isOptionalBoolean(value: unknown): boolean {
  return value === null || value === undefined || typeof value === 'boolean'
}

/**
 * R4: 正規化並驗證 mbti_type（格式 /^[EI][NS][TF][JP](-[AT])?$/，長度 ≤ 64）。
 * 前端的 kw_attr cookie 可能壞掉、格式跑掉、或根本沒有這欄位——一律當作沒有（null），
 * 絕不因為這個欄位讓整張訂單建立失敗。
 */
export function normalizeMbtiType(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim().toUpperCase()
  if (trimmed.length === 0 || trimmed.length > MAX_MBTI_TYPE_LENGTH) return null
  return MBTI_TYPE_PATTERN.test(trimmed) ? trimmed : null
}

function isFiniteNumberInRange(value: unknown, min: number, max: number): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max
}

/**
 * Validates the untrusted request body before any DB write or Discord notify.
 * Returns a human-readable error message, or null if the payload is valid.
 */
export function validateOrderRequestPayload(order: unknown, items: unknown): string | null {
  if (!order || typeof order !== 'object') {
    return 'Missing required fields: order, items'
  }
  if (!Array.isArray(items) || items.length === 0) {
    return 'Missing required fields: order, items'
  }

  const o = order as Record<string, unknown>

  if (!isNonEmptyString(o.customer_name, STRING_FIELD_MAX_LENGTHS.customer_name)) {
    return 'Invalid or missing customer_name'
  }
  if (!isNonEmptyString(o.customer_phone, STRING_FIELD_MAX_LENGTHS.customer_phone)) {
    return 'Invalid or missing customer_phone'
  }
  if (!isOptionalString(o.customer_email, STRING_FIELD_MAX_LENGTHS.customer_email)) {
    return 'Invalid customer_email'
  }
  if (!isFiniteNumberInRange(o.total_amount, 0.01, MAX_TOTAL_AMOUNT)) {
    return `Invalid total_amount: must be a finite positive number <= ${MAX_TOTAL_AMOUNT}`
  }
  if (!isNonEmptyString(o.pickup_date, STRING_FIELD_MAX_LENGTHS.pickup_date)) {
    return 'Invalid or missing pickup_date'
  }
  if (!isOptionalString(o.order_note, STRING_FIELD_MAX_LENGTHS.order_note)) {
    return 'Invalid order_note'
  }
  if (!isOptionalString(o.user_id, STRING_FIELD_MAX_LENGTHS.user_id)) {
    return 'Invalid user_id'
  }
  if (typeof o.payment_status !== 'string' || !ALLOWED_PAYMENT_STATUSES.has(o.payment_status)) {
    return `Invalid payment_status: must be one of ${Array.from(ALLOWED_PAYMENT_STATUSES).join(', ')}`
  }
  if (!isOptionalString(o.source, STRING_FIELD_MAX_LENGTHS.source)) {
    return 'Invalid source'
  }
  if (!isOptionalString(o.ga_client_id, STRING_FIELD_MAX_LENGTHS.ga_client_id)) {
    return 'Invalid ga_client_id'
  }
  if (!isOptionalString(o.referrer, STRING_FIELD_MAX_LENGTHS.referrer)) {
    return 'Invalid referrer'
  }
  if (o.order_number !== undefined && !isOptionalString(o.order_number, STRING_FIELD_MAX_LENGTHS.order_number)) {
    return 'Invalid order_number'
  }
  for (const key of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'] as const) {
    if (!isOptionalString(o[key], STRING_FIELD_MAX_LENGTHS[key])) {
      return `Invalid ${key}`
    }
  }
  // mbti_type 格式驗證留給 normalizeMbtiType 在寫入前處理（壞值一律當作沒有，不擋建單）；
  // 這裡只擋明顯錯誤的型別/長度，避免一個壞掉的 cookie 讓整張訂單失敗。
  if (!isOptionalString(o.mbti_type, MAX_MBTI_TYPE_LENGTH)) {
    return 'Invalid mbti_type'
  }
  if (!isOptionalBoolean(o.from_mbti_test)) {
    return 'Invalid from_mbti_test'
  }

  if (items.length > MAX_ITEMS_COUNT) {
    return `Too many items: max ${MAX_ITEMS_COUNT}`
  }

  for (let index = 0; index < items.length; index += 1) {
    const rawItem = items[index]
    if (!rawItem || typeof rawItem !== 'object') {
      return `Invalid item at index ${index}`
    }
    const item = rawItem as Record<string, unknown>

    if (!isNonEmptyString(item.item_name, MAX_ITEM_NAME_LENGTH)) {
      return `Invalid item_name at index ${index}`
    }
    if (!isOptionalString(item.item_spec, MAX_ITEM_SPEC_LENGTH)) {
      return `Invalid item_spec at index ${index}`
    }
    if (!isFiniteNumberInRange(item.unit_price, 0, MAX_TOTAL_AMOUNT)) {
      return `Invalid unit_price at index ${index}`
    }
    if (!isFiniteNumberInRange(item.quantity, 1, MAX_QUANTITY) || !Number.isInteger(item.quantity)) {
      return `Invalid quantity at index ${index}`
    }
  }

  return null
}

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

export const toCanonicalOrder = (
  order: OrderPayload,
  items: OrderItemPayload[],
  orderId: string
): CanonicalOrderPayload => {
  const totalAmount = Number(order.total_amount) || 0
  // R4: from_mbti_test 不直接信任前端傳來的布林值，一律由伺服器端根據
  // mbti_type 是否驗證通過重新計算（Boolean(mbti)），避免不一致。
  const normalizedMbtiType = normalizeMbtiType(order.mbti_type)

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
    mbti_type: normalizedMbtiType,
    from_mbti_test: Boolean(normalizedMbtiType),
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

  const validationError = validateOrderRequestPayload(order, items)
  if (validationError) {
    return res.status(400).json({ error: validationError })
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
