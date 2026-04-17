// src/service/SubTaskService.js
import SubTaskRepository from "../repositories/SubTaskRepository.js";
import TaskRepository from "../repositories/TaskRepository.js";
import { TaskService } from "./TaskService.js";
import { OperationResult } from "../shared/OperationResult.js";

const subTaskRepository = new SubTaskRepository();
const taskRepository = new TaskRepository();
const taskService = new TaskService();

export class SubTaskService {
  constructor() {
    // Simular sesión - en un entorno real esto vendría del contexto de autenticación
    this.currentUser = null;
  }

  // Método para establecer el usuario actual (desde middleware de auth)
  setCurrentUser(user) {
    this.currentUser = user;
    taskService.setCurrentUser(user); // También inyectar en TaskService
  }

  async validateSubTask(subTask) {
    if (!subTask) {
      return new OperationResult(false, "La subtarea no puede ser nula.");
    }

    if (!subTask.title || subTask.title.trim() === "") {
      return new OperationResult(false, "El título de la subtarea no puede estar vacío.");
    }

    if (!subTask.id_Task) {
      return new OperationResult(false, "La subtarea debe tener una tarea padre asignada.");
    }

    // Validar fecha límite si se proporciona
    if (subTask.endDate) {
      const endDate = new Date(subTask.endDate + 'T00:00:00'); // Ensure we compare dates only, not times
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Reset to start of today

      if (endDate < today) {
        return new OperationResult(false, "La fecha límite de la subtarea no puede ser anterior a hoy.");
      }

      // Validar que la fecha límite de la subtarea no exceda la fecha límite de la tarea padre
      const parentTask = await taskRepository.getById(subTask.id_Task);
      if (parentTask && parentTask.endDate) {
        const parentEndDate = new Date(parentTask.endDate + 'T00:00:00');
        if (endDate > parentEndDate) {
          return new OperationResult(false, "La fecha límite de la subtarea no puede ser posterior a la fecha límite de la tarea padre.");
        }
      }
    }

    return new OperationResult(true);
  }

  async create(subTask) {
    return this.save(subTask);
  }

  async complete(id) {
    const subTask = await this.getById(id);
    if (!subTask.success) return subTask;
    const updated = await this.update({ ...subTask.data, state: true });
    return updated;
  }

  async save(subTask) {
    try {
      const validation = await this.validateSubTask(subTask);
      if (!validation.success) return validation;

      // Validar que la tarea padre existe y pertenece al usuario actual
      const parentTask = await taskRepository.getById(subTask.id_Task);
      if (!parentTask) {
        return new OperationResult(false, "La tarea padre no existe.");
      }

      if (parentTask.id_User !== this.currentUser?.id) {
        return new OperationResult(false, "La tarea padre no es accesible para este usuario.");
      }

      // Establecer fecha de creación si no existe
      if (!subTask.creationDate) {
        subTask.creationDate = new Date();
      }

      const savedSubTask = await subTaskRepository.save(subTask);
      if (savedSubTask) {
        return new OperationResult(true, "Subtarea guardada exitosamente.", savedSubTask);
      } else {
        return new OperationResult(false, "Error al guardar la subtarea.");
      }
    } catch (error) {
      return new OperationResult(false, `Error al guardar la subtarea: ${error.message}`);
    }
  }

  async deleteByParentTask(taskId) {
    try {
      if (!taskId) {
        return new OperationResult(false, "ID de tarea inválido.");
      }

      const subTasks = await subTaskRepository.getAllByTaskId(taskId);
      for (const subTask of subTasks) {
        await subTaskRepository.delete(subTask.id_SubTask);
      }

      return new OperationResult(true, "Subtareas eliminadas exitosamente.");
    } catch (error) {
      return new OperationResult(false, `Error al eliminar subtareas: ${error.message}`);
    }
  }

  async getAll() {
    try {
      if (!this.currentUser) {
        return new OperationResult(false, "Usuario no autenticado.");
      }

      // Obtener todas las subtareas del usuario (a través de sus tareas)
      const userTasks = await taskRepository.getAllByUserId(this.currentUser.id);
      const taskIds = userTasks.map(task => task.id_Task);

      let allSubTasks = [];
      for (const taskId of taskIds) {
        const subTasks = await subTaskRepository.getAllByTaskId(taskId);
        allSubTasks = allSubTasks.concat(subTasks);
      }

      return new OperationResult(true, "Subtareas obtenidas exitosamente.", allSubTasks);
    } catch (error) {
      return new OperationResult(false, `Error al obtener subtareas: ${error.message}`);
    }
  }

  async getById(id) {
    try {
      if (!id) {
        return new OperationResult(false, "ID de subtarea inválido.");
      }

      const subTask = await subTaskRepository.getById(id);
      if (subTask) {
        // Verificar que la tarea padre pertenece al usuario actual
        const parentTask = await taskRepository.getById(subTask.id_Task);
        if (parentTask && parentTask.id_User === this.currentUser?.id) {
          return new OperationResult(true, "Subtarea encontrada.", subTask);
        } else {
          return new OperationResult(false, "Subtarea no accesible.");
        }
      } else {
        return new OperationResult(false, "Subtarea no encontrada.");
      }
    } catch (error) {
      return new OperationResult(false, `Error al obtener subtarea: ${error.message}`);
    }
  }

  async update(subTask) {
    try {
      const validation = await this.validateSubTask(subTask);
      if (!validation.success) {
        return validation;
      }

      const existingSubTask = await subTaskRepository.getById(subTask.id_SubTask);
      if (!existingSubTask) {
        return new OperationResult(false, "Subtarea no encontrada.");
      }

      // Verificar que pertenece al usuario actual
      const parentTask = await taskRepository.getById(existingSubTask.id_Task);
      if (parentTask.id_User !== this.currentUser?.id) {
        return new OperationResult(false, "Subtarea no accesible.");
      }

      // Validar reglas de completado según estado de la tarea padre
      if (parentTask.state) {
        // Si la tarea padre está completada, no permitir cambios en subtareas
        return new OperationResult(false, "No se pueden modificar subtareas de una tarea ya completada.");
      }

      // Check if subtask is overdue
      if (subTask.state && existingSubTask.endDate) {
        const now = new Date();
        const subTaskDueDate = new Date(existingSubTask.endDate);
        if (subTaskDueDate < now) {
          return new OperationResult(false, "No se puede completar una subtarea que ha pasado su fecha límite.");
        }
      }

      // No permitir desmarcar una subtarea completada
      if (!subTask.state && existingSubTask.state) {
        return new OperationResult(false, "No se puede desmarcar una subtarea completada.");
      }

      const updated = await subTaskRepository.update(subTask);

      if (updated) {
        // Verificar si todas las subtareas están completadas para completar la tarea padre
        await this.checkAndCompleteParentTask(subTask.id_Task);

        return new OperationResult(true, "Subtarea actualizada exitosamente.", updated);
      } else {
        return new OperationResult(false, "Error al actualizar la subtarea.");
      }
    } catch (error) {
      return new OperationResult(false, `Error al actualizar subtarea: ${error.message}`);
    }
  }

  async checkAndCompleteParentTask(taskId) {
    try {
      const subTasks = await subTaskRepository.getAllByTaskId(taskId);
      const allCompleted = subTasks.every(subTask => subTask.state);

      if (allCompleted && subTasks.length > 0) {
        const parentTask = await taskRepository.getById(taskId);

        if (parentTask && !parentTask.state) {
          // Create update object with required fields
          const updateData = {
            id_Task: parentTask.id_Task || parentTask.id,
            state: true,
            user_id: parentTask.id_User || parentTask.user_id,
            due_date: parentTask.due_date || parentTask.endDate,
            title: parentTask.title,
            description: parentTask.description,
            priority_id: parentTask.priority_id || parentTask.id_Priority,
            category_id: parentTask.category_id || parentTask.id_Category
          };

          const updateResult = await taskService.update(updateData);

          if (updateResult.success) {
            console.log(`Tarea padre ${parentTask.title} completada automáticamente al completar todas las subtareas`);
          } else {
            console.error('Failed to update parent task:', updateResult.message);
          }
        }
      }
    } catch (error) {
      console.error("Error verificando tarea padre:", error);
    }
  }

  async delete(id) {
    try {
      if (!id) {
        return new OperationResult(false, "ID de subtarea inválido.");
      }

      const existingSubTask = await subTaskRepository.getById(id);
      if (!existingSubTask) {
        return new OperationResult(false, "Subtarea no encontrada.");
      }

      // Verificar que pertenece al usuario actual
      const parentTask = await taskRepository.getById(existingSubTask.id_Task);
      if (parentTask.id_User !== this.currentUser?.id) {
        return new OperationResult(false, "Subtarea no accesible.");
      }

      // Check if parent task is completed
      if (parentTask.state) {
        return new OperationResult(false, "No se pueden eliminar subtareas de una tarea ya completada.");
      }

      const deleted = await subTaskRepository.delete(id);

      if (deleted) {
        return new OperationResult(true, "Subtarea eliminada exitosamente.");
      } else {
        return new OperationResult(false, "Error al eliminar la subtarea.");
      }
    } catch (error) {
      return new OperationResult(false, `Error al eliminar subtarea: ${error.message}`);
    }
  }

  async markAllAsCompleted(taskId) {
    try {
      if (!taskId) {
        return new OperationResult(false, "ID de tarea inválido.");
      }

      await subTaskRepository.markAllAsCompleted(taskId);
      await this.checkAndCompleteParentTask(taskId);

      return new OperationResult(true, "Todas las subtareas marcadas como completadas.");
    } catch (error) {
      return new OperationResult(false, `Error al marcar subtareas como completadas: ${error.message}`);
    }
  }

  async getByTaskId(taskId) {
    try {
      if (!taskId) {
        return new OperationResult(false, "ID de tarea inválido.");
      }

      // Verificar que la tarea pertenece al usuario actual
      const parentTask = await taskRepository.getById(taskId);
      if (!parentTask || parentTask.id_User !== this.currentUser?.id) {
        return new OperationResult(false, "Tarea no accesible.");
      }

      const subTasks = await subTaskRepository.getAllByTaskId(taskId);
      return new OperationResult(true, "Subtareas obtenidas exitosamente.", subTasks);
    } catch (error) {
      return new OperationResult(false, `Error al obtener subtareas: ${error.message}`);
    }
  }

  async getTaskIdsWithSubTasks() {
    try {
      if (!this.currentUser) {
        return new OperationResult(false, "Usuario no autenticado.");
      }

      // Get all subtasks for the user and extract unique task IDs
      const allSubTasksResult = await this.getAll();
      if (!allSubTasksResult.success) {
        return allSubTasksResult;
      }

      const taskIds = [...new Set(allSubTasksResult.data.map(st => st.id_Task))];
      return new OperationResult(true, "IDs de tareas con subtareas obtenidos exitosamente.", taskIds);
    } catch (error) {
      return new OperationResult(false, `Error al obtener IDs de tareas con subtareas: ${error.message}`);
    }
  }
}
