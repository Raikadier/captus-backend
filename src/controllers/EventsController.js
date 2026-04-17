import { EventsService } from "../services/EventsService.js";
import EventsRepository from "../repositories/EventsRepository.js";
import NotificationService from '../services/NotificationService.js';

export class EventsController {
  constructor() {
    this.eventsRepository = new EventsRepository();
    this.eventsService = new EventsService(this.eventsRepository);
  }

  async getAll(req, res) {
    const result = await this.eventsService.getAll(req.user.id);
    res.status(result.success ? 200 : 401).json(result);
  }

  async getById(req, res) {
    const { id } = req.params;
    const result = await this.eventsService.getById(parseInt(id), req.user.id);
    res.status(result.success ? 200 : 404).json(result);
  }

  async getByDateRange(req, res) {
    const { startDate, endDate } = req.query;
    const result = await this.eventsService.getByDateRange(startDate, endDate, req.user.id);
    res.status(result.success ? 200 : 400).json(result);
  }

  async create(req, res) {
    // Pass full user object for email notifications
    const result = await this.eventsService.create(req.body, req.user);

    if (result.success) {
      await NotificationService.notify({
        user_id: req.user.id,
        title: 'Evento Creado',
        body: `Evento "${result.data.title}" agendado.`,
        event_type: 'event_created',
        entity_id: result.data.id,
        is_auto: true
      });
    }

    res.status(result.success ? 201 : 400).json(result);
  }

  async update(req, res) {
    const { id } = req.params;
    const eventData = { ...req.body, id: parseInt(id) };
    // Pass full user object for email notifications
    const result = await this.eventsService.update(eventData, req.user);
    res.status(result.success ? 200 : 400).json(result);
  }

  async delete(req, res) {
    const { id } = req.params;
    const result = await this.eventsService.delete(parseInt(id), req.user.id);
    res.status(result.success ? 200 : 400).json(result);
  }

  async getUpcoming(req, res) {
    const { limit } = req.query;
    const result = await this.eventsService.getUpcoming({ limit }, req.user.id);
    res.status(result.success ? 200 : 400).json(result);
  }

  async checkUpcomingEvents(req, res) {
    // Pass full user object
    await this.eventsService.checkUpcomingEvents(req.user);
    res.status(200).json({ success: true, message: "Upcoming events checked" });
  }
}