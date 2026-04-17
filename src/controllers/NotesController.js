import { NotesService } from "../services/NotesService.js";
import NotesRepository from "../repositories/NotesRepository.js";
import NotificationService from '../services/NotificationService.js';

export class NotesController {
  constructor() {
    const notesRepo = new NotesRepository();
    this.service = new NotesService(notesRepo);
  }

  async getAll(req, res) {
    const userId = req.user.id;
    const result = await this.service.getAll(userId);
    res.status(result.success ? 200 : 401).json(result);
  }

  async getById(req, res) {
    const { id } = req.params;
    const userId = req.user.id;
    const result = await this.service.getById(parseInt(id), userId);
    res.status(result.success ? 200 : 404).json(result);
  }

  async create(req, res) {
    const userId = req.user.id;
    const result = await this.service.create(req.body, userId);

    if (result.success) {
      await NotificationService.notify({
        user_id: userId,
        title: 'Nota Creada',
        body: `Has creado una nueva nota.`,
        event_type: 'note_created',
        entity_id: result.data.id,
        is_auto: true
      });
    }

    res.status(result.success ? 201 : 400).json(result);
  }

  async update(req, res) {
    const { id } = req.params;
    const userId = req.user.id;
    const noteData = { ...req.body, id: parseInt(id) };
    const result = await this.service.update(noteData, userId);
    res.status(result.success ? 200 : 400).json(result);
  }

  async togglePin(req, res) {
    const { id } = req.params;
    const userId = req.user.id;
    const result = await this.service.togglePin(parseInt(id), userId);
    res.status(result.success ? 200 : 400).json(result);
  }

  async delete(req, res) {
    const { id } = req.params;
    const userId = req.user.id;
    const result = await this.service.delete(parseInt(id), userId);
    res.status(result.success ? 200 : 400).json(result);
  }
}