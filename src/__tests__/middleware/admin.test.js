import { jest } from '@jest/globals';
import { requireAdminRole } from '../../middlewares/requireRole.js';

/**
 * Tests for requireAdminRole middleware.
 */
describe('requireAdminRole middleware', () => {
  const makeRes = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json   = jest.fn().mockReturnValue(res);
    return res;
  };

  const next = jest.fn();

  beforeEach(() => jest.clearAllMocks());

  it('calls next() when user has role=admin via user_metadata', () => {
    const req = { user: { app_metadata: { role: 'admin' } } };
    const res = makeRes();
    requireAdminRole(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('calls next() when role is on user.role directly', () => {
    const req = { user: { role: 'admin' } };
    const res = makeRes();
    requireAdminRole(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('returns 403 when user has role=teacher', () => {
    const req = { user: { role: 'teacher' } };
    const res = makeRes();
    requireAdminRole(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.stringContaining('Forbidden') }),
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 403 when user has role=student', () => {
    const req = { user: { role: 'student' } };
    const res = makeRes();
    requireAdminRole(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 403 when req.user is undefined', () => {
    const req = {};
    const res = makeRes();
    requireAdminRole(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 403 when user has no role field', () => {
    const req = { user: { id: 'some-id' } };
    const res = makeRes();
    requireAdminRole(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });
});
