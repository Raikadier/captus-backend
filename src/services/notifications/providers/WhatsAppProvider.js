import dotenv from 'dotenv';
dotenv.config();

export class WhatsAppProvider {
  constructor() {
    this.token = process.env.WA_TOKEN;
    this.phoneId = process.env.WA_PHONE_ID;
    this.version = 'v17.0';
  }

  async sendWhatsApp({ to, message }) {
    if (!this.token || !this.phoneId) {
      console.warn('WhatsApp credentials missing. Skipping message.');
      return { success: false, error: 'Missing Credentials' };
    }

    try {
      const url = `https://graph.facebook.com/${this.version}/${this.phoneId}/messages`;

      const body = {
        messaging_product: 'whatsapp',
        to: to,
        type: 'text',
        text: { body: message }
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`
        },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('WhatsApp API Error:', errorData);
        return { success: false, error: errorData };
      }

      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      console.error('WhatsApp sending failed:', error);
      return { success: false, error: error.message };
    }
  }
}

export default new WhatsAppProvider();
