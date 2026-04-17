import { TelegramService } from '../services/TelegramService.js';

const telegramService = new TelegramService();

export class TelegramController {
    async generateLinkCode(req, res) {
        try {
            const result = await telegramService.generateLinkCode(req.user.id);
            res.json(result);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async handleWebhook(req, res) {
        try {
            await telegramService.processWebhook(req.body);
            res.status(200).send('OK');
        } catch (error) {
            console.error('Webhook error:', error);
            res.status(500).send('Error');
        }
    }

    async unlink(req, res) {
        try {
            await telegramService.unlinkUser(req.user.id);
            res.json({ success: true });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async getStatus(req, res) {
        try {
            const status = await telegramService.getStatus(req.user.id);
            res.json(status);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
}

export default new TelegramController();
