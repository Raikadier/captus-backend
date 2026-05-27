/**
 * src/services/notifications/TaskEmailService.js
 *
 * Handles outbound email notifications for task lifecycle events
 * (created, updated, completed). Extracted from TaskService to keep
 * transport concerns separate from business logic.
 */
import nodemailer from 'nodemailer';

/**
 * Send an email notification for a task action.
 *
 * @param {object}          task        - Hydrated task (with .Category, .Priority optionally)
 * @param {'created'|'updated'|'completed'} action
 * @param {object|string|null} userContext - req.user or email string or null
 */
export async function sendTaskNotification(task, action, userContext = null) {
  try {
    if (process.env.DISABLE_EMAIL_NOTIFICATIONS === 'true') {
      console.warn('Email notifications are disabled by DISABLE_EMAIL_NOTIFICATIONS');
      return;
    }
    if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
      console.warn('Gmail credentials not configured for task notifications');
      return;
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });

    const actionText = {
      created:   'creada',
      completed: 'completada',
      updated:   'actualizada',
    }[action] || 'modificada';

    const subject = `Tarea ${actionText}: ${task.title}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #16a34a;">Tarea ${actionText}</h2>
        <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin: 0 0 10px 0; color: #1f2937;">${task.title}</h3>
          ${task.description ? `<p style="margin: 5px 0; color: #4b5563;"><strong>Descripción:</strong> ${task.description}</p>` : ''}
          ${task.endDate ? `<p style="margin: 5px 0; color: #4b5563;"><strong>Fecha límite:</strong> ${new Date(task.endDate).toLocaleDateString('es-ES')}</p>` : ''}
          ${task.Category ? `<p style="margin: 5px 0; color: #4b5563;"><strong>Categoría:</strong> ${task.Category.name}</p>` : ''}
          ${task.Priority ? `<p style="margin: 5px 0; color: #4b5563;"><strong>Prioridad:</strong> ${task.Priority.name}</p>` : ''}
          <p style="margin: 10px 0; color: #16a34a; font-weight: bold;">Estado: ${task.state ? 'Completada ✅' : 'Pendiente ⏳'}</p>
        </div>
        <p style="color: #6b7280; font-size: 14px;">Este es un recordatorio automático de Captus.</p>
      </div>
    `;

    const to = (typeof userContext === 'object' ? userContext?.email : null) || task.User?.email;

    await transporter.sendMail({ from: process.env.GMAIL_USER, to, subject, html });
    console.log(`Task notification email sent for ${action} task: ${task.title}`);
  } catch (error) {
    if (error?.code === 'EAUTH') {
      console.warn('Gmail authentication failed. Skipping email notification.');
      return;
    }
    console.error('Error sending task notification:', error);
  }
}
