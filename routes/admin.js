const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const db = require('../database/db');

/**
 * POST /api/admin/usuarios/:id/plan
 * Cambiar el plan de un usuario (requiere clave admin).
 */
router.post(
  '/usuarios/:id/plan',
  [
    body('plan')
      .isIn(['free', 'paid'])
      .withMessage('Plan inválido. Valores permitidos: free, paid.')
  ],
  (req, res) => {
    // Verificar clave admin
    const adminKey = req.headers['x-admin-key'];
    if (!adminKey || adminKey !== process.env.ADMIN_KEY) {
      return res.status(403).json({ error: 'Clave admin inválida.' });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Datos inválidos.',
        detalles: errors.array().map(e => e.msg)
      });
    }

    const userId = parseInt(req.params.id, 10);
    const { plan } = req.body;

    // Buscar usuario
    const user = db.prepare('SELECT id, nombre, telefono, plan FROM usuarios WHERE id = ?').get(userId);
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }

    // Actualizar plan
    db.prepare('UPDATE usuarios SET plan = ? WHERE id = ?').run(plan, userId);

    res.json({
      ok: true,
      usuario: {
        id: user.id,
        nombre: user.nombre,
        telefono: user.telefono,
        plan
      }
    });
  }
);

module.exports = router;
