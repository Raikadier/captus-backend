import { OperationResult } from "../shared/OperationResult.js";
import nodemailer from 'nodemailer';

// Email transporter configuration
const createEmailTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD, // App-specific password
    },
  });
};

export class EventsService {
  constructor(eventsRepository) {
    this.eventsRepository = eventsRepository;
  }

  /**
   * Valida los datos de un evento.
   * @param {object} event - El objeto del evento.
   * @returns {OperationResult} - El resultado de la validación.
   */
  validateEvent(event) {
    if (!event) {
      return new OperationResult(false, "El evento no puede ser nulo.");
    }
    if (!event.title || event.title.trim() === "") {
      return new OperationResult(false, "El título del evento no puede estar vacío.");
    }
    if (!event.start_date) {
      return new OperationResult(false, "La fecha de inicio es requerida.");
    }
    if (!event.type || event.type.trim() === "") {
      return new OperationResult(false, "El tipo de evento es requerido.");
    }
    if (event.end_date && new Date(event.end_date) < new Date(event.start_date)) {
      return new OperationResult(false, "La fecha de fin no puede ser anterior a la fecha de inicio.");
    }
    return new OperationResult(true);
  }

  async create(event, userId) {
    return this.save(event, userId);
  }

  async save(event, userId) {
    try {
      const validation = this.validateEvent(event);
      if (!validation.success) return validation;

      // Accept both a raw ID string and a user object { id, email, ... }
      const resolvedId = typeof userId === 'object' ? (userId?.id ?? userId) : userId;
      if (!resolvedId) {
        return new OperationResult(false, "Usuario no autenticado.");
      }

      event.user_id = resolvedId;
      event.is_past = Boolean(event.is_past);
      event.notify = Boolean(event.notify);
      if (!event.type) {
        event.type = "personal";
      }

      const savedEvent = await this.eventsRepository.save(event);
      if (savedEvent) {
        // Send notification email if requested (non-blocking)
        if (event.notify) {
          // We need user email for notification. 
          // Assuming the controller or caller might pass user email or we fetch it.
          // For now, let's assume we can't send email without user email.
          // Or we fetch user details here? 
          // To keep it simple and stateless, we might need to pass user object or fetch it.
          // But for now, I'll comment out email sending or require user object.
          // Let's pass the user object if available, or just userId.
          // If we only have userId, we can't send email unless we fetch user.
          // Refactoring to just use userId means we might lose the email capability unless we fetch the user.
          // I will assume the caller might pass the user object if email is needed, or I'll fetch it.
          // But to adhere to the pattern, let's just pass userId and maybe fetch user if needed?
          // Actually, the previous implementation used `this.currentUser`.
          // I'll update the signature to accept `user` object if possible, or just `userId`.
          // If `userId` is passed, I can't send email easily without fetching.
          // Let's check if I can fetch user. I don't have UserRepository injected.
          // I should probably inject UserRepository too if I need to fetch user.
          // For now, I will skip email sending if user email is not available, or I'll rely on the controller passing the full user object.
          // Let's change the signature to `save(event, user)`.
        }

        // Re-implementing email sending if user object is passed
        if (event.notify && typeof userId === 'object' && userId.email) {
          this.sendEventNotification(savedEvent, 'created', userId).catch(error => {
            console.error('Error sending event notification:', error);
          });
        }

        return new OperationResult(true, "Evento guardado exitosamente.", savedEvent);
      } else {
        return new OperationResult(false, "Error al guardar el evento.");
      }
    } catch (error) {
      return new OperationResult(false, `Error al guardar el evento: ${error.message}`);
    }
  }

  async getAll(userId) {
    try {
      if (!userId) return new OperationResult(false, "Usuario no autenticado.");

      const events = await this.eventsRepository.getAllByUserId(userId);
      return new OperationResult(true, "Eventos obtenidos exitosamente.", events);
    } catch (error) {
      return new OperationResult(false, `Error al obtener eventos: ${error.message}`);
    }
  }

  async getById(id, userId) {
    try {
      if (!id) {
        return new OperationResult(false, "ID de evento inválido.");
      }

      const event = await this.eventsRepository.getById(id);
      if (event) {
        if (userId && event.user_id === userId) {
          return new OperationResult(true, "Evento encontrado.", event);
        } else {
          return new OperationResult(false, "Evento no accesible.");
        }
      } else {
        return new OperationResult(false, "Evento no encontrado.");
      }
    } catch (error) {
      return new OperationResult(false, `Error al obtener evento: ${error.message}`);
    }
  }

  async update(event, user) {
    try {
      const userId = user.id || user;
      const existingEvent = await this.eventsRepository.getById(event.id);
      if (!existingEvent) {
        return new OperationResult(false, "Evento no encontrado.");
      }

      if (!userId || existingEvent.user_id !== userId) {
        return new OperationResult(false, "Evento no accesible.");
      }

      const mergedEvent = {
        ...existingEvent,
        ...event,
        user_id: userId,
      };

      const validation = this.validateEvent(mergedEvent);
      if (!validation.success) return validation;

      // Update the update_at timestamp
      mergedEvent.updated_at = new Date();

      const updated = await this.eventsRepository.update(mergedEvent);
      if (updated) {
        // Send notification email if requested
        if (event.notify && user.email) {
          this.sendEventNotification(updated, 'updated', user).catch(error => {
            console.error('Error sending event notification:', error);
          });
        }

        return new OperationResult(true, "Evento actualizado exitosamente.", updated);
      } else {
        return new OperationResult(false, "Error al actualizar el evento.");
      }
    } catch (error) {
      console.error(`Error inesperado en EventsService.update: ${error.message}`);
      throw new Error("Ocurrió un error inesperado al actualizar el evento.");
    }
  }

  async delete(id, userId) {
    try {
      if (!id) {
        return new OperationResult(false, "ID de evento inválido.");
      }

      const existingEvent = await this.eventsRepository.getById(id);
      if (!existingEvent) {
        return new OperationResult(false, "Evento no encontrado.");
      }

      if (!userId || existingEvent.user_id !== userId) {
        return new OperationResult(false, "Evento no accesible.");
      }

      const deleted = await this.eventsRepository.delete(id);
      if (deleted) {
        return new OperationResult(true, "Evento eliminado exitosamente.");
      } else {
        return new OperationResult(false, "Error al eliminar el evento.");
      }
    } catch (error) {
      return new OperationResult(false, `Error al eliminar evento: ${error.message}`);
    }
  }

  async getByDateRange(startDate, endDate, userId) {
    try {
      if (!userId) return new OperationResult(false, "Usuario no autenticado.");

      const events = await this.eventsRepository.getByDateRange(userId, startDate, endDate);
      return new OperationResult(true, "Eventos obtenidos exitosamente.", events);
    } catch (error) {
      return new OperationResult(false, `Error al obtener eventos por rango de fecha: ${error.message}`);
    }
  }

  async getUpcoming(options = {}, userId) {
    try {
      const resolvedId = typeof userId === 'object' ? (userId?.id ?? userId) : userId;
      if (!resolvedId) return new OperationResult(false, "Usuario no autenticado.");

      const limit = options.limit || null;
      const events = await this.eventsRepository.getUpcomingByUserId(resolvedId, limit);
      return new OperationResult(true, "Próximos eventos obtenidos exitosamente.", events);
    } catch (error) {
      return new OperationResult(false, `Error al obtener eventos próximos: ${error.message}`);
    }
  }

  async sendEventNotification(event, action, user) {
    try {
      if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
        console.warn('Gmail credentials not configured for notifications');
        return;
      }

      const transporter = createEmailTransporter();

      const actionText = action === 'created' ? 'creado' : 'actualizado';
      const subject = `Evento ${actionText}: ${event.title}`;
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #16a34a;">Evento ${actionText}</h2>
          <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin: 0 0 10px 0; color: #1f2937;">${event.title}</h3>
            <p style="margin: 5px 0; color: #4b5563;"><strong>Tipo:</strong> ${event.type}</p>
            <p style="margin: 5px 0; color: #4b5563;"><strong>Fecha:</strong> ${new Date(event.start_date).toLocaleString('es-ES')}</p>
            ${event.end_date ? `<p style="margin: 5px 0; color: #4b5563;"><strong>Hasta:</strong> ${new Date(event.end_date).toLocaleString('es-ES')}</p>` : ''}
            ${event.description ? `<p style="margin: 10px 0; color: #4b5563;"><strong>Descripción:</strong> ${event.description}</p>` : ''}
          </div>
          <p style="color: #6b7280; font-size: 14px;">
            Este es un recordatorio automático de Captus.
          </p>
        </div>
      `;

      await transporter.sendMail({
        from: process.env.GMAIL_USER,
        to: user.email,
        subject,
        html,
      });

      console.log(`Notification email sent for ${action} event: ${event.title}`);
    } catch (error) {
      console.error('Error sending event notification:', error);
    }
  }

  async checkUpcomingEvents(user) {
    try {
      if (!user) return;

      // Get events in the next 24 hours that have notifications enabled
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const upcomingEvents = await this.eventsRepository.getByDateRange(
        user.id,
        new Date().toISOString(),
        tomorrow.toISOString()
      );

      for (const event of upcomingEvents) {
        if (event.notify) {
          await this.sendUpcomingEventNotification(event, user);
        }
      }
    } catch (error) {
      console.error(`Error inesperado en EventsService.getByDateRange: ${error.message}`);
      throw new Error("Ocurrió un error inesperado al obtener los eventos por fecha.");
    }
  }

  // --- Métodos de Ayuda (Helper Methods) ---

  async sendUpcomingEventNotification(event, user) {
    try {
      if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
        console.warn('Gmail credentials not configured for notifications');
        return;
      }

      const transporter = createEmailTransporter();

      const timeUntil = new Date(event.start_date) - new Date();
      const hoursUntil = Math.floor(timeUntil / (1000 * 60 * 60));

      const subject = `Recordatorio: ${event.title} en ${hoursUntil} horas`;
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #dc2626;">¡Recordatorio de Evento!</h2>
          <div style="background: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc2626;">
            <h3 style="margin: 0 0 10px 0; color: #1f2937;">${event.title}</h3>
            <p style="margin: 5px 0; color: #4b5563;"><strong>Tipo:</strong> ${event.type}</p>
            <p style="margin: 5px 0; color: #dc2626; font-weight: bold;">📅 ${new Date(event.start_date).toLocaleString('es-ES')}</p>
            ${event.end_date ? `<p style="margin: 5px 0; color: #4b5563;"><strong>Hasta:</strong> ${new Date(event.end_date).toLocaleString('es-ES')}</p>` : ''}
            ${event.description ? `<p style="margin: 10px 0; color: #4b5563;"><strong>Descripción:</strong> ${event.description}</p>` : ''}
            <p style="margin: 15px 0 0 0; color: #dc2626; font-weight: bold;">⏰ El evento comienza en ${hoursUntil} horas</p>
          </div>
          <p style="color: #6b7280; font-size: 14px;">
            Este es un recordatorio automático de Captus.
          </p>
        </div>
      `;

      await transporter.sendMail({
        from: process.env.GMAIL_USER,
        to: user.email,
        subject,
        html,
      });

      console.log(`Upcoming event notification sent for: ${event.title}`);
    } catch (error) {
      console.error('Error sending upcoming event notification:', error);
    }
  }
}
