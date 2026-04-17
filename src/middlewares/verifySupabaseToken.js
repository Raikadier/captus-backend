import { requireSupabaseClient } from '../lib/supabaseAdmin.js';

export const buildSupabaseAuthMiddleware = (client = requireSupabaseClient()) => {
  return async (req, res, next) => {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }

    try {
      const { data, error } = await client.auth.getUser(token);
      if (error || !data?.user) {
        return res.status(401).json({ error: 'Invalid token' });
      }

      req.user = {
        id: data.user.id,
        email: data.user.email,
        ...data.user.user_metadata,
      };
      req.accessToken = token;
      return next();
    } catch (error) {
      console.error('verifySupabaseToken error:', error);
      return res.status(401).json({ error: 'Invalid token' });
    }
  };
};

export default buildSupabaseAuthMiddleware;
