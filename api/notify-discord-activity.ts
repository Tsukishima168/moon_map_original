import type { VercelRequest, VercelResponse } from '@vercel/node';

const DISCORD_API_URL = 'https://discord.com/api/v10';
const CHANNEL_ID = '1474255420825538734'; // 新的活動推播頻道 各平台｜活動通知

export default async function handler(
    request: VercelRequest,
    response: VercelResponse
) {
    if (request.method !== 'POST') {
        return response.status(405).json({ error: 'Method not allowed' });
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

    const { activityType, level, state, timestamp } = request.body || {};

    try {
        const lines: string[] = [];

        lines.push(`🎉 **有新的互動活動！**`);

        if (activityType === 'draw_fortune') {
            lines.push(`\n**動態：有人抽了展籤！**`);
            lines.push(`🔮 抽籤結果：**${level}**`);
            lines.push(`💭 當前狀態：**${state}**`);
        } else {
            lines.push(`\n📌 類型：${activityType}`);
        }

        const timeStr = timestamp || new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' });
        lines.push(`\n⏰ 時間：${timeStr}`);
        lines.push(`\n— 來自月島甜點 🌙`);

        const discordPayload = {
            content: lines.join('\n'),
        };

        let fetchUrl = '';
        const fetchHeaders: Record<string, string> = {
            'Content-Type': 'application/json'
        };

        if (webhookUrl) {
            fetchUrl = webhookUrl;
        } else {
            fetchUrl = `${DISCORD_API_URL}/channels/${CHANNEL_ID}/messages`;
            fetchHeaders['Authorization'] = `Bot ${botToken}`;
        }

        const discordRes = await fetch(fetchUrl, {
            method: 'POST',
            headers: fetchHeaders,
            body: JSON.stringify(discordPayload),
        });

        const responseData = await discordRes.json();

        if (!discordRes.ok) {
            console.error('[DISCORD][ACTIVITY] ❌ Discord API error:', {
                status: discordRes.status,
                response: responseData
            });
            throw new Error(`Discord API error: ${discordRes.statusText}`);
        }

        console.log('[DISCORD][ACTIVITY] ✅ Activity notification sent:', {
            messageId: responseData.id,
            activityType
        });

        return response.status(200).json({
            status: 'sent',
            messageId: responseData.id
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
