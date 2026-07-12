const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const db = require('../database/db');
const auth = require('../middleware/auth');
const checkPlanLimit = require('../middleware/planLimits');

const TIPOS_VALIDOS = [
  'whatsapp', 'telefono', 'email', 'direccion',
  'facebook', 'instagram', 'tiktok', 'linkedin',
  'twitter', 'web', 'otro'
];

/**
 * POST /api/perfiles/:id/campos
 * Crear un nuevo campo de contacto para un perfil.
 */
router.post(
  '/perfiles/:id/campos',
  auth,
  checkPlanLimit('campo'),
  [
    body('tipo')
      .isIn(TIPOS_VALIDOS)
      .withMessage(`Tipo inválido. Tipos permitidos: ${TIPOS_VALIDOS.join(', ')}`),
    body('valor')
      .notEmpty().withMessage('El valor es obligatorio.')
      .trim(),
    body('etiqueta')
      .optional()
      .trim(),
    body('orden')
      .optional()
      .isInt().withMessage('El orden debe ser un número entero.')
      .toInt()
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Datos de campo inválidos.',
        detalles: errors.array().map(e => e.msg)
      });
    }

    const perfilId = parseInt(req.params.id, 10);

    // Verificar que el perfil existe y pertenece al usuario
    const perfil = db.prepare('SELECT * FROM perfiles WHERE id = ?').get(perfilId);
    if (!perfil) {
      return res.status(404).json({ error: 'Perfil no encontrado.' });
    }
    if (perfil.usuario_id !== req.user.id) {
      return res.status(403).json({ error: 'No tienes permiso para modificar este perfil.' });
    }

    const { tipo, valor, etiqueta, orden } = req.body;

    const result = db.prepare(
      'INSERT INTO campos_contacto (perfil_id, tipo, valor, etiqueta, orden) VALUES (?, ?, ?, ?, ?)'
    ).run(perfilId, tipo, valor, etiqueta || null, orden || 0);

    const campo = db.prepare('SELECT * FROM campos_contacto WHERE id = ?').get(result.lastInsertRowid);

    res.status(201).json(campo);
  }
);

/**
 * PUT /api/campos/:id
 * Actualizar un campo de contacto.
 */
router.put(
  '/campos/:id',
  auth,
  [
    body('tipo')
      .optional()
      .isIn(TIPOS_VALIDOS)
      .withMessage(`Tipo inválido. Tipos permitidos: ${TIPOS_VALIDOS.join(', ')}`),
    body('valor')
      .optional()
      .notEmpty().withMessage('El valor no puede estar vacío.')
      .trim(),
    body('etiqueta')
      .optional()
      .trim(),
    body('orden')
      .optional()
      .isInt().withMessage('El orden debe ser un número entero.')
      .toInt()
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Datos de campo inválidos.',
        detalles: errors.array().map(e => e.msg)
      });
    }

    const campoId = parseInt(req.params.id, 10);

    // Buscar campo y verificar propiedad
    const campo = db.prepare(`
      SELECT c.*, p.usuario_id
      FROM campos_contacto c
      JOIN perfiles p ON c.perfil_id = p.id
      WHERE c.id = ?
    `).get(campoId);

    if (!campo) {
      return res.status(404).json({ error: 'Campo no encontrado.' });
    }
    if (campo.usuario_id !== req.user.id) {
      return res.status(403).json({ error: 'No tienes permiso para modificar este campo.' });
    }

    const { tipo, valor, etiqueta, orden } = req.body;

    db.prepare(`
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

    const updated = db.prepare('SELECT * FROM campos_contacto WHERE id = ?').get(campoId);
    res.json(updated);
  }
);

/**
 * DELETE /api/campos/:id
 * Eliminar un campo de contacto.
 */
router.delete('/campos/:id', auth, (req, res) => {
  const campoId = parseInt(req.params.id, 10);

  // Buscar campo y verificar propiedad
  const campo = db.prepare(`
    SELECT c.*, p.usuario_id
    FROM campos_contacto c
    JOIN perfiles p ON c.perfil_id = p.id
    WHERE c.id = ?
  `).get(campoId);

  if (!campo) {
    return res.status(404).json({ error: 'Campo no encontrado.' });
  }
  if (campo.usuario_id !== req.user.id) {
    return res.status(403).json({ error: 'No tienes permiso para eliminar este campo.' });
  }

  db.prepare('DELETE FROM campos_contacto WHERE id = ?').run(campoId);

  res.json({ ok: true, mensaje: 'Campo eliminado correctamente.' });
});

module.exports = router;
