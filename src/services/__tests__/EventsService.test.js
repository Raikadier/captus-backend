import { jest } from '@jest/globals';
import { EventsService } from '../EventsService.js';
import { OperationResult } from '../../shared/OperationResult.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

const makeMockRepo = () => ({
  save: jest.fn(),
  getById: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  getAllByUserId: jest.fn(),
  getByDateRange: jest.fn(),
  getUpcomingByUserId: jest.fn(),
});

const validEvent = () => ({
  title: 'Examen Parcial',
  start_date: '2099-06-01T10:00:00Z',
  type: 'academic',
});

// ── validateEvent ─────────────────────────────────────────────────────────────

describe('EventsService.validateEvent', () => {
  let service;

  beforeEach(() => {
    service = new EventsService(makeMockRepo());
  });

  it('fails when event is null', () => {
    const r = service.validateEvent(null);
    expect(r.success).toBe(false);
    expect(r.message).toMatch(/nulo/i);
  });

  it('fails when title is empty', () => {
    const r = service.validateEvent({ title: '', start_date: '2099-01-01', type: 'personal' });
    expect(r.success).toBe(false);
    expect(r.message).toMatch(/título/i);
  });

  it('fails when start_date is missing', () => {
    const r = service.validateEvent({ title: 'Test', type: 'personal' });
    expect(r.success).toBe(false);
    expect(r.message).toMatch(/start_date|inicio/i);
  });

  it('fails when type is missing', () => {
    const r = service.validateEvent({ title: 'Test', start_date: '2099-01-01', type: '' });
    expect(r.success).toBe(false);
    expect(r.message).toMatch(/tipo/i);
  });

  it('fails when end_date is before start_date', () => {
    const r = service.validateEvent({
      title: 'Test',
      start_date: '2099-06-10T10:00:00Z',
      end_date: '2099-06-01T10:00:00Z',
      type: 'personal',
    });
    expect(r.success).toBe(false);
    expect(r.message).toMatch(/fin.*inicio|anterior/i);
  });

  it('succeeds for a valid event', () => {
    const r = service.validateEvent(validEvent());
    expect(r.success).toBe(true);
  });

  it('succeeds when end_date equals start_date', () => {
    const r = service.validateEvent({
      ...validEvent(),
      end_date: '2099-06-01T10:00:00Z',
    });
    expect(r.success).toBe(true);
  });
});

// ── save / create ─────────────────────────────────────────────────────────────

describe('EventsService.save', () => {
  let repo;
  let service;
  const SAVED = { id: 'evt-1', title: 'Examen Parcial', notify: false };

  beforeEach(() => {
    repo = makeMockRepo();
    repo.save.mockResolvedValue(SAVED);
    service = new EventsService(repo);
  });

  it('returns success when event and userId are valid (string userId)', async () => {
    const r = await service.save(validEvent(), 'user-abc');
    expect(r.success).toBe(true);
    expect(r.data).toEqual(SAVED);
    expect(repo.save).toHaveBeenCalledTimes(1);
  });

  // Critical regression test: userId passed as object { id: '...' }
  it('normalises userId when passed as an object', async () => {
    const r = await service.save(validEvent(), { id: 'user-abc', email: 'a@b.com' });
    expect(r.success).toBe(true);
    // event.user_id should be the string, not the object
    const savedPayload = repo.save.mock.calls[0][0];
    expect(savedPayload.user_id).toBe('user-abc');
  });

  it('fails when userId is missing', async () => {
    const r = await service.save(validEvent(), null);
    expect(r.success).toBe(false);
    expect(r.message).toMatch(/autenticado/i);
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('fails when title is empty', async () => {
    const r = await service.save({ title: '', start_date: '2099-01-01', type: 'personal' }, 'user-1');
    expect(r.success).toBe(false);
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('returns failure when repo.save returns falsy', async () => {
    repo.save.mockResolvedValue(null);
    const r = await service.save(validEvent(), 'user-1');
    expect(r.success).toBe(false);
  });

  it('returns failure result when repo.save throws', async () => {
    repo.save.mockRejectedValue(new Error('DB down'));
    const r = await service.save(validEvent(), 'user-1');
    expect(r.success).toBe(false);
    expect(r.message).toMatch(/DB down/);
  });
});

// ── getAll ────────────────────────────────────────────────────────────────────

describe('EventsService.getAll', () => {
  let repo;
  let service;

  beforeEach(() => {
    repo = makeMockRepo();
    repo.getAllByUserId.mockResolvedValue([{ id: 'e1' }, { id: 'e2' }]);
    service = new EventsService(repo);
  });

  it('returns a list of events for a valid userId', async () => {
    const r = await service.getAll('user-1');
    expect(r.success).toBe(true);
    expect(r.data).toHaveLength(2);
  });

  it('fails when userId is null', async () => {
    const r = await service.getAll(null);
    expect(r.success).toBe(false);
    expect(r.message).toMatch(/autenticado/i);
  });
});

// ── getById ───────────────────────────────────────────────────────────────────

describe('EventsService.getById', () => {
  let repo;
  let service;

  beforeEach(() => {
    repo = makeMockRepo();
    repo.getById.mockResolvedValue({ id: 'evt-1', user_id: 'user-1', title: 'Test' });
    service = new EventsService(repo);
  });

  it('returns the event when owner matches', async () => {
    const r = await service.getById('evt-1', 'user-1');
    expect(r.success).toBe(true);
    expect(r.data.id).toBe('evt-1');
  });

  it('returns not accessible when owner does not match', async () => {
    const r = await service.getById('evt-1', 'other-user');
    expect(r.success).toBe(false);
    expect(r.message).toMatch(/accesible|acceso/i);
  });

  it('returns not found when repo returns null', async () => {
    repo.getById.mockResolvedValue(null);
    const r = await service.getById('evt-999', 'user-1');
    expect(r.success).toBe(false);
    expect(r.message).toMatch(/encontrado/i);
  });

  it('fails when id is missing', async () => {
    const r = await service.getById(null, 'user-1');
    expect(r.success).toBe(false);
  });
});

// ── delete ────────────────────────────────────────────────────────────────────

describe('EventsService.delete', () => {
  let repo;
  let service;

  beforeEach(() => {
    repo = makeMockRepo();
    repo.getById.mockResolvedValue({ id: 'evt-1', user_id: 'user-1', title: 'Test' });
    repo.delete.mockResolvedValue(true);
    service = new EventsService(repo);
  });

  it('deletes the event when owner matches', async () => {
    const r = await service.delete('evt-1', 'user-1');
    expect(r.success).toBe(true);
    expect(repo.delete).toHaveBeenCalledWith('evt-1');
  });

  it('fails when owner does not match', async () => {
    const r = await service.delete('evt-1', 'wrong-user');
    expect(r.success).toBe(false);
    expect(repo.delete).not.toHaveBeenCalled();
  });

  it('fails when event not found', async () => {
    repo.getById.mockResolvedValue(null);
    const r = await service.delete('evt-999', 'user-1');
    expect(r.success).toBe(false);
    expect(r.message).toMatch(/encontrado/i);
  });
});

// ── getUpcoming ───────────────────────────────────────────────────────────────

describe('EventsService.getUpcoming', () => {
  let repo;
  let service;

  beforeEach(() => {
    repo = makeMockRepo();
    repo.getUpcomingByUserId.mockResolvedValue([{ id: 'evt-1' }]);
    service = new EventsService(repo);
  });

  it('returns upcoming events for string userId', async () => {
    const r = await service.getUpcoming({}, 'user-1');
    expect(r.success).toBe(true);
    expect(r.data).toHaveLength(1);
  });

  // Critical regression test: AI tools pass userId as object
  it('normalises userId when passed as an object', async () => {
    const r = await service.getUpcoming({}, { id: 'user-1' });
    expect(r.success).toBe(true);
    expect(repo.getUpcomingByUserId).toHaveBeenCalledWith('user-1', null);
  });

  it('respects limit option', async () => {
    await service.getUpcoming({ limit: 5 }, 'user-1');
    expect(repo.getUpcomingByUserId).toHaveBeenCalledWith('user-1', 5);
  });

  it('fails when userId is null', async () => {
    const r = await service.getUpcoming({}, null);
    expect(r.success).toBe(false);
    expect(r.message).toMatch(/autenticado/i);
  });
});
