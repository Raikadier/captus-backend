import fetch from 'node-fetch';
import dotenv from 'dotenv';
dotenv.config();

export class TelegramProvider {
    constructor() {
        this.token = process.env.TELEGRAM_BOT_TOKEN;
        this.baseUrl = `https://api.telegram.org/bot${this.token}`;
    }

    async setWebhook(url) {
        if (!this.token) {
            console.warn('Telegram Bot Token missing. Skipping webhook setup.');
            return { success: false, error: 'Missing Token' };
        }

        try {
            const webhookUrl = `${url}/api/telegram/webhook`;
            const response = await fetch(`${this.baseUrl}/setWebhook?url=${webhookUrl}`);
            const data = await response.json();

            if (data.ok) {
                console.log(`Telegram Webhook set to: ${webhookUrl}`);
                return { success: true, data };
            } else {
                console.error('Telegram Webhook Error:', data);
                return { success: false, error: data };
            }
        } catch (error) {
            console.error('Telegram Webhook Exception:', error);
            return { success: false, error: error.message };
        }
    }

    async sendMessage(chatId, text) {
        if (!this.token) return { success: false, error: 'Missing Token' };

        try {
            const response = await fetch(`${this.baseUrl}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chat_id: chatId, text: text })
            });
            const data = await response.json();
            return { success: data.ok, data };
        } catch (error) {
            console.error('Telegram Send Message Error:', error);
            return { success: false, error: error.message };
        }
    }
}

export default new TelegramProvider();
