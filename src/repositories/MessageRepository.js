import BaseRepository from "./BaseRepository.js";

const mapFromDb = (row) => ({
  id: row.id,
  conversationId: row.conversation_id,
  role: row.role,
  content: row.content,
  createdAt: row.created_at,
});

const mapToDb = (entity) => ({
  conversation_id: entity.conversationId,
  role: entity.role,
  content: entity.content,
  created_at: entity.createdAt
});

class MessageRepository extends BaseRepository {
  constructor() {
    super("messages", {
      primaryKey: "id",
      mapFromDb,
      mapToDb,
    });
  }

  async create(conversationId, role, content) {
    return this.save({
      conversationId,
      role,
      content,
    });
  }

  async getByConversationId(conversationId) {
    const { data, error } = await this.client
      .from(this.tableName)
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) throw new Error(error.message);
    return data.map(mapFromDb);
  }
}

export default MessageRepository;
