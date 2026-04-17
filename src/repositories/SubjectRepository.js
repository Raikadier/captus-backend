import BaseRepository from "./BaseRepository.js";

const mapFromDb = (row) => ({
  id: row.id,
  userId: row.user_id,
  name: row.name,
  grade: parseFloat(row.grade || 0),
  progress: row.progress,
  color: row.color,
  createdAt: row.created_at,
});

const mapToDb = (entity) => ({
  user_id: entity.userId,
  name: entity.name,
  grade: entity.grade,
  progress: entity.progress,
  color: entity.color,
});

class SubjectRepository extends BaseRepository {
  constructor() {
    super("subjects", {
      primaryKey: "id",
      mapFromDb,
      mapToDb,
    });
  }

  async getAllByUserId(userId) {
    if (!userId) return [];
    const { data, error } = await this.client
      .from(this.tableName)
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: true });

    if (error) {
      throw new Error(error.message);
    }

    return data.map(mapFromDb);
  }
}

export default SubjectRepository;
