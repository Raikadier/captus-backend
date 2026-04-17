import NotificationService from '../services/NotificationService.js';

class NotificationController {

  async getNotifications(req, res) {
    try {
      const userId = req.user.id;
      const notifications = await NotificationService.repo.getAll({ user_id: userId });
      // Repository getAll might not support ordering by default based on BaseRepository, so we might need a custom method or accept that BaseRepository needs extension.
      // BaseRepository.getAll does simple eq/is matching. To order, we should ideally extend NotificationRepository.
      // However, for now, let's stick to the existing pattern or extend the repo if needed.
      // Looking at BaseRepository, it doesn't support ordering.
      // Let's assume for this iteration we fetch all and sort in memory or add a method to NotificationRepository.

      // Better: use a custom method in NotificationRepository. But first let's try to see if we can just use the service or repo directly in a clean way.
      // To avoid raw supabase queries here, we should use the repo.
      // Let's fix NotificationRepository to support this query.

      // Actually, let's check if we can add a method to NotificationRepository for this.
      // Since I can't easily switch context to write that file right now without breaking the flow of this file writing,
      // I will rely on the fact that I can update NotificationRepository in the next step if I want to be 100% pure.
      // But to keep it simple and robust:

      const { type, unread, limit = 50 } = req.query;

      let query = NotificationService.repo.client
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(parseInt(limit));

      // Filter by type if provided
      if (type) {
        query = query.eq('type', type);
      }

      // Filter by read status if provided
      if (unread !== undefined) {
        const isUnread = unread === 'true';
        query = query.eq('read', !isUnread);
      }

      const { data, error } = await query;

      if (error) throw error;
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async markAsRead(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const { error } = await NotificationService.repo.client
        .from('notifications')
        .update({ read: true })
        .eq('id', id)
        .eq('user_id', userId);

      if (error) throw error;
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async getPreferences(req, res) {
    try {
      const userId = req.user.id;
      const data = await NotificationService.prefsRepo.getForUser(userId);

      if (!data) {
         return res.json({
             email_enabled: true,
             whatsapp_enabled: false,
             email: null,
             whatsapp: null
         });
      }
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async updatePreferences(req, res) {
    try {
      const userId = req.user.id;
      const { email_enabled, whatsapp_enabled, email, whatsapp } = req.body;

      // Using upsert via client because BaseRepository update/save might not handle upsert elegantly with PK 'user_id' if it assumes auto-increment or different behavior
      const { data, error } = await NotificationService.prefsRepo.client
        .from('notification_preferences')
        .upsert({
          user_id: userId,
          email_enabled,
          whatsapp_enabled,
          email,
          whatsapp,
          updated_at: new Date()
        })
        .select();

      if (error) throw error;
      res.json(data[0]);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async checkDeadlines(req, res) {
    try {
        await NotificationService.checkDeadlines();
        res.json({ success: true, message: 'Deadlines checked' });
    } catch (error) {
        console.error('Deadline check failed:', error);
        res.status(500).json({ error: error.message });
    }
  }

  async trigger(req, res) {
    try {
        const userId = req.user.id;
        // This endpoint allows triggering a manual notification (e.g. for testing or specific frontend actions)
        // req.body: { title, body, type, metadata }
        const { title, body, event_type, metadata, entity_id } = req.body;

        const result = await NotificationService.notify({
            user_id: userId,
            title,
            body,
            event_type: event_type || 'manual_trigger',
            entity_id: entity_id || 'manual',
            metadata: metadata || {},
            force: true // Manual triggers might want to bypass duplicate checks
        });

        if (!result.success) throw new Error(result.error || result.reason);

        res.json({ success: true });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
  }
}

export default new NotificationController();
