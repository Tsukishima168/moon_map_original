import type { VercelRequest, VercelResponse } from './_utils/vercel-types.js';
import { authorizeDiscordNotifyRequest } from './_utils/authorizeDiscordNotifyRequest.js';

const DISCORD_API_URL = 'https://discord.com/api/v10';
const CHANNEL_ID = '1474255420825538734'; // 新的活動推播頻道 各平台｜活動通知
const SEND_TIMEOUT_MS = 4000;
const ALLOWED_ACTIVITY_TYPES = new Set(['draw_fortune']);

/**
 * 活動推播（目前只有菜單頁「抽展籤」）。
 * 2026-11-27 強化：請求內容來自瀏覽器、可被偽造，所以
 * - 只接受已知的 activityType，其他直接略過不發；
 * - 欄位換行壓成空白、限長，避免偽造出看起來像系統行的內容；
 * - allowed_mentions.parse = []：內容裡的 @everyone／@here／<@id> 不會真的提及；
 * - 時間一律用伺服器時間，不採用前端送來的 timestamp。
 */
const text = (value: unknown, max: number): string => {
    if (typeof value !== 'string' && typeof value !== 'number') return '';
    return String(value).replace(/[\r\n]+/g, ' ').trim().slice(0, max);
};

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
    const activityType = text(body.activityType, 40);
    if (!ALLOWED_ACTIVITY_TYPES.has(activityType)) {
        return response.status(200).json({ status: 'skipped', reason: 'unknown_activity' });
    }

    const botToken = process.env.DISCORD_TOKEN;
    const webhookUrl = process.env.DISCORD_WEBHOOK_ACTIVITY_URL || process.env.DISCORD_WEBHOOK_URL;

    if (!botToken && !webhookUrl) {
        console.error('[DISCORD][ACTIVITY] ❌ Neither DISCORD_WEBHOOK_ACTIVITY_URL nor DISCORD_TOKEN is configured');
        return response.status(200).json({
            status: 'error',
            message: 'Discord credentials not configured'
        });
    }

    try {
        const lines: string[] = [];
        lines.push(`🎉 **有新的互動活動！**`);
        lines.push(`\n**動態：有人抽了展籤！**`);
        lines.push(`🔮 抽籤結果：**${text(body.level, 40) || '（未知）'}**`);
        lines.push(`💭 當前狀態：**${text(body.state, 60) || '（未知）'}**`);
        lines.push(`\n⏰ 時間：${new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' })}`);
        lines.push(`\n— 來自月島甜點 🌙`);

        const fetchHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
        let fetchUrl: string;
        if (botToken) {
            fetchUrl = `${DISCORD_API_URL}/channels/${CHANNEL_ID}/messages`;
            fetchHeaders['Authorization'] = `Bot ${botToken}`;
        } else {
            fetchUrl = `${webhookUrl}${webhookUrl!.includes('?') ? '&' : '?'}wait=true`;
        }

        const discordRes = await fetch(fetchUrl, {
            method: 'POST',
            headers: fetchHeaders,
            body: JSON.stringify({ content: lines.join('\n'), allowed_mentions: { parse: [] } }),
            signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
        });

        const responseData: unknown = discordRes.status === 204 ? null : await discordRes.json().catch(() => null);

        if (!discordRes.ok) {
            console.error('[DISCORD][ACTIVITY] ❌ Discord API error:', {
                status: discordRes.status,
                response: responseData
            });
            throw new Error(`Discord API error: ${discordRes.status}`);
        }

        const id = responseData && typeof responseData === 'object' && 'id' in responseData
            ? (responseData as { id: unknown }).id
            : null;
        return response.status(200).json({
            status: 'sent',
            messageId: typeof id === 'string' ? id : null
        });
    } catch (error) {
        console.error('[DISCORD][ACTIVITY] ❌ Failed to send activity notification:', error);
        // 回傳 200 以免影響前端流程
        return response.status(200).json({
            status: 'error',
            error: error instanceof Error ? error.message : String(error)
        });
    }
}
