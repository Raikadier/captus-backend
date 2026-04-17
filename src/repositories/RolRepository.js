import BaseRepository from "./BaseRepository.js";

const mapFromDb = (row) => ({
  id_Rol: row.id,
  name: row.name,
});

const mapToDb = (entity) => ({
  name: entity.name,
});

class RolRepository extends BaseRepository {
  constructor() {
    super("roles", {
      primaryKey: "id",
      mapFromDb,
      mapToDb,
    });
  }

  // Obtener todos los roles
  async getAll() {
    try {
      const { data, error } = await this.client
        .from(this.tableName)
        .select("*");

      if (error) {
        console.error("Error al obtener roles:", error.message);
        return [];
      }

      return data.map(mapFromDb);
    } catch (error) {
      console.error("Error al obtener roles:", error);
      return [];
    }
  }

  // Obtener un rol por su ID
  async getById(id) {
    try {
      if (!id) return null;
      return super.getById(id);
    } catch (error) {
      console.error("Error al obtener rol por ID:", error);
      return null;
    }
  }

  // Obtener un rol por su nombre
  async getByName(name) {
    try {
      if (!name) return null;
      const { data, error } = await this.client
        .from(this.tableName)
        .select("*")
        .eq("name", name)
        .maybeSingle();

      if (error) {
        console.error("Error al obtener rol por nombre:", error.message);
        return null;
      }

      return data ? mapFromDb(data) : null;
    } catch (error) {
      console.error("Error al obtener rol por nombre:", error);
      return null;
    }
  }
}

export default RolRepository;