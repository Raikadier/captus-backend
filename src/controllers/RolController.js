// src/controllers/RolController.js
import { RolService } from "../services/RolService.js";

const rolService = new RolService();

export class RolController {
  async getAll(req, res) {
    const result = await rolService.getAll();
    res.status(result.success ? 200 : 500).json(result);
  }

  async getById(req, res) {
    const { id } = req.params;
    const result = await rolService.getById(parseInt(id));
    res.status(result.success ? 200 : 404).json(result);
  }

  async getByName(req, res) {
    const { name } = req.params;
    const result = await rolService.getByName(decodeURIComponent(name));
    res.status(result.success ? 200 : 404).json(result);
  }
}