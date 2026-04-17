import BaseRepository from './BaseRepository.js';

export default class NotificationLogRepository extends BaseRepository {
  constructor() {
    super('notification_logs', { primaryKey: 'id' });
  }

  async logSent(logData) {
    return this.save(logData);
  }

  async hasSent(userId, eventType, entityId) {
    const { data, error } = await this.client
      .from(this.tableName)
      .select('id')
      .eq('user_id', userId)
      .eq('event_type', eventType)
      .eq('entity_id', String(entityId))
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error checking logs:', error);
      return false;
    }
    return !!data;
  }
}
