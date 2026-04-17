import BaseRepository from './BaseRepository.js';

export default class NotificationRepository extends BaseRepository {
  constructor() {
    super('notifications', { primaryKey: 'id' });
  }

  async create(payload) {
    return this.save(payload);
  }
}
