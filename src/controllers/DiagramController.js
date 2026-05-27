import { DiagramService } from "../services/DiagramService.js";
import NotificationService from '../services/NotificationService.js';

export class DiagramController {
  constructor() {
    this.diagramService = new DiagramService();
  }

  async getAll(req, res) {
    const result = await this.diagramService.getAllByUser(req.user.id);
    res.status(result.success ? 200 : 400).json(result);
  }

  async create(req, res) {
    const result = await this.diagramService.create(req.body, req.user.id);

    if (result.success) {
      await NotificationService.notify({
        user_id: req.user.id,
        title: 'Diagrama Creado',
        body: `Has creado el diagrama "${result.data.title || 'Sin título'}".`,
        event_type: 'diagram_created',
        entity_id: result.data.id,
        is_auto: true,
      });
    }

    res.status(result.success ? 201 : 400).json(result);
  }

  async update(req, res) {
    const { id } = req.params;
    const result = await this.diagramService.update(id, req.body, req.user.id);
    res.status(result.success ? 200 : 400).json(result);
  }

  async delete(req, res) {
    const { id } = req.params;
    const result = await this.diagramService.delete(id, req.user.id);
    res.status(result.success ? 200 : 400).json(result);
  }
}
