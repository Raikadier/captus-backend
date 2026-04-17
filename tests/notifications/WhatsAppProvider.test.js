import { WhatsAppProvider } from "../../src/services/notifications/providers/WhatsAppProvider.js";
import { jest } from '@jest/globals';

describe("WhatsAppProvider", () => {
  let provider;

  beforeEach(() => {
    process.env.WA_TOKEN = "token";
    process.env.WA_PHONE_ID = "phone";
    provider = new WhatsAppProvider();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("Debe enviar un mensaje correctamente", async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({ ok: true, json: () => ({}) })
    );

    const result = await provider.sendWhatsApp({
      to: "+57000000",
      message: "Hola!",
    });

    expect(result.success).toBe(true);
    expect(fetch).toHaveBeenCalled();
  });

  it("Debe fallar cuando la API responde error", async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({ ok: false, json: () => ({ error: "Error API" }) })
    );

    const result = await provider.sendWhatsApp({
        to: "+57000000",
        message: "Hola!",
      });

      expect(result.success).toBe(false);
  });
});
