import { jest } from '@jest/globals';
import { NotesService } from '../NotesService.js';
import { OperationResult } from '../../shared/OperationResult.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

const makeMockRepo = () => ({
  save: jest.fn(),
  getById: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  getAllByUserId: jest.fn(),
  togglePin: jest.fn(),
});

const validNote = () => ({ title: 'Apuntes de Cálculo', content: 'Derivadas...' });

// ── validateNote ──────────────────────────────────────────────────────────────

describe('NotesService.validateNote', () => {
  let service;

  beforeEach(() => {
    service = new NotesService(makeMockRepo());
  });

  it('fails when note is null', () => {
    const r = service.validateNote(null);
    expect(r.success).toBe(false);
    expect(r.message).toMatch(/nula/i);
  });

  it('fails when title is empty on creation', () => {
    const r = service.validateNote({ title: '   ' });
    expect(r.success).toBe(false);
    expect(r.message).toMatch(/título/i);
  });

  it('succeeds for a valid new note', () => {
    const r = service.validateNote(validNote());
    expect(r.success).toBe(true);
  });

  it('fails on update when no fields are provided', () => {
    const r = service.validateNote({}, true);
    expect(r.success).toBe(false);
    expect(r.message).toMatch(/cambios/i);
  });

  it('succeeds on update when at least one field is provided', () => {
    const r = service.validateNote({ title: 'Nuevo título' }, true);
    expect(r.success).toBe(true);
  });

  it('succeeds on update when only content is provided', () => {
    const r = service.validateNote({ content: 'Nuevo contenido' }, true);
    expect(r.success).toBe(true);
  });
});

// ── save ──────────────────────────────────────────────────────────────────────

describe('NotesService.save', () => {
  let repo;
  let service;
  const SAVED = { id: 'note-1', title: 'Apuntes de Cálculo' };

  beforeEach(() => {
    repo = makeMockRepo();
    repo.save.mockResolvedValue(SAVED);
    service = new NotesService(repo);
  });

  it('returns success for a valid note with string userId', async () => {
    const r = await service.save(validNote(), 'user-abc');
    expect(r.success).toBe(true);
    expect(r.data).toEqual(SAVED);
  });

  // Critical regression test: AI tools pass userId as an object
  it('normalises userId when passed as an object', async () => {
    const r = await service.save(validNote(), { id: 'user-abc', email: 'a@b.com' });
    expect(r.success).toBe(true);
    const savedPayload = repo.save.mock.calls[0][0];
    expect(savedPayload.user_id).toBe('user-abc');
    expect(typeof savedPayload.user_id).toBe('string');
  });

  it('fails when userId is null', async () => {
    const r = await service.save(validNote(), null);
    expect(r.success).toBe(false);
    expect(r.message).toMatch(/autenticado/i);
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('fails when title is empty', async () => {
    const r = await service.save({ title: '' }, 'user-1');
    expect(r.success).toBe(false);
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('returns failure when repo.save returns null', async () => {
    repo.save.mockResolvedValue(null);
    const r = await service.save(validNote(), 'user-1');
    expect(r.success).toBe(false);
  });

  it('returns failure result when repo.save throws', async () => {
    repo.save.mockRejectedValue(new Error('Connection lost'));
    const r = await service.save(validNote(), 'user-1');
    expect(r.success).toBe(false);
    expect(r.message).toMatch(/Connection lost/);
  });
});

// ── getAll ────────────────────────────────────────────────────────────────────

describe('NotesService.getAll', () => {
  let repo;
  let service;

  beforeEach(() => {
    repo = makeMockRepo();
    repo.getAllByUserId.mockResolvedValue([{ id: 'n1' }, { id: 'n2' }]);
    service = new NotesService(repo);
  });

  it('returns all notes for a valid string userId', async () => {
    const r = await service.getAll('user-1');
    expect(r.success).toBe(true);
    expect(r.data).toHaveLength(2);
    expect(repo.getAllByUserId).toHaveBeenCalledWith('user-1');
  });

  // Critical regression test: AI tools pass { id: '...' }
  it('normalises userId when passed as an object', async () => {
    const r = await service.getAll({ id: 'user-1' });
    expect(r.success).toBe(true);
    expect(repo.getAllByUserId).toHaveBeenCalledWith('user-1');
  });

  it('fails when userId is null', async () => {
    const r = await service.getAll(null);
    expect(r.success).toBe(false);
    expect(r.message).toMatch(/autenticado/i);
  });
});

// ── getById ───────────────────────────────────────────────────────────────────

describe('NotesService.getById', () => {
  let repo;
  let service;

  beforeEach(() => {
    repo = makeMockRepo();
    repo.getById.mockResolvedValue({ id: 'note-1', user_id: 'user-1', title: 'Test' });
    service = new NotesService(repo);
  });

  it('returns the note when ownership matches', async () => {
    const r = await service.getById('note-1', 'user-1');
    expect(r.success).toBe(true);
    expect(r.data.id).toBe('note-1');
  });

  it('fails when another user tries to access the note', async () => {
    const r = await service.getById('note-1', 'hacker-user');
    expect(r.success).toBe(false);
    expect(r.message).toMatch(/accesible|acceso/i);
  });

  it('returns not found when repo returns null', async () => {
    repo.getById.mockResolvedValue(null);
    const r = await service.getById('note-999', 'user-1');
    expect(r.success).toBe(false);
    expect(r.message).toMatch(/encontrada/i);
  });

  it('fails when id is missing', async () => {
    const r = await service.getById(null, 'user-1');
    expect(r.success).toBe(false);
  });
});

// ── update ────────────────────────────────────────────────────────────────────

describe('NotesService.update', () => {
  let repo;
  let service;

  beforeEach(() => {
    repo = makeMockRepo();
    repo.getById.mockResolvedValue({ id: 'note-1', user_id: 'user-1', title: 'Original' });
    repo.update.mockResolvedValue({ id: 'note-1', title: 'Updated' });
    service = new NotesService(repo);
  });

  it('updates the note when owner matches (string userId)', async () => {
    const r = await service.update({ id: 'note-1', title: 'Updated' }, 'user-1');
    expect(r.success).toBe(true);
    expect(r.data.title).toBe('Updated');
  });

  // Critical regression test: resolvedId used in ownership check
  it('normalises userId when passed as an object', async () => {
    const r = await service.update({ id: 'note-1', title: 'Updated' }, { id: 'user-1' });
    expect(r.success).toBe(true);
  });

  it('fails when owner does not match', async () => {
    const r = await service.update({ id: 'note-1', title: 'Hacked' }, 'wrong-user');
    expect(r.success).toBe(false);
    expect(repo.update).not.toHaveBeenCalled();
  });

  it('fails when note is not found', async () => {
    repo.getById.mockResolvedValue(null);
    const r = await service.update({ id: 'note-999', title: 'Title' }, 'user-1');
    expect(r.success).toBe(false);
    expect(r.message).toMatch(/encontrada/i);
  });

  it('fails when no update fields are provided', async () => {
    const r = await service.update({ id: 'note-1' }, 'user-1');
    expect(r.success).toBe(false);
    expect(repo.update).not.toHaveBeenCalled();
  });
});

// ── delete ────────────────────────────────────────────────────────────────────

describe('NotesService.delete', () => {
  let repo;
  let service;

  beforeEach(() => {
    repo = makeMockRepo();
    repo.getById.mockResolvedValue({ id: 'note-1', user_id: 'user-1', title: 'Test' });
    repo.delete.mockResolvedValue(true);
    service = new NotesService(repo);
  });

  it('deletes the note when owner matches', async () => {
    const r = await service.delete('note-1', 'user-1');
    expect(r.success).toBe(true);
    expect(repo.delete).toHaveBeenCalledWith('note-1');
  });

  it('fails when owner does not match', async () => {
    const r = await service.delete('note-1', 'wrong-user');
    expect(r.success).toBe(false);
    expect(repo.delete).not.toHaveBeenCalled();
  });

  it('fails when note is not found', async () => {
    repo.getById.mockResolvedValue(null);
    const r = await service.delete('note-999', 'user-1');
    expect(r.success).toBe(false);
  });

  it('fails when id is missing', async () => {
    const r = await service.delete(null, 'user-1');
    expect(r.success).toBe(false);
  });
});
