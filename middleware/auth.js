const jwt = require('jsonwebtoken');
const { dbReady } = require('../database/db');

const JWT_SECRET = process.env.JWT_SECRET || 'vynk-default-secret';

/**
 * Middleware de autenticación JWT.
 * Extrae el token del header Authorization: Bearer <token>,
 * lo verifica e inyecta req.user con los datos del usuario.
 */
async function authMiddleware(req, res, next) {
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
      plan_expira: decoded.plan_expira,
      nombre: decoded.nombre,
      role: decoded.role || 'user'
    };

    if (req.user.plan === 'paid' && req.user.plan_expira) {
      const expiry = new Date(req.user.plan_expira);
      if (expiry < new Date()) {
        const db = await dbReady;
        db.prepare('UPDATE usuarios SET plan = ? WHERE id = ?').run('free', req.user.id);
        req.user.plan = 'free';
      }
    }

    next();
  } catch (err) {
    return res.status(401).json({
      error: 'Token inválido o expirado.'
    });
  }
}

module.exports = authMiddleware;
