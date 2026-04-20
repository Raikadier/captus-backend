import BaseRepository from './BaseRepository.js';

/**
 * Manages FCM device tokens for push notifications.
 * Table: device_tokens (user_id, token, platform, updated_at)
 */
export default class DeviceTokenRepository extends BaseRepository {
  constructor() {
    super('device_tokens', { primaryKey: 'id' });
  }

  /**
   * Upsert a device token for a user.
   * Uses the token itself as the conflict key so the same device
   * never duplicates rows, but also handles token rotation for a user.
   */
  async upsert(userId, token, platform = 'android') {
    const { data, error } = await this.client
      .from('device_tokens')
      .upsert(
        {
          user_id: userId,
          token,
          platform,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'token' }
      )
      .select('id')
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  /**
   * Retrieve all active tokens for a user.
   * Ordered newest-first (after a refresh the latest token is most reliable).
   */
  async getByUserId(userId) {
    const { data, error } = await this.client
      .from('device_tokens')
      .select('token, platform')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (error) throw new Error(error.message);
    return data ?? [];
  }

  /**
   * Remove a specific token (called on logout).
   */
  async deleteToken(token) {
    const { error } = await this.client
      .from('device_tokens')
      .delete()
      .eq('token', token);

    if (error) throw new Error(error.message);
  }

  /**
   * Remove all tokens for a user (hard sign-out on all devices).
   */
  async deleteAllForUser(userId) {
    const { error } = await this.client
      .from('device_tokens')
      .delete()
      .eq('user_id', userId);

    if (error) throw new Error(error.message);
  }
}
