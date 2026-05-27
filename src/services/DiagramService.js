import DiagramRepository from "../repositories/DiagramRepository.js";
import { OperationResult } from "../shared/OperationResult.js";

const diagramRepository = new DiagramRepository();

export class DiagramService {
  async getAllByUser(userId) {
    try {
      if (!userId) return new OperationResult(false, "Usuario no autenticado.");
      const diagrams = await diagramRepository.getAllByUserId(userId);
      return new OperationResult(true, "Diagramas obtenidos exitosamente.", diagrams);
    } catch (error) {
      return new OperationResult(false, `Error al obtener diagramas: ${error.message}`);
    }
  }

  async create(diagramData, userId) {
    try {
      if (!userId) return new OperationResult(false, "Usuario no autenticado.");
      if (!diagramData.title) return new OperationResult(false, "El título es requerido.");
      if (!diagramData.code)  return new OperationResult(false, "El código del diagrama es requerido.");

      const newDiagram = {
        userId,
        courseId: diagramData.courseId || null,
        title: diagramData.title,
        code: diagramData.code,
      };

      const saved = await diagramRepository.save(newDiagram);
      return saved
        ? new OperationResult(true, "Diagrama creado exitosamente.", saved)
        : new OperationResult(false, "Error al crear el diagrama.");
    } catch (error) {
      return new OperationResult(false, `Error al crear diagrama: ${error.message}`);
    }
  }

  async update(id, diagramData, userId) {
    try {
      if (!userId) return new OperationResult(false, "Usuario no autenticado.");

      const existing = await diagramRepository.getById(id);
      if (!existing) return new OperationResult(false, "Diagrama no encontrado.");
      if (existing.userId !== userId)
        return new OperationResult(false, "No tienes permiso para editar este diagrama.");

      const updatedData = {
        ...existing,
        title:     diagramData.title    || existing.title,
        code:      diagramData.code     || existing.code,
        courseId:  diagramData.courseId !== undefined ? diagramData.courseId : existing.courseId,
        updatedAt: new Date(),
      };

      const updated = await diagramRepository.update(id, updatedData);
      return updated
        ? new OperationResult(true, "Diagrama actualizado exitosamente.", updated)
        : new OperationResult(false, "Error al actualizar el diagrama.");
    } catch (error) {
      return new OperationResult(false, `Error al actualizar diagrama: ${error.message}`);
    }
  }

  async delete(id, userId) {
    try {
      if (!userId) return new OperationResult(false, "Usuario no autenticado.");

      const existing = await diagramRepository.getById(id);
      if (!existing) return new OperationResult(false, "Diagrama no encontrado.");
      if (existing.userId !== userId)
        return new OperationResult(false, "No tienes permiso para eliminar este diagrama.");

      const deleted = await diagramRepository.delete(id);
      return deleted
        ? new OperationResult(true, "Diagrama eliminado exitosamente.")
        : new OperationResult(false, "Error al eliminar el diagrama.");
    } catch (error) {
      return new OperationResult(false, `Error al eliminar diagrama: ${error.message}`);
    }
  }
}
