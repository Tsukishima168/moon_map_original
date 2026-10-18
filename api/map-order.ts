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

/**
 * 伺服器端依 menu_items／menu_variants 重算後的品項。形狀與 OrderItemPayload 相同，
 * 但 item_name／item_spec 取資料庫正本、unit_price／subtotal 是資料庫價格算出來的。
 */
export type PricedOrderItem = OrderItemPayload

export interface ServerOrderPricing {
  items: PricedOrderItem[]
  total: number
}

export interface PriceMismatch {
  index: number
  item_name: string
  client_unit_price: unknown
  unit_price: number
}

export type OrderPricingResult =
  | { ok: true; pricing: ServerOrderPricing; mismatches: PriceMismatch[] }
  | { ok: false; status: 400 | 500; error: string }

interface MenuItemRow {
  id: string
  name: string | null
  category_id: string | null
  is_available: boolean | null
}

interface MenuVariantRow {
  id: string
  menu_item_id: string
  spec: string | null
  price: number | string | null
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
// R4 v1.1：attribution 欄位（utm_*／mbti_type）一律截到 64 字，絕不因為這些欄位拒單
// （BLOCKER fix：先前版本會因 utm 超長或型別錯誤直接 400，這是錯的——歸因資料壞掉
// 只代表「沒有歸因」，不代表訂單本身無效）。
const MAX_ATTRIBUTION_STRING_LENGTH = 64
const MBTI_TYPE_PATTERN = /^[EI][NS][TF][JP](-[AT])?$/

// 菜單頁對 spec 為空的規格顯示「標準」（lib/menu-shared.ts、api/_utils/menu-source.ts），
// 前端送單時也帶「標準」，比對時兩邊用同一個預設值。
const DEFAULT_SPEC_LABEL = '標準'
// 飲品現做、冷熱當場決定：一律門市供應，不開放線上訂購。判斷式與 shop
// lib/orderable.ts 的 STORE_ONLY_CATEGORY 一致（Penso 2026-10-18）。
const STORE_ONLY_CATEGORY = /drink|飲品|飲料/i
// 資料庫 menu_variants.price 多數是純數字字串（"1990"），但正式資料也有 "$450"、"$1,490"
// （2026-10-18 實查：經典｜提拉米蘇、母親節限定｜北海道十勝戚風千層）。
// 只接受「可選的 $ 或 NT$ 開頭 + 數字（可帶千分位逗號與小數）」；負號、空字串、其他文字
// 一律視為價格設定異常。不做「刪掉所有非數字字元」的寬鬆解析（那會把 "-100" 變成 100）。
const MENU_PRICE_PATTERN = /^(?:NT\$|\$)?\s*((?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?)$/i

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
} as const

function isNonEmptyString(value: unknown, maxLength: number): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= maxLength
}

function isOptionalString(value: unknown, maxLength: number): boolean {
  if (value === null || value === undefined) return true
  return typeof value === 'string' && value.length <= maxLength
}

/**
 * R4: 正規化並驗證 mbti_type（格式 /^[EI][NS][TF][JP](-[AT])?$/，長度 ≤ 64）。
 * 前端的 kw_attr cookie 可能壞掉、格式跑掉、或根本沒有這欄位——一律當作沒有（null），
 * 絕不因為這個欄位讓整張訂單建立失敗。
 */
export function normalizeMbtiType(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim().toUpperCase()
  if (trimmed.length === 0 || trimmed.length > MAX_ATTRIBUTION_STRING_LENGTH) return null
  return MBTI_TYPE_PATTERN.test(trimmed) ? trimmed : null
}

/**
 * R4 v1.1：其餘 attribution 欄位（utm_source/medium/campaign/content/term）的正規化——
 * 只在型別是字串時保留，trim 後截到 64 字；不是字串（number/object/…）就當作沒有。
 * 這裡「絕不」回傳錯誤，因為 attribution 壞掉只代表沒有歸因，不代表訂單無效。
 */
export function sanitizeAttributionString(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed) return null
  return trimmed.slice(0, MAX_ATTRIBUTION_STRING_LENGTH)
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
  // R4 v1.1 BLOCKER fix：utm_*／mbti_type／from_mbti_test 不在這裡驗證、不會讓建單失敗。
  // 這些全是 attribution 欄位，壞掉、超長、型別錯誤都只代表「沒有歸因」，不是訂單無效；
  // 正規化與截斷放在 toCanonicalOrder（sanitizeAttributionString / normalizeMbtiType），
  // from_mbti_test 則永遠由伺服器端依 mbti_type 是否驗證通過重新計算，不讀取這裡的原始值。

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
    if (!isValidQuantity(item.quantity)) {
      return quantityErrorMessage(index)
    }
  }

  return null
}

function isValidQuantity(value: unknown): value is number {
  return isFiniteNumberInRange(value, 1, MAX_QUANTITY) && Number.isInteger(value)
}

function quantityErrorMessage(index: number) {
  return `第 ${index + 1} 項商品的數量需為 1 到 ${MAX_QUANTITY} 的整數，請修改後再送出`
}

const normalizeLookupKey = (value: unknown) =>
  typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : ''

const normalizeSpecLabel = (value: unknown) => normalizeLookupKey(value) || DEFAULT_SPEC_LABEL

/** 嚴格解析 menu_variants.price；無法解析回傳 NaN（由呼叫端拒單）。 */
export function parseMenuPrice(raw: unknown): number {
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : NaN
  if (typeof raw !== 'string') return NaN
  const match = MENU_PRICE_PATTERN.exec(raw.trim())
  if (!match) return NaN
  const value = Number(match[1].replace(/,/g, ''))
  return Number.isFinite(value) ? value : NaN
}

/** 線上可訂購的價格：有限數字且大於 0（與 shop lib/orderable.ts isOrderablePrice 一致）。 */
export function isOrderablePrice(price: number): boolean {
  return Number.isFinite(price) && price > 0
}

export function isStoreOnlyCategory(categoryId: unknown): boolean {
  return typeof categoryId === 'string' && STORE_ONLY_CATEGORY.test(categoryId)
}

/**
 * $0 漏洞修正（2026-10-18）：前端送來的 unit_price／subtotal／total_amount 一律不採信，
 * 依資料庫 menu_items + menu_variants 重算每一項的單價與小計。
 *
 * 品項識別：菜單頁購物車只帶 item_name（= menu_items.name）與 item_spec
 * （= menu_variants.spec，空值顯示為「標準」），沒有 uuid，所以用「品名 + 規格」比對。
 *
 * 前端價格與資料庫不符時「用資料庫價格、不拒單」，只回報 mismatches 給呼叫端記 log：
 * 菜單 API 有 CDN 快取（s-maxage=300 + stale-while-revalidate=600），改價後 15 分鐘內
 * 送出的正常訂單會帶舊價；而前端在 API 失敗時仍會照常導去 LINE，拒單只會讓 orders
 * 少一筆紀錄、擋不住 LINE 訊息。寫進 orders 的金額永遠是資料庫算的，竄改前端價格拿不到好處。
 */
export async function priceOrderItemsFromMenu(
  adminClient: Pick<ReturnType<typeof createAdminClient>, 'from'>,
  items: OrderItemPayload[]
): Promise<OrderPricingResult> {
  // 數量在 validateOrderRequestPayload 已檢查過；這裡再擋一次，讓本函式單獨呼叫時也安全。
  for (let index = 0; index < items.length; index += 1) {
    if (!isValidQuantity(items[index]?.quantity)) {
      return { ok: false, status: 400, error: quantityErrorMessage(index) }
    }
  }

  const [menuItemsResult, menuVariantsResult] = await Promise.all([
    adminClient.from('menu_items').select('id,name,category_id,is_available'),
    adminClient.from('menu_variants').select('id,menu_item_id,spec,price'),
  ])

  if (menuItemsResult.error || menuVariantsResult.error) {
    console.error(
      '[map-order] 無法讀取菜單價格，拒絕建立訂單:',
      menuItemsResult.error ?? menuVariantsResult.error
    )
    return { ok: false, status: 500, error: '目前無法確認商品價格，請稍後再試或直接聯繫門市' }
  }

  const menuItems = (menuItemsResult.data ?? []) as MenuItemRow[]
  const menuVariants = (menuVariantsResult.data ?? []) as MenuVariantRow[]

  const pricedItems: PricedOrderItem[] = []
  const mismatches: PriceMismatch[] = []

  for (let index = 0; index < items.length; index += 1) {
    const item = items[index]
    const displayName = normalizeLookupKey(item.item_name)
    const wantedSpec = normalizeSpecLabel(item.item_spec)

    const namedItems = menuItems.filter((row) => normalizeLookupKey(row.name) === displayName)
    if (namedItems.length === 0) {
      return { ok: false, status: 400, error: `找不到商品「${displayName}」，請重新整理菜單後再試` }
    }

    const candidates = namedItems.flatMap((menuItem) =>
      menuVariants
        .filter(
          (variant) =>
            variant.menu_item_id === menuItem.id && normalizeSpecLabel(variant.spec) === wantedSpec
        )
        .map((variant) => ({ menuItem, variant }))
    )
    if (candidates.length === 0) {
      return {
        ok: false,
        status: 400,
        error: `商品「${displayName}」沒有「${wantedSpec}」規格，請重新整理菜單後再試`,
      }
    }

    // 同名同規格可能有多筆資料（正式庫實例：母親節限定｜北海道十勝戚風千層，同價、分類
    // 分別是 chiffon 與 mille_crepe）。規則：任一筆不可訂購或是飲品就依該防線拒單；
    // 只是分類不同、價格一致時照常接受；價格不一致則不猜、直接拒單。
    // 與菜單頁一致：只有 is_available === true 的品項會顯示，也只有它們可訂購。
    if (candidates.some(({ menuItem }) => menuItem.is_available !== true)) {
      return { ok: false, status: 400, error: `商品「${displayName}」目前不可訂購，請重新整理菜單` }
    }

    // 飲品一律門市供應（現做、冷熱當場決定），即使有價格也不開放線上預訂。
    if (candidates.some(({ menuItem }) => isStoreOnlyCategory(menuItem.category_id))) {
      return { ok: false, status: 400, error: `「${displayName}」為門市現做飲品，請至門市點購，無法線上預訂` }
    }

    const [chosen] = candidates
    const candidatePrices = candidates.map(({ variant }) => parseMenuPrice(variant.price))
    const chosenPrice = candidatePrices[0]
    if (candidatePrices.some((price) => Number.isNaN(price))) {
      console.error(
        '[map-order] menu_variants.price 無法解析:',
        candidates.map(({ variant }) => [variant.id, variant.price])
      )
      return { ok: false, status: 400, error: `商品「${displayName}」價格設定異常，請直接聯繫門市` }
    }
    if (candidatePrices.some((price) => price !== chosenPrice)) {
      console.error('[map-order] 同名同規格有多筆價格不一致的菜單資料:', displayName, wantedSpec)
      return { ok: false, status: 400, error: `商品「${displayName}」價格設定異常，請直接聯繫門市` }
    }

    // 0 元＝門市展示／門市限定，不得以 $0 成立訂單。
    if (!isOrderablePrice(chosenPrice)) {
      return { ok: false, status: 400, error: `商品「${displayName}」（${wantedSpec}）為門市限定，無法線上預訂` }
    }

    const quantity = item.quantity
    pricedItems.push({
      item_name: chosen.menuItem.name ?? displayName,
      item_spec: normalizeSpecLabel(chosen.variant.spec),
      unit_price: chosenPrice,
      quantity,
      subtotal: chosenPrice * quantity,
    })

    if (!Object.is(item.unit_price, chosenPrice)) {
      mismatches.push({
        index,
        item_name: displayName,
        client_unit_price: item.unit_price,
        unit_price: chosenPrice,
      })
    }
  }

  const total = pricedItems.reduce((sum, pricedItem) => sum + pricedItem.subtotal, 0)
  if (total > MAX_TOTAL_AMOUNT) {
    return {
      ok: false,
      status: 400,
      error: `訂單金額超過線上預訂上限 $${MAX_TOTAL_AMOUNT.toLocaleString('en-US')}，請直接聯繫門市`,
    }
  }

  return { ok: true, pricing: { items: pricedItems, total }, mismatches }
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
  pricing: ServerOrderPricing,
  orderId: string
): CanonicalOrderPayload => {
  // 金額只來自伺服器端重算（priceOrderItemsFromMenu），不讀 order.total_amount／item.unit_price。
  const totalAmount = pricing.total
  // R4: from_mbti_test 不直接信任前端傳來的布林值，一律由伺服器端根據
  // mbti_type 是否驗證通過重新計算（Boolean(mbti)），避免不一致。
  const normalizedMbtiType = normalizeMbtiType(order.mbti_type)

  return {
    order_id: orderId,
    customer_name: order.customer_name,
    phone: order.customer_phone,
    email: order.customer_email || null,
    pickup_time: normalizePickupTime(order.pickup_date),
    items: normalizeOrderItems(pricing.items),
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
    utm_source: sanitizeAttributionString(order.utm_source),
    utm_medium: sanitizeAttributionString(order.utm_medium),
    utm_campaign: sanitizeAttributionString(order.utm_campaign),
    utm_content: sanitizeAttributionString(order.utm_content),
    utm_term: sanitizeAttributionString(order.utm_term),
    user_id: order.user_id || null,
    status: order.payment_status || 'pending',
  }
}

const insertOrderWithRetry = async (
  adminClient: ReturnType<typeof createAdminClient>,
  order: OrderPayload,
  pricing: ServerOrderPricing
) => {
  const maxAttempts = 4
  let nextOrderNumber = order.order_number || buildOrderNumber()
  let lastError: { code?: string; message?: string } | null = null

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const canonicalOrder = toCanonicalOrder(order, pricing, nextOrderNumber)
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
    const orderPayload = order as OrderPayload

    const pricingResult = await priceOrderItemsFromMenu(adminClient, items as OrderItemPayload[])
    if (!pricingResult.ok) {
      return res.status(pricingResult.status).json({ error: pricingResult.error })
    }

    const { pricing, mismatches } = pricingResult
    if (mismatches.length > 0 || !Object.is(orderPayload.total_amount, pricing.total)) {
      // 只記金額與訂單編號，不記顧客個資；寫入的一律是資料庫價格。
      console.warn('[map-order] 前端價格與資料庫不符，已改用資料庫價格:', {
        order_number: orderPayload.order_number ?? null,
        client_total: orderPayload.total_amount,
        server_total: pricing.total,
        mismatches,
      })
    }

    const { data: createdOrder, error: orderError } = await insertOrderWithRetry(
      adminClient,
      orderPayload,
      pricing
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
