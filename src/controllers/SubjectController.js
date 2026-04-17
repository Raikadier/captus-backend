import { SubjectService } from "../services/SubjectService.js";

const subjectService = new SubjectService();

export class SubjectController {
  constructor() {
    this.injectUser = (req, res, next) => {
      if (req.user) {
        subjectService.setCurrentUser(req.user);
      }
      next();
    };
  }

  async getAll(req, res) {
    const result = await subjectService.getAllByUser();
    res.status(result.success ? 200 : 400).json(result);
  }

  async create(req, res) {
    const result = await subjectService.create(req.body);
    res.status(result.success ? 201 : 400).json(result);
  }
}
