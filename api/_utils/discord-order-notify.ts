/**
 * 月島訂單 Discord 通知（伺服器端共用）。
 *
 * 2026-11-27 起：建單成功的通知由 /api/map-order 在寫入 orders 之後直接發，不再靠
 * 顧客瀏覽器另外打 /api/notify-discord-order（手機跳 LINE 會把請求砍掉、也能被偽造）。
 * /api/notify-discord-order 只剩「建單 API 失敗、訂單不在資料庫」這條備援。
 *
 * 安全與穩定：
 * - allowed_mentions.parse = []：顧客在姓名／備註打 @everyone、@here、<@id> 都不會真的提及。
 * - 內容上限 2000 字（Discord 限制）：備註先截短，整則再保底截斷，不會整則被拒收。
 * - 逾時 4 秒；bot 回 4xx（token／頻道設定壞了）且有 webhook 時才改走 webhook。
 *   逾時或 5xx 不補發：Discord 可能其實已收下，補發會變兩則，也會讓建單回應多等。
 * 底線開頭的檔案不會被 vercel-build 當成 API entry。
 */

const DISCORD_API_URL = 'https://discord.com/api/v10'
export const DISCORD_ORDER_CHANNEL_ID = '1467024414699819152' // 月島訂單通知頻道
const DISCORD_CONTENT_LIMIT = 2000
const NOTE_LIMIT = 300
const SEND_TIMEOUT_MS = 4000

class DiscordHttpError extends Error {
  constructor(readonly status: number) {
    super(`Discord ${status}`)
  }
}
const TRUNCATED_SUFFIX = '\n…（訊息過長已截斷，完整內容請看後台）'

export interface DiscordOrderItem {
  name?: unknown
  spec?: unknown
  count?: unknown
  price?: unknown
}

export interface DiscordOrderInput {
  orderId?: unknown
  totalAmount?: unknown
  amountConfirmed?: unknown
  pickupDate?: unknown
  customerName?: unknown
  customerPhone?: unknown
  orderNote?: unknown
  items?: unknown
  source?: unknown
}

export type DiscordSendResult =
  | { status: 'sent'; messageId: string | null }
  | { status: 'not_configured' }
  | { status: 'error'; error: string }

const text = (value: unknown, max = 100): string => {
  if (typeof value !== 'string' && typeof value !== 'number') return ''
  // 換行壓成空白，避免單一欄位偽造出看起來像系統行的內容
  return String(value).replace(/[\r\n]+/g, ' ').trim().slice(0, max)
}

const finiteNumber = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null

export function buildDiscordOrderContent(input: DiscordOrderInput, now: Date = new Date()): string {
  const lines: string[] = []
  const source = text(input.source, 60) || 'moon_map_menu'
  const orderId = text(input.orderId, 64)
  const customerName = text(input.customerName)
  const customerPhone = text(input.customerPhone, 30)
  const totalAmount = finiteNumber(input.totalAmount)
  const unconfirmed = input.amountConfirmed === false

  lines.push(`📦 **有新的月島訂單來自 ${source}！**`)
  if (orderId) lines.push(`\n🧾 訂單編號：\`${orderId.replace(/`/g, '')}\``)
  if (customerName || customerPhone) {
    lines.push(`👤 訂購人：${customerName || '（未填）'}${customerPhone ? ` (${customerPhone})` : ''}`)
  }
  if (unconfirmed) {
    lines.push('⚠️ 金額未經系統確認（建單 API 失敗或回應異常）：請到後台確認是否已建單，並人工核對品項與金額')
  }
  if (totalAmount !== null) {
    lines.push(unconfirmed ? `💰 預估金額：$${totalAmount}（待門市確認）` : `💰 總金額：$${totalAmount}`)
  }
  lines.push('💳 付款：待付款（顧客會在 LINE 回傳轉帳後五碼）')
  const pickupDate = text(input.pickupDate, 40)
  if (pickupDate) lines.push(`🗓 取貨日期：${pickupDate}`)

  if (Array.isArray(input.items) && input.items.length > 0) {
    lines.push('\n🧁 訂購內容：')
    for (const raw of input.items.slice(0, 50) as DiscordOrderItem[]) {
      const price = finiteNumber(raw?.price)
      const count = finiteNumber(raw?.count) ?? 1
      lines.push(
        `• ${text(raw?.name) || '未知品項'} | ${text(raw?.spec)} x ${count}` +
          (price !== null ? `（單價 $${price}）` : '')
      )
    }
  }

  const note = typeof input.orderNote === 'string' ? input.orderNote.trim() : ''
  if (note) {
    const shortNote = note.length > NOTE_LIMIT ? `${note.slice(0, NOTE_LIMIT)}…（備註過長，完整內容請看後台）` : note
    lines.push(`\n📝 備註：${shortNote}`)
  }

  lines.push(`\n⏰ 建立時間：${now.toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' })}`)

  const content = lines.join('\n')
  if (content.length <= DISCORD_CONTENT_LIMIT) return content
  return content.slice(0, DISCORD_CONTENT_LIMIT - TRUNCATED_SUFFIX.length) + TRUNCATED_SUFFIX
}

async function postOnce(url: string, headers: Record<string, string>, content: string) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify({ content, allowed_mentions: { parse: [] } }),
    signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
  })
  const data: unknown = res.status === 204 ? null : await res.json().catch(() => null)
  if (!res.ok) throw new DiscordHttpError(res.status)
  const id = data && typeof data === 'object' && 'id' in data ? (data as { id: unknown }).id : null
  return typeof id === 'string' ? id : null
}

/** 發送訂單通知。永遠不 throw：失敗只記 log，不能擋住訂單。 */
export async function sendDiscordOrderMessage(content: string): Promise<DiscordSendResult> {
  const botToken = process.env.DISCORD_TOKEN
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL

  if (!botToken && !webhookUrl) {
    console.error('[DISCORD][ORDER] ❌ Neither DISCORD_TOKEN nor DISCORD_WEBHOOK_URL is configured')
    return { status: 'not_configured' }
  }

  if (botToken) {
    try {
      const messageId = await postOnce(
        `${DISCORD_API_URL}/channels/${DISCORD_ORDER_CHANNEL_ID}/messages`,
        { Authorization: `Bot ${botToken}` },
        content
      )
      return { status: 'sent', messageId }
    } catch (error) {
      console.error('[DISCORD][ORDER] ❌ Bot send failed:', error)
      const configProblem = error instanceof DiscordHttpError && error.status >= 400 && error.status < 500 && error.status !== 429
      if (!webhookUrl || !configProblem) return { status: 'error', error: error instanceof Error ? error.message : String(error) }
    }
  }

  try {
    const messageId = await postOnce(`${webhookUrl}${webhookUrl!.includes('?') ? '&' : '?'}wait=true`, {}, content)
    return { status: 'sent', messageId }
  } catch (error) {
    console.error('[DISCORD][ORDER] ❌ Webhook send failed:', error)
    return { status: 'error', error: error instanceof Error ? error.message : String(error) }
  }
}
