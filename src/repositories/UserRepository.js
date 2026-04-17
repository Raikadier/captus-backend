import BaseRepository from "./BaseRepository.js";

const mapFromDb = (row) => ({
  id: row.id, // Standardize on 'id' for compatibility with User model
  id_User: row.id, // Keep for legacy compatibility
  userName: row.name || row.email?.split('@')[0],
  email: row.email,
  name: row.name,
  carrer: row.carrer,
  bio: row.bio,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const mapToDb = (entity) => ({
  id: entity.id || entity.id_User, // Accept either
  email: entity.email,
  name: entity.name || entity.userName,
  carrer: entity.carrer,
  bio: entity.bio,
  created_at: entity.createdAt || entity.created_at || new Date(), // Handle both camelCase and snake_case inputs
  updated_at: entity.updatedAt || entity.updated_at || new Date(),
});

export default class UserRepository extends BaseRepository {
  constructor() {
    super("users", {
      primaryKey: "id",
      mapFromDb,
      mapToDb,
    });
  }

  async save(entity) {
    try {
      if (!entity) return null;

      // Upsert usuario (insertar si no existe, actualizar si existe)
      const { data, error } = await this.client
        .from(this.tableName)
        .upsert(mapToDb(entity), { onConflict: 'id' })
        .select("*")
        .single();

      if (error) {
        console.error("Error saving user:", error.message);
        return null;
      }

      return mapFromDb(data);
    } catch (error) {
      console.error("Error saving user:", error.message);
      return null;
    }
  }

  async getByUsername(username) {
    try {
      // Buscar por name o por email (username derivado)
      const { data, error } = await this.client
        .from(this.tableName)
        .select("*")
        .or(`name.eq.${username},email.eq.${username}`)
        .maybeSingle();

      if (error) {
        console.error("Error getting user by username:", error.message);
        return null;
      }

      return data ? mapFromDb(data) : null;
    } catch (error) {
      console.error("Error getting user by username:", error.message);
      return null;
    }
  }

  // Verificar si email ya está registrado
  async isEmailRegistered(email) {
    try {
      const { data, error } = await this.client
        .from(this.tableName)
        .select("id")
        .eq("email", email)
        .maybeSingle();

      if (error) {
        console.error("Error checking email:", error.message);
        return false;
      }

      return !!data;
    } catch (error) {
      console.error("Error checking email:", error.message);
      return false;
    }
  }

  async getById(id) {
    try {
      const { data, error } = await this.client
        .from(this.tableName)
        .select("*")
        .eq("id", id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null;
        throw new Error(error.message);
      }

      return mapFromDb(data);
    } catch (error) {
      console.error("Error getting user by id:", error.message);
      return null;
    }
  }

  async getAll() {
    try {
      const { data, error } = await this.client
        .from(this.tableName)
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw new Error(error.message);

      return data.map(mapFromDb);
    } catch (error) {
      console.error("Error getting all users:", error.message);
      return [];
    }
  }

  async update(id, updates) {
    try {
      const { data, error } = await this.client
        .from(this.tableName)
        .update(mapToDb({ ...updates, id_User: id })) // Ensure ID is preserved/mapped
        .eq("id", id)
        .select("*")
        .single();

      if (error) throw new Error(error.message);

      return mapFromDb(data);
    } catch (error) {
      console.error("Error updating user:", error.message);
      return null;
    }
  }

  async delete(id) {
    try {
      const { error } = await this.client
        .from(this.tableName)
        .delete()
        .eq("id", id);

      if (error) throw new Error(error.message);
      return true;
    } catch (error) {
      console.error("Error deleting user:", error.message);
      return false;
    }
  }

  // Método adicional: obtener usuario por email
  async getByEmail(email) {
    try {
      const { data, error } = await this.client
        .from(this.tableName)
        .select("*")
        .eq("email", email)
        .maybeSingle();

      if (error) {
        console.error("Error getting user by email:", error.message);
        return null;
      }

      return data ? mapFromDb(data) : null;
    } catch (error) {
      console.error("Error getting user by email:", error.message);
      return null;
    }
  }
}
