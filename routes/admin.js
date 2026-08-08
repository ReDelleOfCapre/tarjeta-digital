// ============================================
// VYNK — Admin Routes (Full Dashboard API)
// ============================================
const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { dbReady } = require('../database/db');
const auth = require('../middleware/auth');
const requireAdmin = require('../middleware/requireAdmin');

// ============================================
// Anti-Fuerza Bruta: Rate Limiter de Login Admin
// Bloquea por 15 minutos tras 5 intentos fallidos
// ============================================
const adminLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // 5 intentos
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados intentos fallidos. Tu dirección IP ha sido bloqueada por 15 minutos.' },
  skipSuccessfulRequests: true // Solo cuenta intentos fallidos (401/400)
});

/**
 * POST /api/admin/login
 * Autenticación exclusiva con llave maestra (ADMIN_KEY)
 */
router.post('/login', adminLoginLimiter, (req, res) => {
  const { key } = req.body;
  const masterKey = process.env.ADMIN_KEY || 'admin123';

  if (!key || key !== masterKey) {
    return res.status(401).json({ error: 'Llave maestra de administrador incorrecta.' });
  }

  const payload = {
    id: 1,
    telefono: '2311556138',
    nombre: 'Giovanni Paolo (Admin Master)',
    role: 'admin',
    plan: 'paid'
  };

  const secret = process.env.JWT_SECRET || 'vynk_secret_key';
  const token = jwt.sign(payload, secret, { expiresIn: '7d' });

  res.json({
    ok: true,
    token,
    usuario: payload
  });
});

// ============================================
// Middleware de protección estricta para el resto de rutas /api/admin/*
// ============================================
router.use(auth);
router.use(requireAdmin);

// GET /api/admin/stats — Global statistics
router.get('/stats', async (req, res) => {
  try {
    const db = await dbReady;

    const totalUsuarios = db.prepare('SELECT COUNT(*) as total FROM usuarios').get().total;
    const usuariosFree = db.prepare("SELECT COUNT(*) as total FROM usuarios WHERE plan = 'free'").get().total;
    const usuariosPaid = db.prepare("SELECT COUNT(*) as total FROM usuarios WHERE plan = 'paid'").get().total;
    const totalPerfiles = db.prepare('SELECT COUNT(*) as total FROM perfiles').get().total;
    const totalVisitas = db.prepare('SELECT COALESCE(SUM(visitas), 0) as total FROM perfiles').get().total;
    const totalCampos = db.prepare('SELECT COUNT(*) as total FROM campos_contacto').get().total;

    const ingresosTotal = db.prepare("SELECT COALESCE(SUM(monto), 0) as total FROM pagos WHERE estado = 'aprobado'").get().total;

    const registrosRecientes = db.prepare(`
      SELECT DATE(fecha_registro) as fecha, COUNT(*) as total
      FROM usuarios
      WHERE fecha_registro >= CURRENT_DATE - INTERVAL '7 days'
      GROUP BY DATE(fecha_registro)
      ORDER BY fecha DESC
    `).all();

    res.json({
      usuarios: { total: totalUsuarios, free: usuariosFree, paid: usuariosPaid },
      perfiles: totalPerfiles,
      visitas: totalVisitas,
      campos: totalCampos,
      ingresos: ingresosTotal,
      registros_recientes: registrosRecientes
    });
  } catch (err) {
    console.error('Error en admin stats:', err);
    res.status(500).json({ error: 'Error al obtener estadísticas' });
  }
});

// GET /api/admin/usuarios — List all users
router.get('/usuarios', async (req, res) => {
  try {
    const db = await dbReady;

    const search = req.query.q || '';
    const page = parseInt(req.query.page) || 1;
    const limit = 50;
    const offset = (page - 1) * limit;

    let usuarios, total;
    if (search) {
      const searchPattern = `%${search}%`;
      usuarios = db.prepare(`
        SELECT u.id, u.telefono, u.nombre, u.plan, u.plan_expira, u.role, u.fecha_registro,
               (SELECT COUNT(*) FROM perfiles WHERE usuario_id = u.id) as total_perfiles,
               (SELECT COALESCE(SUM(visitas), 0) FROM perfiles WHERE usuario_id = u.id) as total_visitas
        FROM usuarios u
        WHERE u.nombre LIKE ? OR u.telefono LIKE ?
        ORDER BY u.fecha_registro DESC
        LIMIT ? OFFSET ?
      `).all(searchPattern, searchPattern, limit, offset);
      total = db.prepare('SELECT COUNT(*) as total FROM usuarios WHERE nombre LIKE ? OR telefono LIKE ?')
        .get(searchPattern, searchPattern).total;
    } else {
      usuarios = db.prepare(`
        SELECT u.id, u.telefono, u.nombre, u.plan, u.plan_expira, u.role, u.fecha_registro,
               (SELECT COUNT(*) FROM perfiles WHERE usuario_id = u.id) as total_perfiles,
               (SELECT COALESCE(SUM(visitas), 0) FROM perfiles WHERE usuario_id = u.id) as total_visitas
        FROM usuarios u
        ORDER BY u.fecha_registro DESC
        LIMIT ? OFFSET ?
      `).all(limit, offset);
      total = db.prepare('SELECT COUNT(*) as total FROM usuarios').get().total;
    }

    res.json({ usuarios, total, page, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    console.error('Error al listar usuarios:', err);
    res.status(500).json({ error: 'Error al obtener lista de usuarios' });
  }
});

// GET /api/admin/pagos — List pending payments
router.get('/pagos', async (req, res) => {
  try {
    const db = await dbReady;
    const pagos = db.prepare(`
      SELECT p.*, u.nombre as usuario_nombre, u.telefono as usuario_telefono
      FROM pagos p
      JOIN usuarios u ON p.usuario_id = u.id
      WHERE p.estado = 'pendiente'
      ORDER BY p.fecha_solicitud DESC
    `).all();

    res.json({ pagos });
  } catch (err) {
    console.error('Error al listar pagos:', err);
    res.status(500).json({ error: 'Error al obtener lista de pagos' });
  }
});

// POST /api/admin/pagos/:id/aprobar — Approve payment
router.post('/pagos/:id/aprobar', async (req, res) => {
  try {
    const db = await dbReady;
    const pagoId = parseInt(req.params.id, 10);
    const pago = db.prepare('SELECT * FROM pagos WHERE id = ?').get(pagoId);

    if (!pago) {
      return res.status(404).json({ error: 'Pago no encontrado.' });
    }

    const dias = pago.plan === 'anual' ? 365 : 30;
    const expiraDate = new Date();
    expiraDate.setDate(expiraDate.getDate() + dias);

    db.prepare("UPDATE usuarios SET plan = 'paid', plan_expira = ? WHERE id = ?").run(expiraDate.toISOString(), pago.usuario_id);
    db.prepare("UPDATE pagos SET estado = 'aprobado', aprobado_por = ?, fecha_resolucion = CURRENT_TIMESTAMP WHERE id = ?").run(req.user.id, pagoId);

    res.json({ ok: true, mensaje: `Pago aprobado. Usuario actualizado a PRO por ${dias} días.` });
  } catch (err) {
    console.error('Error al aprobar pago:', err);
    res.status(500).json({ error: 'Error al aprobar pago' });
  }
});

// POST /api/admin/pagos/:id/rechazar — Reject payment
router.post('/pagos/:id/rechazar', async (req, res) => {
  try {
    const db = await dbReady;
    const pagoId = parseInt(req.params.id, 10);
    const { motivo } = req.body;

    const pago = db.prepare('SELECT * FROM pagos WHERE id = ?').get(pagoId);
    if (!pago) {
      return res.status(404).json({ error: 'Pago no encontrado.' });
    }

    db.prepare("UPDATE pagos SET estado = 'rechazado', motivo_rechazo = ?, fecha_resolucion = CURRENT_TIMESTAMP WHERE id = ?").run(motivo || 'Pago rechazado por el administrador', pagoId);

    res.json({ ok: true, mensaje: 'Pago rechazado correctamente.' });
  } catch (err) {
    console.error('Error al rechazar pago:', err);
    res.status(500).json({ error: 'Error al rechazar pago' });
  }
});

// POST /api/admin/usuarios/:id/plan — Change user plan
router.post('/usuarios/:id/plan', async (req, res) => {
  try {
    const db = await dbReady;
    const userId = parseInt(req.params.id, 10);
    const { plan, dias } = req.body;

    if (!['free', 'paid'].includes(plan)) {
      return res.status(400).json({ error: 'Plan inválido. Debe ser free o paid.' });
    }

    let expira = null;
    if (plan === 'paid') {
      const numDias = parseInt(dias) || 30;
      const d = new Date();
      d.setDate(d.getDate() + numDias);
      expira = d.toISOString();
    }

    db.prepare('UPDATE usuarios SET plan = ?, plan_expira = ? WHERE id = ?').run(plan, expira, userId);
    res.json({ ok: true, mensaje: `Plan de usuario ${userId} actualizado a ${plan.toUpperCase()}` });
  } catch (err) {
    console.error('Error al cambiar plan:', err);
    res.status(500).json({ error: 'Error al actualizar plan' });
  }
});

// POST /api/admin/usuarios/:id/reset-quota — Reset action energy quota
router.post('/usuarios/:id/reset-quota', async (req, res) => {
  try {
    const db = await dbReady;
    const userId = parseInt(req.params.id, 10);

    db.prepare("UPDATE usuarios SET acciones_restantes = 10, ultimo_reset = CURRENT_TIMESTAMP WHERE id = ?").run(userId);
    res.json({ ok: true, mensaje: `Energía del usuario ${userId} recargada a 10 acciones.` });
  } catch (err) {
    console.error('Error al recargar cuota:', err);
    res.status(500).json({ error: 'Error al recargar cuota' });
  }
});

// POST /api/admin/usuarios/:id/password — Admin reset user password
router.post('/usuarios/:id/password', async (req, res) => {
  try {
    const db = await dbReady;
    const userId = parseInt(req.params.id, 10);
    const { newPassword } = req.body;
    const bcrypt = require('bcryptjs');

    if (!newPassword || newPassword.length < 4) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 4 caracteres.' });
    }

    const salt = await bcrypt.genSalt(10);
    const passHash = await bcrypt.hash(newPassword, salt);

    db.prepare('UPDATE usuarios SET password_hash = ? WHERE id = ?').run(passHash, userId);
    res.json({ ok: true, mensaje: `Contraseña del usuario ${userId} restablecida con éxito.` });
  } catch (err) {
    console.error('Error al cambiar contraseña:', err);
    res.status(500).json({ error: 'Error al cambiar contraseña' });
  }
});

// GET /api/admin/usuarios/:id/perfiles — View cards for user
router.get('/usuarios/:id/perfiles', async (req, res) => {
  try {
    const db = await dbReady;
    const userId = parseInt(req.params.id, 10);

    const perfiles = db.prepare('SELECT * FROM perfiles WHERE usuario_id = ? ORDER BY id DESC').all(userId);
    const result = perfiles.map(p => {
      const bCount = db.prepare('SELECT COUNT(*) as total FROM bloques WHERE perfil_id = ?').get(p.id).total;
      return { ...p, total_campos: bCount };
    });

    res.json({ perfiles: result });
  } catch (err) {
    console.error('Error obteniendo perfiles de usuario:', err);
    res.status(500).json({ error: 'Error al obtener tarjetas del usuario' });
  }
});

// DELETE /api/admin/perfiles/:id — Delete card as admin
router.delete('/perfiles/:id', async (req, res) => {
  try {
    const db = await dbReady;
    const perfilId = parseInt(req.params.id, 10);

    db.prepare('DELETE FROM bloques WHERE perfil_id = ?').run(perfilId);
    db.prepare('DELETE FROM perfiles WHERE id = ?').run(perfilId);

    res.json({ ok: true, mensaje: 'Tarjeta eliminada permanentemente por administración.' });
  } catch (err) {
    console.error('Error eliminando tarjeta:', err);
    res.status(500).json({ error: 'Error al eliminar tarjeta' });
  }
});

module.exports = router;
