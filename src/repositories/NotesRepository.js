import BaseRepository from "./BaseRepository.js";

// Mapping to match Frontend expectations directly
const mapFromDb = (row) => ({
  id: row.id,
  created_at: row.created_at,
  update_at: row.update_at,
  user_id: row.user_id,
  title: row.title,
  content: row.content,
  subject: row.subject,
  is_pinned: row.is_pinned,
  // Legacy properties for compatibility
  pinned: row.is_pinned,
  lastEdited: row.update_at,
});

const mapToDb = (entity) => ({
  title: entity.title,
  content: entity.content ?? null,
  subject: entity.subject ?? null,
  is_pinned: entity.is_pinned ?? entity.pinned ?? false,
  user_id: entity.user_id,
});

class NotesRepository extends BaseRepository {
  constructor() {
    super("notes", {
      primaryKey: "id",
      mapFromDb,
      mapToDb,
    });
  }

  async save(note) {
    return super.save(note);
  }

  async update(note) {
    const id = note.id;
    if (!id) return null;
    return super.update(id, note);
  }

  async getAllByUserId(userId) {
    if (!userId) return [];
    const { data, error } = await this.client
      .from(this.tableName)
      .select("*")
      .eq("user_id", userId)
      .order("is_pinned", { ascending: false })
      .order("update_at", { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    return data.map(mapFromDb);
  }

  async togglePin(noteId, userId) {
    if (!noteId || !userId) return null;

    // First get current pin status
    const note = await this.getById(noteId);
    if (!note || note.user_id !== userId) return null;

    const newPinnedStatus = !note.is_pinned;

    const { data, error } = await this.client
      .from(this.tableName)
      .update({ is_pinned: newPinnedStatus, update_at: new Date().toISOString() })
      .eq("id", noteId)
      .eq("user_id", userId)
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return mapFromDb(data);
  }

  async deleteByUser(userId) {
    if (!userId) return true;
    const { error } = await this.client.from(this.tableName).delete().eq("user_id", userId);
    if (error) {
      throw new Error(error.message);
    }
    return true;
  }
}

export default NotesRepository;