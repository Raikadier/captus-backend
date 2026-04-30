/**
 * requireSuperAdminRole
 * ---------------------
 * Middleware that only allows requests from users with role === 'superadmin'.
 * Must be used AFTER verifySupabaseToken + injectUserRole so req.user is populated.
 */
export const requireSuperAdminRole = (req, res, next) => {
  const role = req.user?.role ?? req.user?.app_metadata?.role;
  if (role === 'superadmin') return next();
  return res.status(403).json({ error: 'Acceso denegado. Se requiere rol superadmin.' });
};

export default requireSuperAdminRole;
