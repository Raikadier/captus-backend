import { jest } from '@jest/globals';
import { buildSupabaseAuthMiddleware } from '../../middlewares/verifySupabaseToken.js';
import { requireTeacherRole } from '../../middlewares/requireRole.js';

/**
 * Tests for authentication and authorization middleware.
 *
 * verifySupabaseToken: validates Bearer JWT token from Supabase
 * requireTeacherRole: enforces that the user has the 'teacher' or 'admin' role
 */
describe('Auth Middleware Tests', () => {
  // =========================================================================
  // HELPERS
  // =========================================================================
  const makeReq = (token = null, user = null) => ({
    headers: token ? { authorization: `Bearer ${token}` } : {},
    user,
  });

  const makeRes = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
  };

  const next = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // =========================================================================
  // verifySupabaseToken (buildSupabaseAuthMiddleware)
  // =========================================================================
  describe('buildSupabaseAuthMiddleware', () => {
    it('should return 401 if Authorization header is missing', async () => {
      const mockClient = {};
      const middleware = buildSupabaseAuthMiddleware(mockClient);

      const req = { headers: {} };
      const res = makeRes();

      await middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Access token required' });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 if token is invalid', async () => {
      const mockClient = {
        auth: {
          getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: new Error('invalid') }),
        },
      };
      const middleware = buildSupabaseAuthMiddleware(mockClient);

      const req = makeReq('bad-token');
      const res = makeRes();

      await middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid token' });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 if Supabase returns no user', async () => {
      const mockClient = {
        auth: {
          getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null }),
        },
      };
      const middleware = buildSupabaseAuthMiddleware(mockClient);

      const req = makeReq('some-token');
      const res = makeRes();

      await middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });

    it('should call next() and attach req.user if token is valid', async () => {
      const fakeUser = {
        id: 'user-uuid-001',
        email: 'user@example.com',
        user_metadata: { name: 'Test User', role: 'student' },
      };
      const mockClient = {
        auth: {
          getUser: jest.fn().mockResolvedValue({ data: { user: fakeUser }, error: null }),
        },
      };
      const middleware = buildSupabaseAuthMiddleware(mockClient);

      const req = makeReq('valid-token');
      const res = makeRes();

      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.user).toMatchObject({ id: 'user-uuid-001', email: 'user@example.com' });
      expect(req.accessToken).toBe('valid-token');
    });

    it('should return 401 if getUser throws an exception', async () => {
      const mockClient = {
        auth: {
          getUser: jest.fn().mockRejectedValue(new Error('Network error')),
        },
      };
      const middleware = buildSupabaseAuthMiddleware(mockClient);

      const req = makeReq('some-token');
      const res = makeRes();

      await middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });

    it('should strip Bearer prefix from token before passing to Supabase', async () => {
      const mockClient = {
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: {
              user: { id: 'u1', email: 'u@e.com', user_metadata: {} },
            },
            error: null,
          }),
        },
      };
      const middleware = buildSupabaseAuthMiddleware(mockClient);
      const req = makeReq('my-actual-token');
      const res = makeRes();

      await middleware(req, res, next);

      expect(mockClient.auth.getUser).toHaveBeenCalledWith('my-actual-token');
    });
  });

  // =========================================================================
  // requireTeacherRole
  // =========================================================================
  describe('requireTeacherRole', () => {
    it('should call next() if user has role teacher', () => {
      const req = { user: { role: 'teacher' } };
      const res = makeRes();

      requireTeacherRole(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should call next() if user has role admin', () => {
      const req = { user: { role: 'admin' } };
      const res = makeRes();

      requireTeacherRole(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should return 403 if user has role student', () => {
      const req = { user: { role: 'student' } };
      const res = makeRes();

      requireTeacherRole(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.stringContaining('Forbidden') }));
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 403 if req.user is undefined', () => {
      const req = {};
      const res = makeRes();

      requireTeacherRole(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 403 if role is missing', () => {
      const req = { user: { email: 'test@test.com' } };
      const res = makeRes();

      requireTeacherRole(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });

    it('should check app_metadata.role as fallback', () => {
      const req = { user: { app_metadata: { role: 'teacher' } } };
      const res = makeRes();

      requireTeacherRole(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });
});
