import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authorizeDiscordNotifyRequest } from './_utils/authorizeDiscordNotifyRequest.js';

const DISCORD_API_URL = 'https://discord.com/api/v10';
const CHANNEL_ID = '1467024414699819152'; // 月島訂單通知頻道

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

  const botToken = process.env.DISCORD_TOKEN;
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;

  if (!botToken && !webhookUrl) {
    console.error('[DISCORD][ORDER] ❌ Neither DISCORD_WEBHOOK_URL nor DISCORD_TOKEN is configured');
    return response.status(200).json({
      status: 'error',
      message: 'Discord credentials not configured'
    });
  }

  const {
    orderId,
    totalAmount,
    pickupDate,
    customerName,
    customerPhone,
    orderNote,
    items,
    source = 'moon_map_original',
    // 菜單頁在建單 API 失敗（5xx／網路）時仍照常轉 LINE，此時金額是前端預估、未經伺服器
    // 依資料庫價格確認，會送 amountConfirmed: false。未帶此欄位的舊呼叫端維持原樣。
    amountConfirmed,
  } = request.body || {};

  try {
    const lines: string[] = [];

    lines.push(`📦 **有新的月島訂單來自 ${source}！**`);
    if (orderId) lines.push(`\n🧾 訂單編號：\`${orderId}\``);
    if (customerName || customerPhone) {
      lines.push(`👤 訂購人：${customerName || '（未填）'} ${customerPhone ? `(${customerPhone})` : ''}`);
    }
    const amountUnconfirmed = amountConfirmed === false;
    if (amountUnconfirmed) {
      lines.push(`⚠️ 金額未經系統確認（建單 API 失敗或回應異常）：請到後台確認是否已建單，並人工核對品項與金額`);
    }
    if (typeof totalAmount === 'number') {
      lines.push(
        amountUnconfirmed
          ? `💰 預估金額：$${totalAmount}（待門市確認）`
          : `💰 總金額：$${totalAmount}`
      );
    }
    if (pickupDate) {
      lines.push(`🗓 取貨日期：${pickupDate}`);
    }

    if (Array.isArray(items) && items.length > 0) {
      lines.push(`\n🧁 訂購內容：`);
      for (const item of items) {
        lines.push(
          `• ${item.name ?? '未知品項'} | ${item.spec ?? ''} x ${item.count ?? 1}` +
            (typeof item.price === 'number' && Number.isFinite(item.price)
              ? `（單價 $${item.price}）`
              : '')
        );
      }
    }

    if (orderNote) {
      lines.push(`\n📝 備註：${orderNote}`);
    }

    lines.push(`\n⏰ 建立時間：${new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' })}`);

    const discordPayload = {
      content: lines.join('\n'),
    };

    let fetchUrl = '';
    const fetchHeaders: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    if (botToken) {
      // Prioritize Bot Token as requested
      fetchUrl = `${DISCORD_API_URL}/channels/${CHANNEL_ID}/messages`;
      fetchHeaders['Authorization'] = `Bot ${botToken}`;
    } else if (webhookUrl) {
      fetchUrl = webhookUrl;
    }

    const discordRes = await fetch(fetchUrl, {
      method: 'POST',
      headers: fetchHeaders,
      body: JSON.stringify(discordPayload),
    });

    const responseData = discordRes.status === 204
      ? null
      : await discordRes.json().catch(() => null);

    if (!discordRes.ok) {
      console.error('[DISCORD][ORDER] ❌ Discord API error:', {
        status: discordRes.status,
        response: responseData
      });
      throw new Error(`Discord API error: ${discordRes.statusText}`);
    }

    return response.status(200).json({
      status: 'sent',
      messageId: responseData?.id ?? null
    });
  } catch (error) {
    console.error('[DISCORD][ORDER] ❌ Failed to send order notification:', error);
    // 回傳 200 以免影響前端流程
    return response.status(200).json({
      status: 'error',
      error: error instanceof Error ? error.message : String(error)
    });
  }
}
