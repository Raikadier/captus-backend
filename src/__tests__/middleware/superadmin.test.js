import { jest } from '@jest/globals';
import { requireSuperAdminRole } from '../../middlewares/requireSuperAdminRole.js';

const makeReq = (role) => ({ user: { id: 'u1', role } });
const makeRes = () => {
  const res = {};
  res.status = jest.fn(() => res);
  res.json   = jest.fn(() => res);
  return res;
};

describe('requireSuperAdminRole middleware', () => {
  it('passes superadmin through', () => {
    const next = jest.fn();
    requireSuperAdminRole(makeReq('superadmin'), makeRes(), next);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('blocks admin (403)', () => {
    const res = makeRes();
    requireSuperAdminRole(makeReq('admin'), res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('blocks teacher (403)', () => {
    const res = makeRes();
    requireSuperAdminRole(makeReq('teacher'), res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('blocks student (403)', () => {
    const res = makeRes();
    requireSuperAdminRole(makeReq('student'), res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('blocks request with no user (403)', () => {
    const res = makeRes();
    requireSuperAdminRole({}, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('reads role from app_metadata when role field absent', () => {
    const next = jest.fn();
    const req = { user: { app_metadata: { role: 'superadmin' } } };
    requireSuperAdminRole(req, makeRes(), next);
    expect(next).toHaveBeenCalledTimes(1);
  });
});
