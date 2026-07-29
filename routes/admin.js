// ============================================
// My ID — Admin Routes (Full Dashboard API)
// ============================================
const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { dbReady } = require('../database/db');
const auth = require('../middleware/auth');
const requireAdmin = require('../middleware/requireAdmin');

// All admin routes require auth + admin role
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

    // Últimos 7 días de registros
    const registrosRecientes = db.prepare(`
      SELECT DATE(fecha_registro) as fecha, COUNT(*) as total
      FROM usuarios
      WHERE fecha_registro >= datetime('now', '-7 days')
      GROUP BY DATE(fecha_registro)
      ORDER BY fecha DESC
    `).all();

    res.json({
      usuarios: { total: totalUsuarios, free: usuariosFree, paid: usuariosPaid },
      perfiles: totalPerfiles,
      visitas: totalVisitas,
      campos: totalCampos,
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
    const limit = 20;
    const offset = (page - 1) * limit;

    let usuarios, total;
    if (search) {
      const searchPattern = `%${search}%`;
      usuarios = db.prepare(`
        SELECT u.id, u.telefono, u.nombre, u.plan, u.role, u.fecha_registro,
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
        SELECT u.id, u.telefono, u.nombre, u.plan, u.role, u.fecha_registro,
               (SELECT COUNT(*) FROM perfiles WHERE usuario_id = u.id) as total_perfiles,
               (SELECT COALESCE(SUM(visitas), 0) FROM perfiles WHERE usuario_id = u.id) as total_visitas
        FROM usuarios u
        ORDER BY u.fecha_registro DESC
        LIMIT ? OFFSET ?
      `).all(limit, offset);
      total = db.prepare('SELECT COUNT(*) as total FROM usuarios').get().total;
    }

    res.json({ usuarios, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    console.error('Error listando usuarios:', err);
    res.status(500).json({ error: 'Error al listar usuarios' });
  }
});

// POST /api/admin/usuarios/:id/plan — Toggle user plan
router.post('/usuarios/:id/plan', [
  body('plan').isIn(['free', 'paid']).withMessage('Plan debe ser free o paid')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array()[0].msg });
    }

    const db = await dbReady;
    const userId = parseInt(req.params.id);
    const { plan } = req.body;

    const user = db.prepare('SELECT id, nombre, telefono, plan, role FROM usuarios WHERE id = ?').get(userId);
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    db.prepare('UPDATE usuarios SET plan = ? WHERE id = ?').run(plan, userId);

    res.json({
      ok: true,
      usuario: { id: user.id, nombre: user.nombre, telefono: user.telefono, plan, role: user.role }
    });
  } catch (err) {
    console.error('Error actualizando plan:', err);
    res.status(500).json({ error: 'Error al actualizar plan' });
  }
});

// GET /api/admin/usuarios/:id/perfiles — List user's profiles
router.get('/usuarios/:id/perfiles', async (req, res) => {
  try {
    const db = await dbReady;
    const userId = parseInt(req.params.id);
    const perfiles = db.prepare(`
      SELECT p.*,
        (SELECT COUNT(*) FROM campos_contacto WHERE perfil_id = p.id) as total_campos,
        (SELECT COUNT(*) FROM archivos WHERE perfil_id = p.id) as total_archivos
      FROM perfiles p WHERE p.usuario_id = ?
      ORDER BY p.fecha_creacion DESC
    `).all(userId);

    res.json({ perfiles });
  } catch (err) {
    console.error('Error listando perfiles:', err);
    res.status(500).json({ error: 'Error al listar perfiles' });
  }
});

module.exports = router;
