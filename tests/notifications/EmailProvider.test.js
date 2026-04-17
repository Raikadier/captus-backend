import { jest } from '@jest/globals';

const mockSendMail = jest.fn();

jest.unstable_mockModule('nodemailer', () => {
  return {
    default: {
      createTransport: jest.fn(() => ({
        sendMail: mockSendMail,
      })),
    },
  };
});

const { EmailProvider } = await import('../../src/services/notifications/providers/EmailProvider.js');

describe("EmailProvider", () => {
  let provider;

  beforeEach(() => {
    process.env.GMAIL_USER = "test@captus.app";
    process.env.GMAIL_APP_PASSWORD = "password";
    provider = new EmailProvider();
    mockSendMail.mockClear();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("Debe enviar un email correctamente", async () => {
    mockSendMail.mockResolvedValue({ messageId: "sent" });

    const result = await provider.sendEmail({
      to: "user@test.com",
      subject: "Prueba",
      html: "<p>Hola!</p>",
    });

    expect(result.success).toBe(true);
    expect(mockSendMail).toHaveBeenCalled();
  });

  it("Debe manejar errores en el envío", async () => {
    mockSendMail.mockRejectedValue(new Error("error resend"));

    const result = await provider.sendEmail({
        to: "user@test.com",
        subject: "Prueba",
        html: "<p>Hola!</p>",
      });

      expect(result.success).toBe(false);
  });
});
