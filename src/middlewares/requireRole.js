
export const requireTeacherRole = (req, res, next) => {
  // Assuming the role is stored in user_metadata and thus in req.user
  // Adjust the role string ('teacher') based on your actual Supabase role values
  const userRole = req.user?.role || req.user?.app_metadata?.role; // Check both metadata locations

  if (userRole === 'teacher' || userRole === 'admin') {
    return next();
  }

  return res.status(403).json({
    error: 'Forbidden: Only teachers can perform this action.',
    details: `Current role: ${userRole || 'none'}`
  });
};
