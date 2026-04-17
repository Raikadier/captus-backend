// backend/src/services/NotesService.js
import NotesRepository from "../repositories/NotesRepository.js";
import { OperationResult } from "../shared/OperationResult.js";

export class NotesService {
  constructor(notesRepo) {
    this.repo = notesRepo || new NotesRepository();
  }

  validateNote(note, isUpdate = false) {
    if (!note) {
      return new OperationResult(false, "La nota no puede ser nula.");
    }

    if (!isUpdate) {
      if (!note.title || note.title.trim() === "") {
        return new OperationResult(false, "El título de la nota no puede estar vacío.");
      }
    } else if (!note.title && !note.content && !note.subject) {
      return new OperationResult(false, "No hay cambios para actualizar en la nota.");
    }
    return new OperationResult(true);
  }

  async create(note, userId) {
    return this.save(note, userId);
  }

  async save(note, userId) {
    try {
      const validation = this.validateNote(note);
      if (!validation.success) return validation;

      if (!userId) {
        return new OperationResult(false, "Usuario no autenticado.");
      }

      note.user_id = userId;

      const savedNote = await this.repo.save(note);
      if (savedNote) {
        return new OperationResult(true, "Nota guardada exitosamente.", savedNote);
      } else {
        return new OperationResult(false, "Error al guardar la nota.");
      }
    } catch (error) {
      return new OperationResult(false, `Error al guardar la nota: ${error.message}`);
    }
  }

  async getAll(userId) {
    try {
      if (!userId) return new OperationResult(false, "Usuario no autenticado.");

      const notes = await this.repo.getAllByUserId(userId);
      return new OperationResult(true, "Notas obtenidas exitosamente.", notes);
    } catch (error) {
      return new OperationResult(false, `Error al obtener notas: ${error.message}`);
    }
  }

  async getById(id, userId) {
    try {
      if (!id) {
        return new OperationResult(false, "ID de nota inválido.");
      }

      const note = await this.repo.getById(id);
      if (!note) {
        return new OperationResult(false, "Nota no encontrada.");
      }
      if (userId && note.user_id !== userId) {
        return new OperationResult(false, "Nota no accesible.");
      }
      return new OperationResult(true, "Nota encontrada.", note);
    } catch (error) {
      return new OperationResult(false, `Error al obtener nota: ${error.message}`);
    }
  }

  async update(note, userId) {
    try {
      const validation = this.validateNote(note, true);
      if (!validation.success) return validation;

      const existingNote = await this.repo.getById(note.id);
      if (!existingNote) {
        return new OperationResult(false, "Nota no encontrada.");
      }

      if (!userId || existingNote.user_id !== userId) {
        return new OperationResult(false, "Nota no accesible.");
      }

      // Update the update_at timestamp
      note.update_at = new Date();

      const updated = await this.repo.update({ ...note, user_id: userId });
      if (updated) {
        return new OperationResult(true, "Nota actualizada exitosamente.", updated);
      } else {
        return new OperationResult(false, "Error al actualizar la nota.");
      }
    } catch (error) {
      return new OperationResult(false, `Error al actualizar nota: ${error.message}`);
    }
  }

  async togglePin(id, userId) {
    try {
      if (!id) {
        return new OperationResult(false, "ID de nota inválido.");
      }

      const toggled = await this.repo.togglePin(id, userId);
      if (toggled) {
        return new OperationResult(true, "Estado de fijación actualizado.", toggled);
      } else {
        return new OperationResult(false, "Error al actualizar el estado de fijación.");
      }
    } catch (error) {
      return new OperationResult(false, `Error al cambiar estado de fijación: ${error.message}`);
    }
  }

  async delete(id, userId) {
    try {
      if (!id) {
        return new OperationResult(false, "ID de nota inválido.");
      }

      const existingNote = await this.repo.getById(id);
      if (!existingNote) {
        return new OperationResult(false, "Nota no encontrada.");
      }

      if (!userId || existingNote.user_id !== userId) {
        return new OperationResult(false, "Nota no accesible.");
      }

      const deleted = await this.repo.delete(id);
      if (deleted) {
        return new OperationResult(true, "Nota eliminada exitosamente.");
      } else {
        return new OperationResult(false, "Error al eliminar la nota.");
      }
    } catch (error) {
      return new OperationResult(false, `Error al eliminar la nota: ${error.message}`);
    }
  }
}

