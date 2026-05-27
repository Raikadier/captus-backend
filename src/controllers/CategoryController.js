import { CategoryService } from "../services/CategoryService.js";
import { StatisticsService } from "../services/StatisticsService.js";

export class CategoryController {
  constructor() {
    // Services are instantiated per-controller — no module-level singletons,
    // no shared mutable state between concurrent requests.
    this.categoryService  = new CategoryService();
    this.statisticsService = new StatisticsService();
  }

  async getAll(req, res) {
    const result = await this.categoryService.getAll(req.user.id);
    res.status(result.success ? 200 : 401).json(result);
  }

  async getById(req, res) {
    const { id } = req.params;
    const result = await this.categoryService.getById(parseInt(id));
    res.status(result.success ? 200 : 404).json(result);
  }

  async getByName(req, res) {
    const { name } = req.params;
    const result = await this.categoryService.getByName(decodeURIComponent(name));
    res.status(result.success ? 200 : 404).json(result);
  }

  async create(req, res) {
    const result = await this.categoryService.save(req.body, req.user.id);
    res.status(result.success ? 201 : 400).json(result);
  }

  async update(req, res) {
    const { id } = req.params;
    const categoryData = { ...req.body, id_Category: parseInt(id) };
    const result = await this.categoryService.update(categoryData, req.user.id);
    res.status(result.success ? 200 : 400).json(result);
  }

  async delete(req, res) {
    const { id } = req.params;
    const result = await this.categoryService.delete(parseInt(id));
    res.status(result.success ? 200 : 400).json(result);
  }

  async getStats(req, res) {
    // getCategoryStats didn't exist — route now delegates to the real method
    const result = await this.statisticsService.getFavoriteCategoryAnalysis(req.user.id);
    res.status(result.success ? 200 : 400).json(result);
  }
}