import type { VercelRequest, VercelResponse } from '@vercel/node';

const DISCORD_API_URL = 'https://discord.com/api/v10';
const CHANNEL_ID = '1466020032310939823'; // #results channel (same as MBTI project)

export default async function handler(
    request: VercelRequest,
    response: VercelResponse
) {
    if (request.method !== 'POST') {
        return response.status(405).json({ error: 'Method not allowed' });
    }

    const { remaining, timestamp } = request.body;
    const botToken = process.env.DISCORD_TOKEN;

    if (!botToken) {
        console.error('[DISCORD] ❌ DISCORD_TOKEN not configured');
        return response.status(200).json({
            status: 'error',
            message: 'Bot token not configured'
        });
    }

    console.log('[DISCORD] 💛 Sending Valentine egg notification:', {
        remaining,
        timestamp
    });

    try {
        const discordPayload = {
            content: `💛 **有人找到情人節金色彩蛋！**\n\n🎫 剩餘數量：**${remaining}/50**\n⏰ 時間：${timestamp}\n\n— 來自月島甜點 🌙`,
        };

        const discordRes = await fetch(`${DISCORD_API_URL}/channels/${CHANNEL_ID}/messages`, {
            method: 'POST',
            headers: {
                'Authorization': `Bot ${botToken}`,
                'Content-Type': 'application/json'
            },
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

        console.log('[DISCORD] ✅ Valentine egg notification sent:', {
            messageId: responseData.id,
            remaining
        });

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
