import CategoryRepository from "../repositories/CategoryRepository.js";
import { TaskService } from "./TaskService.js";
import { OperationResult } from "../shared/OperationResult.js";

const categoryRepository = new CategoryRepository();
const taskService = new TaskService();

export class CategoryService {
  constructor() {
    // Simular sesión - en un entorno real esto vendría del contexto de autenticación
    this.currentUser = null;
  }

  // Método para establecer el usuario actual (desde middleware de auth)
  setCurrentUser(user) {
    this.currentUser = user;
    taskService.setCurrentUser(user);
  }

  async delete(id) {
    try {
      const category = await this.getById(id);
      if (!id || id <= 0) {
        return new OperationResult(false, "ID de categoría inválido.");
      }

      if (!category.success || !category.data) {
        return new OperationResult(false, "Categoría no encontrada.");
      }

      // No permitir eliminar la categoría "General"
      if (id === 1 || category.data.name === "General") {
        return new OperationResult(false, "No se puede eliminar la categoría General.");
      }

      // Eliminar tareas relacionadas primero
      await taskService.deleteByCategory(id);

      const deleted = await categoryRepository.delete(id);
      if (deleted) {
        return new OperationResult(true, "Categoría eliminada exitosamente.");
      } else {
        return new OperationResult(false, "Error al eliminar la categoría.");
      }
    } catch (error) {
      return new OperationResult(false, `Error al eliminar categoría: ${error.message}`);
    }
  }

  async getAll() {
    try {
      if (!this.currentUser) {
        return new OperationResult(false, "Usuario no autenticado.");
      }

      // Obtener categorías del usuario + globales
      const categories = await categoryRepository.getByUser(this.currentUser.id);
      return new OperationResult(true, "Categorías obtenidas exitosamente.", categories);
    } catch (error) {
      return new OperationResult(false, `Error al obtener categorías: ${error.message}`);
    }
  }

  async getById(id) {
    try {
      if (!id || id <= 0) return new OperationResult(false, "ID de categoría inválido.");

      const category = await categoryRepository.getById(id);
      if (category) {
        return new OperationResult(true, "Categoría encontrada.", category);
      } else {
        return new OperationResult(false, "Categoría no encontrada.");
      }
    } catch (error) {
      return new OperationResult(false, `Error al obtener categoría: ${error.message}`);
    }
  }

  async getByName(name) {
    try {
      if (!name || name.trim() === "") return new OperationResult(false, "Nombre de categoría inválido.");

      const category = await categoryRepository.getByName(name);
      if (category) {
        return new OperationResult(true, "Categoría encontrada.", category);
      } else {
        return new OperationResult(false, "Categoría no encontrada.");
      }
    } catch (error) {
      return new OperationResult(false, `Error al obtener categoría por nombre: ${error.message}`);
    }
  }

  async save(category, userOverride = null) {
    try {
      if (!category) {
        return new OperationResult(false, "La categoría no puede ser nula.");
      }

      // Usar userOverride si se proporciona, de lo contrario usar this.currentUser
      const currentUser = userOverride || this.currentUser;

      if (!currentUser) {
        return new OperationResult(false, "Usuario no autenticado.");
      }

      // Asignar automáticamente el usuario autenticado
      const categoryWithUser = {
        ...category,
        id_User: currentUser.id
      };

      // Verificar si ya existe una categoría con el mismo nombre para este usuario
      const userCategories = await this.getAll();
      if (userCategories.success) {
        const nameExists = userCategories.data.some(cat =>
          cat.name.toLowerCase() === category.name.toLowerCase()
        );
        if (nameExists) {
          return new OperationResult(false, "Ya existe una categoría con ese nombre.");
        }
      }

      const savedCategory = await categoryRepository.save(categoryWithUser);
      if (savedCategory) {
        return new OperationResult(true, "Categoría guardada exitosamente.", savedCategory);
      } else {
        return new OperationResult(false, "Error al guardar la categoría.");
      }
    } catch (error) {
      return new OperationResult(false, `Error al guardar la categoría: ${error.message}`);
    }
  }

  async update(category, userOverride = null) {
    try {
      if (!category) {
        return new OperationResult(false, "La categoría no puede ser nula.");
      }

      // No permitir actualizar la categoría "General"
      if (category.id_Category === 1 || category.name === "General") {
        return new OperationResult(false, "No se puede actualizar la categoría General.");
      }

      const existingCategory = await this.getById(category.id_Category);
      if (!existingCategory.success || !existingCategory.data) {
        return new OperationResult(false, "Categoría no encontrada.");
      }

      // Verificar que el usuario tenga permisos sobre esta categoría
      const currentUser = userOverride || this.currentUser;
      if (existingCategory.data.id_User !== currentUser?.id) {
        return new OperationResult(false, "No tienes permisos para actualizar esta categoría.");
      }

      const updated = await categoryRepository.update(category);
      if (updated) {
        return new OperationResult(true, "Categoría actualizada exitosamente.");
      } else {
        return new OperationResult(false, "Error al actualizar la categoría.");
      }
    } catch (error) {
      return new OperationResult(false, `Error al actualizar categoría: ${error.message}`);
    }
  }
}

export default CategoryService;
