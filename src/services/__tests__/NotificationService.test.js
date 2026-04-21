/**
 * NotificationService — unit tests.
 *
 * Firebase Admin and all repositories are replaced with jest mocks so this
 * suite runs without a database or a Firebase project.
 */
import { jest } from '@jest/globals';

// ── Mock firebase-admin/messaging before the module loads ─────────────────────
const mockSend = jest.fn();
const mockGetMessaging = jest.fn(() => ({ sendEachForMulticast: mockSend }));

jest.unstable_mockModule('firebase-admin/messaging', () => ({
  getMessaging: mockGetMessaging,
}));

// ── Import after mocking ───────────────────────────────────────────────────────
const { NotificationService } = await import('../NotificationService.js');

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildService() {
  const service = new NotificationService();

  // Replace every repo with a jest mock (post-construction injection).
  service.repo = {
    create: jest.fn().mockResolvedValue({ id: 'notif-1' }),
    getByUserId: jest.fn().mockResolvedValue([]),
  };
  service.prefsRepo = {
    getByUserId: jest.fn().mockResolvedValue({ push: true, email: false }),
  };
  service.deviceTokenRepo = {
    upsert: jest.fn().mockResolvedValue({ id: 'dt-1' }),
    getByUserId: jest.fn().mockResolvedValue([
      { token: 'token-A', platform: 'android' },
    ]),
    deleteToken: jest.fn().mockResolvedValue(undefined),
    deleteAllForUser: jest.fn().mockResolvedValue(undefined),
  };
  service.logRepo = {
    hasSent: jest.fn().mockResolvedValue(false),
    logSent: jest.fn().mockResolvedValue(undefined),
  };
  service.assignmentRepo = {
    getById: jest.fn(),
  };

  return service;
}

// ── registerDeviceToken ───────────────────────────────────────────────────────

describe('NotificationService.registerDeviceToken', () => {
  it('calls deviceTokenRepo.upsert with correct arguments', async () => {
    const service = buildService();
    await service.registerDeviceToken('user-1', 'fcm-token-xyz', 'ios');
    expect(service.deviceTokenRepo.upsert).toHaveBeenCalledWith(
      'user-1', 'fcm-token-xyz', 'ios'
    );
  });

  it('uses "android" as default platform when omitted', async () => {
    const service = buildService();
    await service.registerDeviceToken('user-1', 'fcm-token-abc');
    expect(service.deviceTokenRepo.upsert).toHaveBeenCalledWith(
      'user-1', 'fcm-token-abc', 'android'
    );
  });

  it('propagates repository errors', async () => {
    const service = buildService();
    service.deviceTokenRepo.upsert.mockRejectedValue(new Error('DB error'));
    await expect(service.registerDeviceToken('u', 'tok')).rejects.toThrow('DB error');
  });
});

// ── unregisterDeviceToken ─────────────────────────────────────────────────────

describe('NotificationService.unregisterDeviceToken', () => {
  it('calls deviceTokenRepo.deleteToken with the given token', async () => {
    const service = buildService();
    await service.unregisterDeviceToken('stale-token');
    expect(service.deviceTokenRepo.deleteToken).toHaveBeenCalledWith('stale-token');
  });

  it('propagates repository errors', async () => {
    const service = buildService();
    service.deviceTokenRepo.deleteToken.mockRejectedValue(new Error('Not found'));
    await expect(service.unregisterDeviceToken('tok')).rejects.toThrow('Not found');
  });
});

// ── pushToUser ────────────────────────────────────────────────────────────────

describe('NotificationService.pushToUser', () => {
  beforeEach(() => {
    mockSend.mockReset();
  });

  it('fetches tokens and calls sendEachForMulticast', async () => {
    mockSend.mockResolvedValue({ failureCount: 0, successCount: 1, responses: [{ success: true }] });
    const service = buildService();

    await service.pushToUser('user-1', {
      title: 'Nueva tarea',
      body: 'Tienes una tarea pendiente',
      data: { type: 'task' },
    });

    expect(service.deviceTokenRepo.getByUserId).toHaveBeenCalledWith('user-1');
    expect(mockSend).toHaveBeenCalledTimes(1);

    const payload = mockSend.mock.calls[0][0];
    expect(payload.tokens).toContain('token-A');
    expect(payload.notification.title).toBe('Nueva tarea');
    expect(payload.notification.body).toBe('Tienes una tarea pendiente');
  });

  it('does nothing when user has no registered tokens', async () => {
    const service = buildService();
    service.deviceTokenRepo.getByUserId.mockResolvedValue([]);

    await service.pushToUser('user-no-token', { title: 'Test', body: 'Body' });
    expect(mockSend).not.toHaveBeenCalled();
  });

  it('prunes stale tokens after registration-token-not-registered error', async () => {
    mockSend.mockResolvedValue({
      failureCount: 1,
      successCount: 0,
      responses: [
        {
          success: false,
          error: { code: 'messaging/registration-token-not-registered' },
        },
      ],
    });

    const service = buildService();
    await service.pushToUser('user-1', { title: 'T', body: 'B' });

    expect(service.deviceTokenRepo.deleteToken).toHaveBeenCalledWith('token-A');
  });
});
