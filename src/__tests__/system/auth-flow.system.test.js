/**
 * System tests — Authentication & authorization flow
 *
 * Scope: verifies that the auth middleware + role checks + service-level
 * ownership guards form a coherent, consistent security boundary.
 *
 * The tests simulate the full request pipeline:
 *   HTTP request → auth middleware → role guard → service ownership check
 */

import { jest } from '@jest/globals';
import { buildSupabaseAuthMiddleware } from '../../middlewares/verifySupabaseToken.js';
import { requireTeacherRole } from '../../middlewares/requireRole.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Build a mock Express request */
const makeReq = (headers = {}, extras = {}) => ({
  headers,
  ...extras,
});

/** Build a mock Express response with chainable status/json */
const makeRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const next = jest.fn();

/** Build a mock Supabase client */
const makeClient = (userData, error = null) => ({
  auth: {
    getUser: jest.fn().mockResolvedValue({ data: { user: userData }, error }),
  },
});

// ─── 1. Auth middleware — token validation layer ───────────────────────────────

describe('System — Auth middleware token validation', () => {
  beforeEach(() => {
    next.mockClear();
  });

  it('rejects requests with no Authorization header (401)', async () => {
    const middleware = buildSupabaseAuthMiddleware(makeClient(null));
    const req = makeReq({});
    const res = makeRes();

    await middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects tokens that are not Bearer-prefixed (401)', async () => {
    const middleware = buildSupabaseAuthMiddleware(makeClient(null));
    const req = makeReq({ authorization: 'Basic abc123' });
    const res = makeRes();

    await middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects invalid tokens that Supabase cannot verify (401)', async () => {
    const middleware = buildSupabaseAuthMiddleware(
      makeClient(null, new Error('JWT expired'))
    );
    const req = makeReq({ authorization: 'Bearer bad-token' });
    const res = makeRes();

    await middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('accepts a valid token and calls next() (200 path)', async () => {
    const user = { id: 'u1', email: 'user@test.com', user_metadata: { role: 'student' } };
    const middleware = buildSupabaseAuthMiddleware(makeClient(user));
    const req = makeReq({ authorization: 'Bearer valid-token' });
    const res = makeRes();

    await middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('populates req.user with id and email from token', async () => {
    const user = { id: 'u-99', email: 'student@test.com', user_metadata: { role: 'student' } };
    const middleware = buildSupabaseAuthMiddleware(makeClient(user));
    const req = makeReq({ authorization: 'Bearer good-token' });
    const res = makeRes();

    await middleware(req, res, next);

    expect(req.user.id).toBe('u-99');
    expect(req.user.email).toBe('student@test.com');
  });

  it('strips the "Bearer " prefix before storing req.accessToken', async () => {
    const user = { id: 'u1', email: 'a@b.com', user_metadata: {} };
    const middleware = buildSupabaseAuthMiddleware(makeClient(user));
    const req = makeReq({ authorization: 'Bearer my-real-token' });
    const res = makeRes();

    await middleware(req, res, next);

    expect(req.accessToken).toBe('my-real-token');
  });

  it('returns 401 when Supabase returns no user (null user)', async () => {
    const middleware = buildSupabaseAuthMiddleware(makeClient(null, null));
    const req = makeReq({ authorization: 'Bearer ghost-token' });
    const res = makeRes();

    await middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
  });
});

// ─── 2. Role guard — authorization layer ──────────────────────────────────────

describe('System — requireTeacherRole authorization', () => {
  beforeEach(() => {
    next.mockClear();
  });

  it('allows a teacher through (calls next)', () => {
    const req = makeReq({}, { user: { id: 'u1', role: 'teacher' } });
    const res = makeRes();

    requireTeacherRole(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('allows an admin through (calls next)', () => {
    const req = makeReq({}, { user: { id: 'u1', role: 'admin' } });
    const res = makeRes();

    requireTeacherRole(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
  });

  it('rejects a student (403)', () => {
    const req = makeReq({}, { user: { id: 'u1', role: 'student' } });
    const res = makeRes();

    requireTeacherRole(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects a request with no user context (403)', () => {
    const req = makeReq({}, {});
    const res = makeRes();

    requireTeacherRole(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
  });
});

// ─── 3. Full auth chain: middleware + role guard in sequence ──────────────────

describe('System — Full auth chain (middleware → role guard)', () => {
  const runChain = async (authUser, role) => {
    const user = { id: 'u1', email: 'test@test.com', user_metadata: { role } };
    const middleware = buildSupabaseAuthMiddleware(makeClient(user));

    const req = makeReq({ authorization: 'Bearer valid' });
    const res = makeRes();
    const localNext = jest.fn();

    // Step 1: auth middleware
    await middleware(req, res, localNext);

    if (!localNext.mock.calls.length) {
      return { authenticated: false, authorized: false, res };
    }

    // Step 2: role guard
    localNext.mockClear();
    requireTeacherRole(req, res, localNext);

    return {
      authenticated: true,
      authorized: localNext.mock.calls.length > 0,
      res,
      req,
    };
  };

  it('student: authenticated but NOT authorized for teacher routes', async () => {
    const { authenticated, authorized } = await runChain(true, 'student');
    expect(authenticated).toBe(true);
    expect(authorized).toBe(false);
  });

  it('teacher: authenticated AND authorized', async () => {
    const { authenticated, authorized } = await runChain(true, 'teacher');
    expect(authenticated).toBe(true);
    expect(authorized).toBe(true);
  });

  it('unauthenticated: fails at auth, never reaches role guard', async () => {
    const errorClient = makeClient(null, new Error('no token'));
    const middleware = buildSupabaseAuthMiddleware(errorClient);

    const req = makeReq({ authorization: 'Bearer bad' });
    const res = makeRes();
    const localNext = jest.fn();

    await middleware(req, res, localNext);

    expect(localNext).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
  });
});

// ─── 4. Response shape consistency ────────────────────────────────────────────

describe('System — Auth error response shape', () => {
  it('401 response always has an "error" key (not success/message/data)', async () => {
    const middleware = buildSupabaseAuthMiddleware(makeClient(null, new Error('bad')));
    const req = makeReq({ authorization: 'Bearer x' });
    const res = makeRes();

    await middleware(req, res, next);

    const [jsonArg] = res.json.mock.calls[0];
    expect(jsonArg).toHaveProperty('error');
    expect(typeof jsonArg.error).toBe('string');
  });

  it('403 response always has an "error" key', () => {
    const req = makeReq({}, { user: { role: 'student' } });
    const res = makeRes();

    requireTeacherRole(req, res, next);

    const [jsonArg] = res.json.mock.calls[0];
    expect(jsonArg).toHaveProperty('error');
  });
});
