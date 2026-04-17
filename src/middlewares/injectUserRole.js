import { getSupabaseClient } from '../lib/supabaseAdmin.js';

/**
 * Middleware to fetch full user details (including role) from public.users
 * and attach them to req.user.
 * Requires verifySupabaseToken to have run first (to provide req.user.id).
 */
export async function injectUserRole(req, res, next) {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: 'Unauthorized: No user token found' });
    }

    const supabase = getSupabaseClient();
    const { data: userData, error } = await supabase
      .from('users')
      .select('role, name, email')
      .eq('id', req.user.id)
      .single();

    if (error || !userData) {
      // Fallback: If user not in public.users, they might be new.
      // Default to student or handle error.
      // Current project logic seems to rely on public.users existence.
      console.warn(`User ${req.user.id} not found in public.users, defaulting to student role.`);
      req.user.role = 'student';
    } else {
      req.user.role = userData.role || 'student';
      req.user.name = userData.name;
      // Keep email from token or DB
    }

    next();
  } catch (err) {
    console.error('Error injecting user role:', err);
    res.status(500).json({ error: 'Internal Server Error during auth' });
  }
}
