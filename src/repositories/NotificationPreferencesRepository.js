import BaseRepository from './BaseRepository.js';

export default class NotificationPreferencesRepository extends BaseRepository {
  constructor() {
    super('notification_preferences', { primaryKey: 'user_id' });
  }

  async getForUser(userId) {
    const { data, error } = await this.client
      .from(this.tableName)
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw error;
    }
    return data;
  }
}
