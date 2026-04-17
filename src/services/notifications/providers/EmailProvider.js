import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

export class EmailProvider {
  constructor() {
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });
    this.from = process.env.GMAIL_USER || 'Captus <noreply@captus.app>';
  }

  async sendEmail({ to, subject, html, text }) {
    if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
      console.warn('Gmail credentials missing. Skipping email.');
      return { success: false, error: 'Missing Gmail Credentials' };
    }

    try {
      const info = await this.transporter.sendMail({
        from: `"Captus" <${this.from}>`,
        to: to,
        subject: subject,
        text: text,
        html: html,
      });

      console.log('Message sent: %s', info.messageId);
      return { success: true, data: info };
    } catch (error) {
      console.error('Email sending failed:', error);
      return { success: false, error: error.message };
    }
  }
}

export default new EmailProvider();
