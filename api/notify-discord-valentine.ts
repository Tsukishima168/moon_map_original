import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authorizeDiscordNotifyRequest } from './_utils/authorizeDiscordNotifyRequest.js';
import { enforceRateLimit } from './_utils/rateLimit.js';

const DISCORD_API_URL = 'https://discord.com/api/v10';
const CHANNEL_ID = '1466020032310939823'; // #results channel (same as MBTI project)

export default async function handler(
    request: VercelRequest,
    response: VercelResponse
) {
    if (request.method !== 'POST') {
        return response.status(405).json({ error: 'Method not allowed' });
    }

    // 同 /api/notify-discord-order：本路由會把請求內容轉貼進 Discord 頻道，
    // 在沒有 DISCORD_NOTIFY_SIGNING_SECRET 的情況下信任閘只剩 Origin 白名單，
    // 必須靠限流才能壓住單一來源的洗頻。
    if (enforceRateLimit(request, response, { routeKey: 'notify-discord-valentine', limit: 10, windowMs: 60_000 })) {
        return;
    }

    if (!authorizeDiscordNotifyRequest(request)) {
        return response.status(401).json({ error: 'Unauthorized' });
    }

    const { remaining, timestamp } = request.body;
    const botToken = process.env.DISCORD_TOKEN;
    const webhookUrl = process.env.DISCORD_WEBHOOK_VALENTINE_URL || process.env.DISCORD_WEBHOOK_URL;

    if (!botToken && !webhookUrl) {
        console.error('[DISCORD] ❌ Neither DISCORD_WEBHOOK_URL nor DISCORD_TOKEN is configured');
        return response.status(200).json({
            status: 'error',
            message: 'Discord credentials not configured'
        });
    }

    try {
        const discordPayload = {
            content: `💛 **有人找到情人節金色彩蛋！**\n\n🎫 剩餘數量：**${remaining}/50**\n⏰ 時間：${timestamp}\n\n— 來自月島甜點 🌙`,
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

        const responseData = await discordRes.json();

        if (!discordRes.ok) {
            console.error('[DISCORD] ❌ Discord API error:', {
                status: discordRes.status,
                response: responseData
            });
            throw new Error(`Discord API error: ${discordRes.statusText}`);
        }

        return response.status(200).json({
            status: 'sent',
            messageId: responseData.id
        });
    } catch (error) {
        console.error('[DISCORD] ❌ Failed to send notification:', error);
        // Return 200 to avoid blocking user flow
        return response.status(200).json({
            status: 'error',
            error: error instanceof Error ? error.message : String(error)
        });
    }
}
