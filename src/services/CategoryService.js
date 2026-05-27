import CategoryRepository from "../repositories/CategoryRepository.js";
import { TaskService } from "./TaskService.js";
import { OperationResult } from "../shared/OperationResult.js";

// Module-level instances are OK here because neither holds per-request state
// after this refactor — all methods receive userId explicitly.
const categoryRepository = new CategoryRepository();
const taskService = new TaskService();

export class CategoryService {
  /**
   * Returns categories owned by userId plus global ones (user_id IS NULL).
   * @param {string} userId
   */
  async getAll(userId) {
    try {
      if (!userId) return new OperationResult(false, "Usuario no autenticado.");
      const categories = await categoryRepository.getByUser(userId);
      return new OperationResult(true, "Categorías obtenidas exitosamente.", categories);
    } catch (error) {
      return new OperationResult(false, `Error al obtener categorías: ${error.message}`);
    }
  }

  async getById(id) {
    try {
      if (!id || id <= 0) return new OperationResult(false, "ID de categoría inválido.");
      const category = await categoryRepository.getById(id);
      return category
        ? new OperationResult(true, "Categoría encontrada.", category)
        : new OperationResult(false, "Categoría no encontrada.");
    } catch (error) {
      return new OperationResult(false, `Error al obtener categoría: ${error.message}`);
    }
  }

  async getByName(name) {
    try {
      if (!name || name.trim() === "")
        return new OperationResult(false, "Nombre de categoría inválido.");
      const category = await categoryRepository.getByName(name);
      return category
        ? new OperationResult(true, "Categoría encontrada.", category)
        : new OperationResult(false, "Categoría no encontrada.");
    } catch (error) {
      return new OperationResult(false, `Error al obtener categoría por nombre: ${error.message}`);
    }
  }

  /**
   * @param {object} category
   * @param {string} userId  – required, from req.user.id
   */
  async save(category, userId) {
    try {
      if (!category) return new OperationResult(false, "La categoría no puede ser nula.");
      if (!userId)   return new OperationResult(false, "Usuario no autenticado.");

      // Duplicate-name guard
      const userCategories = await this.getAll(userId);
      if (userCategories.success) {
        const nameExists = userCategories.data.some(
          (cat) => cat.name.toLowerCase() === category.name.toLowerCase()
        );
        if (nameExists)
          return new OperationResult(false, "Ya existe una categoría con ese nombre.");
      }

      const categoryWithUser = { ...category, id_User: userId };
      const saved = await categoryRepository.save(categoryWithUser);
      return saved
        ? new OperationResult(true, "Categoría guardada exitosamente.", saved)
        : new OperationResult(false, "Error al guardar la categoría.");
    } catch (error) {
      return new OperationResult(false, `Error al guardar la categoría: ${error.message}`);
    }
  }

  /**
   * @param {object} category
   * @param {string} userId  – required, from req.user.id
   */
  async update(category, userId) {
    try {
      if (!category) return new OperationResult(false, "La categoría no puede ser nula.");

      if (category.id_Category === 1 || category.name === "General")
        return new OperationResult(false, "No se puede actualizar la categoría General.");

      const existing = await this.getById(category.id_Category);
      if (!existing.success || !existing.data)
        return new OperationResult(false, "Categoría no encontrada.");

      if (existing.data.id_User !== userId)
        return new OperationResult(false, "No tienes permisos para actualizar esta categoría.");

      const updated = await categoryRepository.update(category);
      return updated
        ? new OperationResult(true, "Categoría actualizada exitosamente.")
        : new OperationResult(false, "Error al actualizar la categoría.");
    } catch (error) {
      return new OperationResult(false, `Error al actualizar categoría: ${error.message}`);
    }
  }

  async delete(id) {
    try {
      if (!id || id <= 0)
        return new OperationResult(false, "ID de categoría inválido.");

      const category = await this.getById(id);
      if (!category.success || !category.data)
        return new OperationResult(false, "Categoría no encontrada.");

      if (id === 1 || category.data.name === "General")
        return new OperationResult(false, "No se puede eliminar la categoría General.");

      await taskService.deleteByCategory(id);

      const deleted = await categoryRepository.delete(id);
      return deleted
        ? new OperationResult(true, "Categoría eliminada exitosamente.")
        : new OperationResult(false, "Error al eliminar la categoría.");
    } catch (error) {
      return new OperationResult(false, `Error al eliminar categoría: ${error.message}`);
    }
  }
}

export default CategoryService;
