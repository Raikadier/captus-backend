// src/service/SubTaskService.js
import SubTaskRepository from "../repositories/SubTaskRepository.js";
import TaskRepository from "../repositories/TaskRepository.js";
import { TaskService } from "./TaskService.js";
import { OperationResult } from "../shared/OperationResult.js";

const subTaskRepository = new SubTaskRepository();
const taskRepository    = new TaskRepository();
const taskService       = new TaskService();

export class SubTaskService {
  async validateSubTask(subTask) {
    if (!subTask)
      return new OperationResult(false, "La subtarea no puede ser nula.");
    if (!subTask.title || subTask.title.trim() === "")
      return new OperationResult(false, "El título de la subtarea no puede estar vacío.");
    if (!subTask.id_Task)
      return new OperationResult(false, "La subtarea debe tener una tarea padre asignada.");

    if (subTask.endDate) {
      const endDate = new Date(subTask.endDate + 'T00:00:00');
      const today   = new Date();
      today.setHours(0, 0, 0, 0);
      if (endDate < today)
        return new OperationResult(false, "La fecha límite de la subtarea no puede ser anterior a hoy.");

      const parentTask = await taskRepository.getById(subTask.id_Task);
      if (parentTask && parentTask.endDate) {
        const parentEndDate = new Date(parentTask.endDate + 'T00:00:00');
        if (endDate > parentEndDate)
          return new OperationResult(false, "La fecha límite de la subtarea no puede ser posterior a la fecha límite de la tarea padre.");
      }
    }

    return new OperationResult(true);
  }

  async create(subTask, userId) {
    return this.save(subTask, userId);
  }

  async complete(id, userId) {
    const subTask = await this.getById(id, userId);
    if (!subTask.success) return subTask;
    return this.update({ ...subTask.data, state: true }, userId);
  }

  async save(subTask, userId) {
    try {
      const validation = await this.validateSubTask(subTask);
      if (!validation.success) return validation;

      const parentTask = await taskRepository.getById(subTask.id_Task);
      if (!parentTask)
        return new OperationResult(false, "La tarea padre no existe.");
      if (parentTask.id_User !== userId)
        return new OperationResult(false, "La tarea padre no es accesible para este usuario.");

      if (!subTask.creationDate) subTask.creationDate = new Date();

      const savedSubTask = await subTaskRepository.save(subTask);
      return savedSubTask
        ? new OperationResult(true, "Subtarea guardada exitosamente.", savedSubTask)
        : new OperationResult(false, "Error al guardar la subtarea.");
    } catch (error) {
      return new OperationResult(false, `Error al guardar la subtarea: ${error.message}`);
    }
  }

  async deleteByParentTask(taskId) {
    try {
      if (!taskId) return new OperationResult(false, "ID de tarea inválido.");
      const subTasks = await subTaskRepository.getAllByTaskId(taskId);
      for (const subTask of subTasks) {
        await subTaskRepository.delete(subTask.id_SubTask);
      }
      return new OperationResult(true, "Subtareas eliminadas exitosamente.");
    } catch (error) {
      return new OperationResult(false, `Error al eliminar subtareas: ${error.message}`);
    }
  }

  async getAll(userId) {
    try {
      if (!userId) return new OperationResult(false, "Usuario no autenticado.");

      const userTasks = await taskRepository.getAllByUserId(userId);
      const taskIds   = userTasks.map(t => t.id_Task);

      let allSubTasks = [];
      for (const taskId of taskIds) {
        const subs = await subTaskRepository.getAllByTaskId(taskId);
        allSubTasks = allSubTasks.concat(subs);
      }

      return new OperationResult(true, "Subtareas obtenidas exitosamente.", allSubTasks);
    } catch (error) {
      return new OperationResult(false, `Error al obtener subtareas: ${error.message}`);
    }
  }

  async getById(id, userId) {
    try {
      if (!id) return new OperationResult(false, "ID de subtarea inválido.");

      const subTask = await subTaskRepository.getById(id);
      if (!subTask) return new OperationResult(false, "Subtarea no encontrada.");

      const parentTask = await taskRepository.getById(subTask.id_Task);
      if (!parentTask || parentTask.id_User !== userId)
        return new OperationResult(false, "Subtarea no accesible.");

      return new OperationResult(true, "Subtarea encontrada.", subTask);
    } catch (error) {
      return new OperationResult(false, `Error al obtener subtarea: ${error.message}`);
    }
  }

  async update(subTask, userId) {
    try {
      const validation = await this.validateSubTask(subTask);
      if (!validation.success) return validation;

      const existingSubTask = await subTaskRepository.getById(subTask.id_SubTask);
      if (!existingSubTask) return new OperationResult(false, "Subtarea no encontrada.");

      const parentTask = await taskRepository.getById(existingSubTask.id_Task);
      if (parentTask.id_User !== userId)
        return new OperationResult(false, "Subtarea no accesible.");
      if (parentTask.state)
        return new OperationResult(false, "No se pueden modificar subtareas de una tarea ya completada.");

      if (subTask.state && existingSubTask.endDate) {
        const now            = new Date();
        const subTaskDueDate = new Date(existingSubTask.endDate);
        if (subTaskDueDate < now)
          return new OperationResult(false, "No se puede completar una subtarea que ha pasado su fecha límite.");
      }

      if (!subTask.state && existingSubTask.state)
        return new OperationResult(false, "No se puede desmarcar una subtarea completada.");

      const updated = await subTaskRepository.update(subTask);
      if (updated) {
        await this.checkAndCompleteParentTask(subTask.id_Task, userId);
        return new OperationResult(true, "Subtarea actualizada exitosamente.", updated);
      }
      return new OperationResult(false, "Error al actualizar la subtarea.");
    } catch (error) {
      return new OperationResult(false, `Error al actualizar subtarea: ${error.message}`);
    }
  }

  async checkAndCompleteParentTask(taskId, userId) {
    try {
      const subTasks    = await subTaskRepository.getAllByTaskId(taskId);
      const allCompleted = subTasks.every(st => st.state);

      if (allCompleted && subTasks.length > 0) {
        const parentTask = await taskRepository.getById(taskId);
        if (parentTask && !parentTask.state) {
          const updateData = {
            id_Task:     parentTask.id_Task || parentTask.id,
            state:       true,
            user_id:     userId,
            due_date:    parentTask.due_date || parentTask.endDate,
            title:       parentTask.title,
            description: parentTask.description,
            priority_id: parentTask.priority_id || parentTask.id_Priority,
            category_id: parentTask.category_id || parentTask.id_Category,
          };
          const updateResult = await taskService.update(updateData, userId);
          if (!updateResult.success) {
            console.error('Failed to update parent task:', updateResult.message);
          }
        }
      }
    } catch (error) {
      console.error("Error verificando tarea padre:", error);
    }
  }

  async delete(id, userId) {
    try {
      if (!id) return new OperationResult(false, "ID de subtarea inválido.");

      const existingSubTask = await subTaskRepository.getById(id);
      if (!existingSubTask) return new OperationResult(false, "Subtarea no encontrada.");

      const parentTask = await taskRepository.getById(existingSubTask.id_Task);
      if (parentTask.id_User !== userId)
        return new OperationResult(false, "Subtarea no accesible.");
      if (parentTask.state)
        return new OperationResult(false, "No se pueden eliminar subtareas de una tarea ya completada.");

      const deleted = await subTaskRepository.delete(id);
      return deleted
        ? new OperationResult(true, "Subtarea eliminada exitosamente.")
        : new OperationResult(false, "Error al eliminar la subtarea.");
    } catch (error) {
      return new OperationResult(false, `Error al eliminar subtarea: ${error.message}`);
    }
  }

  async markAllAsCompleted(taskId) {
    try {
      if (!taskId) return new OperationResult(false, "ID de tarea inválido.");
      await subTaskRepository.markAllAsCompleted(taskId);
      // Parent task completion check requires userId — callers should handle this separately
      return new OperationResult(true, "Todas las subtareas marcadas como completadas.");
    } catch (error) {
      return new OperationResult(false, `Error al marcar subtareas como completadas: ${error.message}`);
    }
  }

  async getByTaskId(taskId, userId) {
    try {
      if (!taskId) return new OperationResult(false, "ID de tarea inválido.");

      const parentTask = await taskRepository.getById(taskId);
      if (!parentTask || parentTask.id_User !== userId)
        return new OperationResult(false, "Tarea no accesible.");

      const subTasks = await subTaskRepository.getAllByTaskId(taskId);
      return new OperationResult(true, "Subtareas obtenidas exitosamente.", subTasks);
    } catch (error) {
      return new OperationResult(false, `Error al obtener subtareas: ${error.message}`);
    }
  }

  async getTaskIdsWithSubTasks(userId) {
    try {
      if (!userId) return new OperationResult(false, "Usuario no autenticado.");

      const allSubTasksResult = await this.getAll(userId);
      if (!allSubTasksResult.success) return allSubTasksResult;

      const taskIds = [...new Set(allSubTasksResult.data.map(st => st.id_Task))];
      return new OperationResult(true, "IDs de tareas con subtareas obtenidos exitosamente.", taskIds);
    } catch (error) {
      return new OperationResult(false, `Error al obtener IDs de tareas con subtareas: ${error.message}`);
    }
  }
}
