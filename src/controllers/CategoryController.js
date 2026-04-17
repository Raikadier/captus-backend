import { CategoryService } from "../services/CategoryService.js";
import { StatisticsService } from "../services/StatisticsService.js";

const statisticsService = new StatisticsService();

const categoryService = new CategoryService();

export class CategoryController {
  constructor() {
    // Middleware para inyectar usuario en el servicio
    this.injectUser = (req, res, next) => {
      if (req.user) {
        categoryService.setCurrentUser(req.user);
        statisticsService.setCurrentUser(req.user);
      }
      next();
    };
  }

  async getAll(req, res) {
    const result = await categoryService.getAll();
    res.status(result.success ? 200 : 401).json(result);
  }

  async getById(req, res) {
    const { id } = req.params;
    const result = await categoryService.getById(parseInt(id));
    res.status(result.success ? 200 : 404).json(result);
  }

  async getByName(req, res) {
    const { name } = req.params;
    const result = await categoryService.getByName(decodeURIComponent(name));
    res.status(result.success ? 200 : 404).json(result);
  }

  async create(req, res) {
    // Pasar req.user como fallback si el servicio no tiene currentUser
    const result = await categoryService.save(req.body, req.user);
    res.status(result.success ? 201 : 400).json(result);
  }

  async update(req, res) {
    const { id } = req.params;
    const categoryData = { ...req.body, id_Category: parseInt(id) };
    const result = await categoryService.update(categoryData, req.user);
    res.status(result.success ? 200 : 400).json(result);
  }

  async delete(req, res) {
    const { id } = req.params;
    const result = await categoryService.delete(parseInt(id));
    res.status(result.success ? 200 : 400).json(result);
  }

  async getStats(req, res) {
    const result = await statisticsService.getCategoryStats();
    res.status(result.success ? 200 : 400).json(result);
  }
}