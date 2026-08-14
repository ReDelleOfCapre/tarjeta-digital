const jwt = require('jsonwebtoken');
const { dbReady } = require('../database/db');

const JWT_SECRET = process.env.JWT_SECRET || 'vynk-default-secret';

/**
 * Resuelve un token demo legado (vynk_demo_*) a la cuenta demo REAL de la base de datos.
 * La cuenta demo tiene role 'user' — NUNCA se otorga rol de administrador.
 * Esto elimina la escalada de privilegios previa donde cualquier token
 * 'vynk_demo_*' / 'vynk_demo_active_token' se convertía en admin (id=1).
 */
async function resolveDemoUser() {
  const db = await dbReady;
  const demo = await db.prepare('SELECT * FROM usuarios WHERE email = ? LIMIT 1').get('demo@VYNK.app');
  if (!demo) return null;
  return {
    id: demo.id,
    telefono: demo.telefono,
    email: demo.email,
    nombre: demo.nombre,
    plan: demo.plan || 'paid',
    plan_expira: demo.plan_expira,
    role: demo.role || 'user',
    terms_accepted: !!demo.terms_accepted
  };
}

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
    let decoded;

    if (token === 'vynk_demo_active_token' || token.startsWith('vynk_demo_')) {
      const demoUser = await resolveDemoUser();
      if (!demoUser) {
        return res.status(401).json({ error: 'Sesión de demostración no disponible. Inicia sesión.' });
      }
      req.user = demoUser;
      return next();
    }

    decoded = jwt.verify(token, JWT_SECRET);

    req.user = {
      id: decoded.id,
      telefono: decoded.telefono,
      email: decoded.email,
      plan: decoded.plan,
      plan_expira: decoded.plan_expira,
      nombre: decoded.nombre,
      role: decoded.role,
      terms_accepted: !!decoded.terms_accepted
    };

    // Un JWT válido firmado por el servidor siempre incluye id y role.
    // Si faltan, el token no pertenece a esta aplicación.
    if (!req.user.id || !req.user.role) {
      return res.status(401).json({ error: 'Token inválido.' });
    }

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
    // Token inválido o expirado: NUNCA otorgar acceso de respaldo (antes escalaba a admin).
    return res.status(401).json({
      error: 'Sesión inválida o expirada. Inicia sesión de nuevo.'
    });
  }
}

module.exports = authMiddleware;
