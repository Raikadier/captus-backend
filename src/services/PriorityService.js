// src/service/PriorityService.js
import PriorityRepository from "../repositories/PriorityRepository.js";
import { OperationResult } from "../shared/OperationResult.js";

const priorityRepository = new PriorityRepository();

export class PriorityService {
  async getAll() {
    try {
      const priorities = await priorityRepository.getAll();
      return new OperationResult(true, "Prioridades obtenidas exitosamente.", priorities);
    } catch (error) {
      console.error("Error obteniendo prioridades:", error);
      return new OperationResult(false, `Error al obtener prioridades: ${error.message}`);
    }
  }

  async getById(id) {
    try {
      if (!id || id <= 0) {
        return new OperationResult(false, "ID de prioridad inválido.");
      }

      const priority = await priorityRepository.getById(id);
      if (priority) {
        return new OperationResult(true, "Prioridad encontrada.", priority);
      } else {
        return new OperationResult(false, "Prioridad no encontrada.");
      }
    } catch (error) {
      console.error("Error obteniendo prioridad por ID:", error);
      return new OperationResult(false, `Error al obtener prioridad: ${error.message}`);
    }
  }
}