import app from './app.js';
import telegramProvider from './services/notifications/providers/TelegramProvider.js';

const PORT = process.env.PORT || 3000;

app.listen(PORT, async () => {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const apiBase = `http://localhost:${PORT}/api`;
  console.log('===================================');
  console.log(`Backend running on http://localhost:${PORT}`);
  console.log(`Health check: ${apiBase}/health`);
  console.log(`Swagger UI:   http://localhost:${PORT}/api-docs`);
  console.log(`API base:     ${apiBase}`);
  console.log(`Frontend:     ${frontendUrl}`);

  const publicUrl = process.env.NGROK_URL || process.env.PUBLIC_URL;
  if (publicUrl) {
    console.log('Configuring Telegram Webhook...');
    await telegramProvider.setWebhook(publicUrl);
  } else {
    console.log('Skipping Telegram Webhook (No NGROK_URL/PUBLIC_URL provided)');
  }
  console.log('===================================');
});
