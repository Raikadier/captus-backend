import BaseRepository from "./BaseRepository.js";

const mapFromDb = (row) => ({
  id: row.id,
  name: row.name,
  id_User: row.user_id,
  createdAt: row.created_at,
  // Legacy support
  id_Category: row.id,
});

const mapToDb = (entity) => {
  const result = {};

  // Solo incluir campos que estén definidos y no sean null
  if (entity.name !== undefined && entity.name !== null) {
    result.name = entity.name;
  }

  // Solo incluir user_id si está definido (para creación, no para actualización)
  if (entity.id_User !== undefined && entity.id_User !== null) {
    result.user_id = entity.id_User;
  }

  return result;
};

class CategoryRepository extends BaseRepository {
  constructor() {
    super("categories", {
      primaryKey: "id",
      mapFromDb,
      mapToDb,
    });
  }

  async getByUser(userId) {
    if (!userId) return this.getAll();
    const { data, error } = await this.client
      .from(this.tableName)
      .select("*")
      .or(`user_id.eq.${userId},user_id.is.null`)
      .order("created_at", { ascending: true });

    if (error) {
      throw new Error(error.message);
    }

    return data.map(mapFromDb);
  }

  async getByName(name, userId) {
    if (!name) return null;
    let query = this.client.from(this.tableName).select("*").eq("name", name);
    if (userId) {
      query = query.eq("user_id", userId);
    }

    const { data, error } = await query.limit(1).maybeSingle();
    if (error) {
      if (error.code === "PGRST116") return null;
      throw new Error(error.message);
    }

    return data ? mapFromDb(data) : null;
  }

  async update(entity) {
    if (!entity?.id_Category) return null;
    return super.update(entity.id_Category, entity);
  }

  async delete(id) {
    if (!id) return false;
    return super.delete(id);
  }
}

export default CategoryRepository;
