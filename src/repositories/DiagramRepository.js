import BaseRepository from "./BaseRepository.js";

const mapFromDb = (row) => ({
  id: row.id,
  userId: row.user_id,
  courseId: row.course_id,
  title: row.title,
  code: row.code,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const mapToDb = (entity) => ({
  user_id: entity.userId,
  course_id: entity.courseId,
  title: entity.title,
  code: entity.code,
  updated_at: entity.updatedAt || new Date(),
});

class DiagramRepository extends BaseRepository {
  constructor() {
    super("diagrams", {
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
      .order("updated_at", { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    return data.map(mapFromDb);
  }
}

export default DiagramRepository;
