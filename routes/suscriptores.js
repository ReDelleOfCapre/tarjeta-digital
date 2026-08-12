const express = require('express');
const router = express.Router();
const db = require('../database/db');
const auth = require('../middleware/auth');

router.post('/perfiles/:perfilId/suscribir', async (req, res) => {
  const perfilId = parseInt(req.params.perfilId, 10);
  const { email, nombre } = req.body;

  if (!email) return res.status(400).json({ error: 'El email es obligatorio' });

  try {
    await db.prepare(
      'INSERT INTO suscriptores (perfil_id, email, nombre) VALUES (?, ?, ?)'
    ).run(perfilId, email, nombre || null);
    res.status(201).json({ ok: true });
  } catch (err) {
    if (err.message && (err.message.includes('UNIQUE') || err.message.includes('duplicate'))) {
      return res.status(400).json({ error: 'Ya estás suscrito a este perfil.' });
    }
    console.error('Error al suscribir:', err);
    res.status(500).json({ error: 'Error del servidor al intentar suscribirse.' });
  }
});

router.get('/perfiles/:perfilId/suscriptores', auth, async (req, res) => {
  try {
    const perfilId = parseInt(req.params.perfilId, 10);
    const perfil = await db.prepare('SELECT usuario_id FROM perfiles WHERE id = ?').get(perfilId);

    if (!perfil) return res.status(404).json({ error: 'Perfil no encontrado.' });
    if (perfil.usuario_id !== req.user.id) return res.status(403).json({ error: 'Acceso denegado.' });

    const suscriptores = await db.prepare(
      'SELECT * FROM suscriptores WHERE perfil_id = ? ORDER BY fecha DESC'
    ).all(perfilId);

    res.json(suscriptores);
  } catch (err) {
    console.error('Error listando suscriptores:', err);
    res.status(500).json({ error: 'Error al listar suscriptores' });
  }
});

router.delete('/suscriptores/:id', auth, async (req, res) => {
  try {
    const subId = parseInt(req.params.id, 10);
    const sub = await db.prepare(`
      SELECT s.id, p.usuario_id
      FROM suscriptores s
      JOIN perfiles p ON s.perfil_id = p.id
      WHERE s.id = ?
    `).get(subId);

    if (!sub) return res.status(404).json({ error: 'Suscriptor no encontrado.' });
    if (sub.usuario_id !== req.user.id) return res.status(403).json({ error: 'Acceso denegado.' });

    await db.prepare('DELETE FROM suscriptores WHERE id = ?').run(subId);
    res.json({ ok: true, mensaje: 'Suscriptor eliminado correctamente.' });
  } catch (err) {
    console.error('Error eliminando suscriptor:', err);
    res.status(500).json({ error: 'Error al eliminar suscriptor' });
  }
});

module.exports = router;
