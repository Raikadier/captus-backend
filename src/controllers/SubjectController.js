import { SubjectService } from "../services/SubjectService.js";

export class SubjectController {
  constructor() {
    this.subjectService = new SubjectService();
  }

  async getAll(req, res) {
    const result = await this.subjectService.getAllByUser(req.user.id);
    res.status(result.success ? 200 : 400).json(result);
  }

  async create(req, res) {
    const result = await this.subjectService.create(req.body, req.user.id);
    res.status(result.success ? 201 : 400).json(result);
  }
}
