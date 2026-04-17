import { NotificationService } from "../../src/services/NotificationService.js";
import { jest } from '@jest/globals';

describe("NotificationService", () => {
  let service;

  beforeEach(() => {
    service = new NotificationService();

    // Mock internal components
    service.repo = {
      create: jest.fn(),
      client: { auth: { admin: { getUserById: jest.fn(() => Promise.resolve({ data: { user: { email: 'test@test.com' } } })) } } }
    };

    service.prefsRepo = {
      getForUser: jest.fn(),
    };

    service.email = {
      sendEmail: jest.fn(() => Promise.resolve({ success: true })),
    };

    service.whatsapp = {
      sendWhatsApp: jest.fn(() => Promise.resolve({ success: true })),
    };

    service.logRepo = {
      logSent: jest.fn(),
      hasSent: jest.fn(() => Promise.resolve(false)),
    };
  });

  it("Debe crear la notificación in-app siempre", async () => {
    await service.notify({
      user_id: "user_test",
      title: "Prueba",
      body: "Contenido",
      event_type: "test_event",
      entity_id: "1",
    });

    expect(service.repo.create).toHaveBeenCalled();
  });

  it("Debe enviar email si las preferencias lo habilitan", async () => {
    service.prefsRepo.getForUser.mockResolvedValue({
      email_enabled: true,
      email: "test@test.com",
      whatsapp_enabled: false,
    });

    await service.notify({
      user_id: "user_test",
      title: "Prueba",
      body: "Contenido",
      event_type: "test_event",
      entity_id: "1",
    });

    expect(service.email.sendEmail).toHaveBeenCalled();
  });

  it("Debe evitar duplicados usando logs", async () => {
    service.logRepo.hasSent.mockResolvedValue(true);

    await service.notify({
      user_id: "user_test",
      title: "Prueba",
      body: "Contenido",
      event_type: "test_event",
      entity_id: "1",
    });

    expect(service.email.sendEmail).not.toHaveBeenCalled();
    expect(service.whatsapp.sendWhatsApp).not.toHaveBeenCalled();
  });
});
