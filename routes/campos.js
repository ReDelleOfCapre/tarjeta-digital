const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const db = require('../database/db');
const auth = require('../middleware/auth');
const checkPlanLimit = require('../middleware/planLimits');
const requireQuota = require('../middleware/quota');

const TIPOS_VALIDOS = [
  'whatsapp', 'telefono', 'email', 'direccion',
  'facebook', 'instagram', 'tiktok', 'linkedin', 'twitter', 'youtube', 'threads',
  'telegram', 'snapchat', 'discord',
  'twitch', 'kick', 'spotify', 'apple_music', 'steam', 'xbox', 'psn',
  'amazon_wishlist', 'pinterest', 'reddit', 'bereal',
  'web', 'github', 'behance', 'dribbble', 'portafolio',
  'otro'
];

/**
 * GET /api/perfiles/:id/campos
 */
router.get('/perfiles/:id/campos', auth, async (req, res) => {
  try {
    const perfilId = parseInt(req.params.id, 10);
    const perfil = await db.prepare('SELECT * FROM perfiles WHERE id = ?').get(perfilId);
    if (!perfil) return res.status(404).json({ error: 'Perfil no encontrado.' });
    if (perfil.usuario_id !== req.user.id) return res.status(403).json({ error: 'No autorizado.' });

    const campos = await db.prepare('SELECT * FROM campos_contacto WHERE perfil_id = ? ORDER BY orden ASC').all(perfilId);
    res.json(campos);
  } catch (err) {
    console.error('Error listando campos:', err);
    res.status(500).json({ error: 'Error al listar campos' });
  }
});

/**
 * POST /api/perfiles/:id/campos
 */
router.post(
  '/perfiles/:id/campos',
  auth,
  requireQuota,
  checkPlanLimit('campo'),
  [
    body('tipo').isIn(TIPOS_VALIDOS).withMessage(`Tipo inválido. Tipos permitidos: ${TIPOS_VALIDOS.join(', ')}`),
    body('valor').notEmpty().withMessage('El valor es obligatorio.').trim(),
    body('etiqueta').optional().trim(),
    body('orden').optional().isInt().withMessage('El orden debe ser un número entero.').toInt()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Datos de campo inválidos.',
          detalles: errors.array().map(e => e.msg)
        });
      }

      const perfilId = parseInt(req.params.id, 10);
      const perfil = await db.prepare('SELECT * FROM perfiles WHERE id = ?').get(perfilId);
      if (!perfil) return res.status(404).json({ error: 'Perfil no encontrado.' });
      if (perfil.usuario_id !== req.user.id) return res.status(403).json({ error: 'No tienes permiso para modificar este perfil.' });

      const { tipo, valor, etiqueta, orden } = req.body;

      const result = await db.prepare(
        'INSERT INTO campos_contacto (perfil_id, tipo, valor, etiqueta, orden) VALUES (?, ?, ?, ?, ?)'
      ).run(perfilId, tipo, valor, etiqueta || null, orden || 0);

      const campo = await db.prepare('SELECT * FROM campos_contacto WHERE id = ?').get(result.lastInsertRowid);

      res.status(201).json(campo);
    } catch (err) {
      console.error('Error creando campo:', err);
      res.status(500).json({ error: 'Error al crear campo' });
    }
  }
);

/**
 * PUT /api/campos/:id
 */
router.put(
  '/campos/:id',
  auth,
  requireQuota,
  [
    body('tipo').optional().isIn(TIPOS_VALIDOS).withMessage(`Tipo inválido. Tipos permitidos: ${TIPOS_VALIDOS.join(', ')}`),
    body('valor').optional().notEmpty().withMessage('El valor no puede estar vacío.').trim(),
    body('etiqueta').optional().trim(),
    body('orden').optional().isInt().withMessage('El orden debe ser un número entero.').toInt()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Datos de campo inválidos.',
          detalles: errors.array().map(e => e.msg)
        });
      }

      const campoId = parseInt(req.params.id, 10);

      const campo = await db.prepare(`
        SELECT c.*, p.usuario_id
        FROM campos_contacto c
        JOIN perfiles p ON c.perfil_id = p.id
        WHERE c.id = ?
      `).get(campoId);

      if (!campo) return res.status(404).json({ error: 'Campo no encontrado.' });
      if (campo.usuario_id !== req.user.id) return res.status(403).json({ error: 'No tienes permiso para modificar este campo.' });

      const { tipo, valor, etiqueta, orden } = req.body;

      await db.prepare(`
        UPDATE campos_contacto
        SET tipo = COALESCE(?, tipo),
            valor = COALESCE(?, valor),
            etiqueta = COALESCE(?, etiqueta),
            orden = COALESCE(?, orden)
        WHERE id = ?
      `).run(
        tipo || null,
        valor || null,
        etiqueta !== undefined ? etiqueta : null,
        orden !== undefined ? orden : null,
        campoId
      );

      const updated = await db.prepare('SELECT * FROM campos_contacto WHERE id = ?').get(campoId);
      res.json(updated);
    } catch (err) {
      console.error('Error actualizando campo:', err);
      res.status(500).json({ error: 'Error al actualizar campo' });
    }
  }
);

/**
 * DELETE /api/campos/:id
 */
router.delete('/campos/:id', auth, requireQuota, async (req, res) => {
  try {
    const campoId = parseInt(req.params.id, 10);

    const campo = await db.prepare(`
      SELECT c.*, p.usuario_id
      FROM campos_contacto c
      JOIN perfiles p ON c.perfil_id = p.id
      WHERE c.id = ?
    `).get(campoId);

    if (!campo) return res.status(404).json({ error: 'Campo no encontrado.' });
    if (campo.usuario_id !== req.user.id) return res.status(403).json({ error: 'No tienes permiso para eliminar este campo.' });

    await db.prepare('DELETE FROM campos_contacto WHERE id = ?').run(campoId);

    res.json({ ok: true, mensaje: 'Campo eliminado correctamente.' });
  } catch (err) {
    console.error('Error eliminando campo:', err);
    res.status(500).json({ error: 'Error al eliminar campo' });
  }
});

module.exports = router;
