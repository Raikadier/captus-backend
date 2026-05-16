import BaseRepository from "./BaseRepository.js";

const mapFromDb = (row) => ({
  id: row.id,
  userId: row.user_id,
  title: row.title,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const mapToDb = (entity) => ({
  user_id: entity.userId,
  title: entity.title,
  created_at: entity.createdAt,
  updated_at: entity.updatedAt
});

class ConversationRepository extends BaseRepository {
  constructor() {
    super("conversations", {
      primaryKey: "id",
      mapFromDb,
      mapToDb,
    });
  }

  async create(userId, title = 'Nueva conversación') {
    return this.save({
      userId,
      title,
    });
  }

  async updateTitle(id, title) {
    const { data, error } = await this.client
      .from(this.tableName)
      .update({ title })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return mapFromDb(data);
  }

  async deleteOldConversations(userId) {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    // Delete conversations created more than 24 hours ago
    const { error } = await this.client
      .from(this.tableName)
      .delete()
      .eq('user_id', userId)
      .lt('created_at', oneDayAgo);

    if (error) {
      console.error('Error deleting old conversations:', error);
      // We don't throw here to avoid blocking the user flow if cleanup fails
    }
  }

  /** Delete a single conversation (and cascade its messages via DB FK). */
  async deleteById(id, userId) {
    const { error } = await this.client
      .from(this.tableName)
      .delete()
      .eq('id', id)
      .eq('user_id', userId); // ownership guard at DB level

    if (error) throw new Error(error.message);
  }

  /** Delete ALL conversations for a user. */
  async deleteAllByUserId(userId) {
    const { error } = await this.client
      .from(this.tableName)
      .delete()
      .eq('user_id', userId);

    if (error) throw new Error(error.message);
  }

  async getRecentByUserId(userId) {
    // Lazy cleanup: delete old conversations before fetching
    await this.deleteOldConversations(userId);

    const { data, error } = await this.client
      .from(this.tableName)
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (error) throw new Error(error.message);
    return data.map(mapFromDb);
  }
}

export default ConversationRepository;
