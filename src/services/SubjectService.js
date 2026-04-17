import SubjectRepository from "../repositories/SubjectRepository.js";
import { OperationResult } from "../shared/OperationResult.js";

const subjectRepository = new SubjectRepository();

export class SubjectService {
  constructor() {
    this.currentUser = null;
  }

  setCurrentUser(user) {
    this.currentUser = user;
  }

  async getAllByUser() {
    try {
      if (!this.currentUser) {
        return new OperationResult(false, "Usuario no autenticado.");
      }

      const subjects = await subjectRepository.getAllByUserId(this.currentUser.id);
      return new OperationResult(true, "Materias obtenidas exitosamente.", subjects);
    } catch (error) {
      return new OperationResult(false, `Error al obtener materias: ${error.message}`);
    }
  }

  async create(subjectData) {
    try {
      if (!this.currentUser) {
        return new OperationResult(false, "Usuario no autenticado.");
      }

      if (!subjectData.name) {
        return new OperationResult(false, "El nombre de la materia es requerido.");
      }

      const newSubject = {
        userId: this.currentUser.id,
        name: subjectData.name,
        grade: subjectData.grade || 0,
        progress: subjectData.progress || 0,
        color: subjectData.color || 'blue'
      };

      const saved = await subjectRepository.save(newSubject);
      if (saved) {
        return new OperationResult(true, "Materia creada exitosamente.", saved);
      } else {
        return new OperationResult(false, "Error al crear la materia.");
      }
    } catch (error) {
      return new OperationResult(false, `Error al crear materia: ${error.message}`);
    }
  }

  // Helper method for StatisticsService
  async getAverageGrade(userId) {
    try {
      const subjects = await subjectRepository.getAllByUserId(userId);
      if (!subjects.length) return 0;

      const total = subjects.reduce((sum, sub) => sum + sub.grade, 0);
      return parseFloat((total / subjects.length).toFixed(2));
    } catch (error) {
      console.error("Error calculating average grade:", error);
      return 0;
    }
  }
}
