// src/service/RolService.js
import RolRepository from "../repositories/RolRepository.js";
import { OperationResult } from "../shared/OperationResult.js";

const rolRepository = new RolRepository();

export class RolService {
  async getAll() {
    try {
      const roles = await rolRepository.getAll();
      return new OperationResult(true, "Roles obtenidos exitosamente.", roles);
    } catch (error) {
      return new OperationResult(false, `Error al obtener roles: ${error.message}`);
    }
  }

  async getById(id) {
    try {
      if (!id || id <= 0) {
        return new OperationResult(false, "ID de rol inválido.");
      }

      const rol = await rolRepository.getById(id);
      if (rol) {
        return new OperationResult(true, "Rol encontrado.", rol);
      } else {
        return new OperationResult(false, "Rol no encontrado.");
      }
    } catch (error) {
      return new OperationResult(false, `Error al obtener rol: ${error.message}`);
    }
  }

  async getByName(name) {
    try {
      if (!name || name.trim() === "") {
        return new OperationResult(false, "Nombre de rol inválido.");
      }

      const rol = await rolRepository.getByName(name);
      if (rol) {
        return new OperationResult(true, "Rol encontrado.", rol);
      } else {
        return new OperationResult(false, "Rol no encontrado.");
      }
    } catch (error) {
      return new OperationResult(false, `Error al obtener rol por nombre: ${error.message}`);
    }
  }
}