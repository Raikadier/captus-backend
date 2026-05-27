import { TelegramService } from '../services/TelegramService.js';

const telegramService = new TelegramService();

export class TelegramController {

  async generateLinkCode(req, res) {
    try {
      const data = await telegramService.generateLinkCode(req.user.id);
      res.status(200).json({ success: true, data });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
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
      res.status(200).json({ success: true, message: 'Cuenta de Telegram desvinculada.' });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async getStatus(req, res) {
    try {
      const data = await telegramService.getStatus(req.user.id);
      res.status(200).json({ success: true, data });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}

export default new TelegramController();
