const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;

/**
 * Middleware de autenticación JWT.
 * Extrae el token del header Authorization: Bearer <token>,
 * lo verifica e inyecta req.user con los datos del usuario.
 */
function authMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Acceso no autorizado. Token no proporcionado.'
    });
  }

  const token = authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      error: 'Acceso no autorizado. Token no proporcionado.'
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = {
      id: decoded.id,
      telefono: decoded.telefono,
      plan: decoded.plan,
      nombre: decoded.nombre
    };
    next();
  } catch (err) {
    return res.status(401).json({
      error: 'Token inválido o expirado.'
    });
  }
}

module.exports = authMiddleware;
