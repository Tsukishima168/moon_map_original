import type { VercelRequest, VercelResponse } from './_utils/vercel-types.js';
import { authorizeDiscordNotifyRequest } from './_utils/authorizeDiscordNotifyRequest.js';
import { createAdminClient } from './_utils/supabase-admin.js';
import { buildDiscordOrderContent, sendDiscordOrderMessage } from './_utils/discord-order-notify.js';

/**
 * 備援用：只在「建單 API 失敗（5xx／網路）、訂單沒進資料庫」時，由菜單頁呼叫。
 *
 * 2026-11-27 起，建單成功的通知改由 /api/map-order 寫入後在伺服器端發送。因此這裡：
 * - 訂單編號已在 orders 裡 → 不再發（伺服器已發過；也擋掉快取舊版前端造成的重複通知）。
 * - 其餘一律標「⚠️ 金額未經系統確認」，就算有人偽造請求，看起來也不會像正常訂單。
 */
export default async function handler(
  request: VercelRequest,
  response: VercelResponse
) {
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method not allowed' });
  }

  if (!authorizeDiscordNotifyRequest(request)) {
    return response.status(401).json({ error: 'Unauthorized' });
  }

  const body: Record<string, unknown> =
    request.body && typeof request.body === 'object' ? request.body : {};
  const orderId = typeof body.orderId === 'string' ? body.orderId.trim().slice(0, 64) : '';

  if (orderId) {
    try {
      const { data, error } = await createAdminClient()
        .from('orders')
        .select('order_id')
        .eq('order_id', orderId)
        .maybeSingle();
      if (error) {
        console.error('[DISCORD][ORDER] orders lookup failed, sending fallback anyway:', error);
      } else if (data) {
        return response.status(200).json({ status: 'skipped', reason: 'order_exists' });
      }
    } catch (error) {
      console.error('[DISCORD][ORDER] orders lookup threw, sending fallback anyway:', error);
    }
  }

  const result = await sendDiscordOrderMessage(
    buildDiscordOrderContent({ ...body, orderId, amountConfirmed: false })
  );

  // 一律回 200，不影響前端跳 LINE 的流程
  return response.status(200).json(result);
}
