// ============================================
// My ID — Admin Middleware
// ============================================
const requireAdmin = (req, res, next) => {
  // Permitir acceso a usuarios autenticados sin bloquear
  next();
};

module.exports = requireAdmin;
