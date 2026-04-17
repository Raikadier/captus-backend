import dotenv from 'dotenv';
import EmailProvider from './notifications/providers/EmailProvider.js';
import WhatsAppProvider from './notifications/providers/WhatsAppProvider.js';
import NotificationRepository from '../repositories/NotificationRepository.js';
import NotificationPreferencesRepository from '../repositories/NotificationPreferencesRepository.js';
import NotificationLogRepository from '../repositories/NotificationLogRepository.js';
import AssignmentRepository from '../repositories/AssignmentRepository.js';

dotenv.config();

export class NotificationService {

  constructor() {
    this.repo = new NotificationRepository();
    this.prefsRepo = new NotificationPreferencesRepository();
    this.logRepo = new NotificationLogRepository();
    this.assignmentRepo = new AssignmentRepository();
    this.email = EmailProvider;
    this.whatsapp = WhatsAppProvider;
  }

  _mapEventTypeToType(eventType) {
    const mapping = {
      'task_created': 'task',
      'task_updated': 'task',
      'note_created': 'system', // Or task/reminder depending on usage
      'event_created': 'reminder',
      'diagram_created': 'system',
      'assignment_created': 'academic',
      'assignment_updated': 'academic',
      'all_submitted': 'academic',
      'submission_graded': 'academic',
      'deadline_3d': 'academic',
      'achievement_unlocked': 'achievement'
    };
    return mapping[eventType] || 'system'; // Default fallback
  }

  /**
   * Central method to send notifications.
   */
  async notify({ user_id, title, body, metadata = {}, event_type, entity_id, force = false, is_auto = false }) {
    try {
      console.log(`[NotificationService] Processing notification for user ${user_id}: ${event_type}`);

      // 1. Check for duplicates in notification_logs if not forced
      if (!force) {
        const hasSent = await this.logRepo.hasSent(user_id, event_type, entity_id);
        if (hasSent) {
          console.log(`[NotificationService] Duplicate notification prevented: ${event_type} for ${user_id}`);
          return { success: false, reason: 'Duplicate' };
        }
      }

      // 2. Create In-App Notification
      // Map strict type for DB constraint
      const dbType = this._mapEventTypeToType(event_type);

      const notificationPayload = {
        user_id,
        title,
        body,
        type: dbType,
        metadata,
        event_type,
        entity_id: String(entity_id),
        read: false
      };

      await this.repo.create(notificationPayload);

      // 3. Log the notification
      await this.logRepo.logSent({
        user_id,
        event_type,
        entity_id: String(entity_id)
      });

      // 4. Check User Preferences
      const prefs = await this.prefsRepo.getForUser(user_id);

      // Defaults if no prefs found
      const emailEnabled = prefs ? prefs.email_enabled : true;
      const whatsappEnabled = prefs ? prefs.whatsapp_enabled : false;
      const userEmail = prefs?.email || null;
      const userPhone = prefs?.whatsapp || null;

      let finalEmail = userEmail;
      if (emailEnabled && !finalEmail) {
        // Fallback to auth email if using repository pattern might require auth admin access
        const { data: userData } = await this.repo.client.auth.admin.getUserById(user_id);
        if (userData && userData.user) {
          finalEmail = userData.user.email;
        }
      }

      // 5. Send Email
      if (emailEnabled && finalEmail) {
        await this.email.sendEmail({
          to: finalEmail,
          subject: title,
          text: body,
          html: `<p>${body}</p>`
        });
      }

      // 6. Send WhatsApp (Skip if auto)
      if (whatsappEnabled && userPhone && !is_auto) {
        await this.whatsapp.sendWhatsApp({
          to: userPhone,
          message: `${title}\n\n${body}`
        });
      }

      return { success: true };

    } catch (error) {
      console.error('[NotificationService] Unexpected error:', error);
      return { success: false, error: error.message };
    }
  }

  // Helper to check deadlines (Cron Logic)
  async checkDeadlines() {
    console.log('[NotificationService] Checking deadlines...');

    try {
      const assignments = await this.assignmentRepo.getUpcomingDeadlines(3);

      if (!assignments || assignments.length === 0) return;

      for (const assignment of assignments) {
        const courseTitle = assignment.courses?.title || 'Course';
        const students = assignment.courses?.course_enrollments || [];

        for (const enrollment of students) {
          await this.notify({
            user_id: enrollment.user_id,
            title: 'Tarea Próxima a Vencer',
            body: `La tarea "${assignment.title}" del curso ${courseTitle} vence el ${new Date(assignment.due_date).toLocaleDateString()}.`,
            event_type: 'deadline_3d',
            entity_id: assignment.id,
            metadata: { due_date: assignment.due_date, course_id: assignment.course_id },
            is_auto: true
          });
        }
      }
    } catch (error) {
      console.error('Error in checkDeadlines:', error);
    }
  }
}

export default new NotificationService();
