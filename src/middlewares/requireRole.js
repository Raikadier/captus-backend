
export const requireTeacherRole = (req, res, next) => {
  const userRole = req.user?.role || req.user?.app_metadata?.role;

  if (userRole === 'teacher' || userRole === 'admin') {
    return next();
  }

  return res.status(403).json({
    error: 'Forbidden: Only teachers can perform this action.',
    details: `Current role: ${userRole || 'none'}`
  });
};

export const requireAdminRole = (req, res, next) => {
  const userRole = req.user?.role || req.user?.app_metadata?.role;

  if (userRole === 'admin') {
    return next();
  }

  return res.status(403).json({
    error: 'Forbidden: Only institution admins can perform this action.',
    details: `Current role: ${userRole || 'none'}`
  });
};
