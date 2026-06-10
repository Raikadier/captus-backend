import BaseRepository from "./BaseRepository.js";

const mapFromDb = (row) => ({
  id: row.id,
  courseId: row.course_id,
  title: row.title,
  content: row.content,
  filePath: row.file_path,
  uploadedBy: row.uploaded_by,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const mapToDb = (entity) => ({
  course_id: entity.courseId ?? entity.course_id,
  title: entity.title,
  content: entity.content ?? null,
  file_path: entity.filePath ?? entity.file_path ?? null,
  uploaded_by: entity.uploadedBy ?? entity.uploaded_by,
  updated_at: entity.updatedAt ?? new Date(),
});

export default class CourseMaterialRepository extends BaseRepository {
  constructor() {
    super("course_materials", { primaryKey: "id", mapFromDb, mapToDb });
  }

  async findByCourse(courseId) {
    const { data, error } = await this.client
      .from(this.tableName)
      .select("*")
      .eq("course_id", courseId)
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);
    return (data || []).map(mapFromDb);
  }

  async searchByCourse(courseId, query, limit = 5) {
    const q = String(query || "").trim().toLowerCase();
    const rows = await this.findByCourse(courseId);
    if (!q) return rows.slice(0, limit);

    return rows
      .filter(
        (row) =>
          row.title?.toLowerCase().includes(q) ||
          row.content?.toLowerCase().includes(q)
      )
      .slice(0, limit);
  }

  async searchInCourses(courseIds, query, limit = 8) {
    if (!courseIds?.length) return [];
    const q = String(query || "").trim().toLowerCase();
    if (!q) return [];

    const { data, error } = await this.client
      .from(this.tableName)
      .select("*")
      .in("course_id", courseIds)
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);

    return (data || [])
      .map(mapFromDb)
      .filter(
        (row) =>
          row.title?.toLowerCase().includes(q) ||
          row.content?.toLowerCase().includes(q)
      )
      .slice(0, limit);
  }
}
