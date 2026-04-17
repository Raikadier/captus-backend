import { PriorityService } from "../services/PriorityService.js";

const priorityService = new PriorityService();

export class PriorityController {
  async getAll(req, res) {
    const result = await priorityService.getAll();
    res.status(result.success ? 200 : 500).json(result);
  }

  async getById(req, res) {
    const { id } = req.params;
    const result = await priorityService.getById(parseInt(id));
    res.status(result.success ? 200 : 404).json(result);
  }
}