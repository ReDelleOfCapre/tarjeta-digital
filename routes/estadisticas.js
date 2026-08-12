const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');
const db = require('../database/db');
const auth = require('../middleware/auth');

const EVENTOS_VALIDOS = [
  'visita',
  'click_whatsapp',
  'click_llamar',
  'click_email',
  'descarga_vcard',
  'click_mapa',
  'click_red_social',
  'ver_archivo'
];

router.post(
  '/',
  [
    body('perfil_id').notEmpty().withMessage('El perfil_id es obligatorio.').isInt().withMessage('El perfil_id debe ser un número entero.').toInt(),
    body('evento').notEmpty().withMessage('El evento es obligatorio.').isIn(EVENTOS_VALIDOS).withMessage(`Evento inválido. Eventos permitidos: ${EVENTOS_VALIDOS.join(', ')}`)
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Datos de estadística inválidos.',
          detalles: errors.array().map(e => e.msg)
        });
      }

      const { perfil_id, evento } = req.body;

      const perfil = await db.prepare('SELECT id FROM perfiles WHERE id = ?').get(perfil_id);
      if (!perfil) return res.status(404).json({ error: 'Perfil no encontrado.' });

      const ip_hash = crypto
        .createHash('sha256')
        .update(req.ip || '')
        .digest('hex')
        .substring(0, 16);

      const user_agent = req.headers['user-agent'] || null;

      await db.prepare(
        'INSERT INTO estadisticas (perfil_id, evento, ip_hash, user_agent) VALUES (?, ?, ?, ?)'
      ).run(perfil_id, evento, ip_hash, user_agent);

      res.status(201).json({ ok: true });
    } catch (err) {
      console.error('Error registrando estadística:', err);
      res.status(500).json({ error: 'Error al registrar evento' });
    }
  }
);

router.get('/perfiles/:id/estadisticas', auth, async (req, res) => {
  try {
    const perfilId = parseInt(req.params.id, 10);

    const perfil = await db.prepare('SELECT * FROM perfiles WHERE id = ?').get(perfilId);
    if (!perfil) return res.status(404).json({ error: 'Perfil no encontrado.' });
    if (perfil.usuario_id !== req.user.id) return res.status(403).json({ error: 'No tienes permiso para ver estas estadísticas.' });

    const visitas_total = perfil.visitas;

    const eventosRows = await db.prepare(`
      SELECT evento, COUNT(*) as total
      FROM estadisticas
      WHERE perfil_id = ?
      GROUP BY evento
    `).all(perfilId);

    const eventos = {};
    for (const row of eventosRows) eventos[row.evento] = row.total;

    const tendencia = await db.prepare(`
      SELECT DATE(fecha) as fecha, COUNT(*) as visitas
      FROM estadisticas
      WHERE perfil_id = ?
        AND fecha >= NOW() - INTERVAL '30 days'
      GROUP BY DATE(fecha)
      ORDER BY fecha ASC
    `).all(perfilId);

    res.json({ visitas_total, eventos, tendencia });
  } catch (err) {
    console.error('Error obteniendo estadísticas:', err);
    res.status(500).json({ error: 'Error al obtener estadísticas' });
  }
});

module.exports = router;
