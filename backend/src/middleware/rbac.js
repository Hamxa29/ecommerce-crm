export function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user?.role)) {
      return res.status(403).json({ error: 'Insufficient role' });
    }
    next();
  };
}

export function requirePermission(perm) {
  return (req, res, next) => {
    if (req.user?.role === 'ADMIN') return next();
    if (req.user?.permissions?.[perm]) return next();
    res.status(403).json({ error: `Permission denied: ${perm}` });
  };
}
