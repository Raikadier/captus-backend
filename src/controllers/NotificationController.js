import NotificationService from '../services/NotificationService.js';

class NotificationController {

  async getNotifications(req, res) {
    try {
      const userId = req.user.id;
      const { type, unread, limit = 50 } = req.query;

      let query = NotificationService.repo.client
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(parseInt(limit));

      if (type) query = query.eq('type', type);
      if (unread !== undefined) query = query.eq('read', unread !== 'true');

      const { data, error } = await query;
      if (error) throw error;

      res.status(200).json({ success: true, data });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async markAsRead(req, res) {
    try {
      const { error } = await NotificationService.repo.client
        .from('notifications')
        .update({ read: true })
        .eq('id', req.params.id)
        .eq('user_id', req.user.id);

      if (error) throw error;
      res.status(200).json({ success: true, message: 'Notificación marcada como leída.' });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async getPreferences(req, res) {
    try {
      const data = await NotificationService.prefsRepo.getForUser(req.user.id);
      res.status(200).json({
        success: true,
        data: data ?? {
          email_enabled: true,
          whatsapp_enabled: false,
          email: null,
          whatsapp: null
        }
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async updatePreferences(req, res) {
    try {
      const { email_enabled, whatsapp_enabled, email, whatsapp } = req.body;
      const { data, error } = await NotificationService.prefsRepo.client
        .from('notification_preferences')
        .upsert({
          user_id: req.user.id,
          email_enabled,
          whatsapp_enabled,
          email,
          whatsapp,
          updated_at: new Date()
        })
        .select();

      if (error) throw error;
      res.status(200).json({ success: true, data: data[0] });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async checkDeadlines(req, res) {
    try {
      await NotificationService.checkDeadlines();
      res.status(200).json({ success: true, message: 'Deadlines checked' });
    } catch (error) {
      console.error('Deadline check failed:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async trigger(req, res) {
    try {
      const { title, body, event_type, metadata, entity_id } = req.body;
      const result = await NotificationService.notify({
        user_id: req.user.id,
        title,
        body,
        event_type: event_type || 'manual_trigger',
        entity_id: entity_id || 'manual',
        metadata: metadata || {},
        force: true
      });

      if (!result.success) throw new Error(result.error || result.reason);
      res.status(200).json({ success: true });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  // ── FCM Device Token ──────────────────────────────────────────────────────

  async registerDeviceToken(req, res) {
    try {
      if (!req.user?.id) return res.status(401).json({ success: false, message: 'No autenticado' });

      const { token, platform } = req.body;
      if (!token || typeof token !== 'string') {
        return res.status(400).json({ success: false, message: 'token es requerido' });
      }

      await NotificationService.registerDeviceToken(req.user.id, token, platform || 'android');
      res.status(200).json({ success: true });
    } catch (err) {
      console.error('[NotificationController] registerDeviceToken', err);
      res.status(500).json({ success: false, message: 'Error al registrar token' });
    }
  }

  async unregisterDeviceToken(req, res) {
    try {
      const { token } = req.body;
      if (!token) return res.status(400).json({ success: false, message: 'token es requerido' });

      await NotificationService.unregisterDeviceToken(token);
      res.status(200).json({ success: true });
    } catch (err) {
      console.error('[NotificationController] unregisterDeviceToken', err);
      res.status(500).json({ success: false, message: 'Error al eliminar token' });
    }
  }
}

export default new NotificationController();
