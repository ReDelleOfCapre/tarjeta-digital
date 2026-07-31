const express = require('express');
const router = express.Router();
const db = require('../database/db');
const auth = require('../middleware/auth');

// POST /api/perfiles/:perfilId/suscribir (public)
router.post('/perfiles/:perfilId/suscribir', (req, res) => {
  const perfilId = parseInt(req.params.perfilId, 10);
  const { email, nombre } = req.body;
  
  if (!email) return res.status(400).json({ error: 'El email es obligatorio' });
  
  try {
    db.prepare(
      'INSERT INTO suscriptores (perfil_id, email, nombre) VALUES (?, ?, ?)'
    ).run(perfilId, email, nombre || null);
    res.status(201).json({ ok: true });
  } catch (err) {
    if (err.message && err.message.includes('UNIQUE constraint failed')) {
      return res.status(400).json({ error: 'Ya estás suscrito a este perfil.' });
    }
    console.error('Error al suscribir:', err);
    res.status(500).json({ error: 'Error del servidor al intentar suscribirse.' });
  }
});

// GET /api/perfiles/:perfilId/suscriptores (auth required)
router.get('/perfiles/:perfilId/suscriptores', auth, (req, res) => {
  const perfilId = parseInt(req.params.perfilId, 10);
  const perfil = db.prepare('SELECT usuario_id FROM perfiles WHERE id = ?').get(perfilId);
  
  if (!perfil) return res.status(404).json({ error: 'Perfil no encontrado.' });
  if (perfil.usuario_id !== req.user.id) return res.status(403).json({ error: 'Acceso denegado.' });
  
  const suscriptores = db.prepare(
    'SELECT * FROM suscriptores WHERE perfil_id = ? ORDER BY fecha DESC'
  ).all(perfilId);
  
  res.json(suscriptores);
});

// DELETE /api/suscriptores/:id (auth required)
router.delete('/suscriptores/:id', auth, (req, res) => {
  const subId = parseInt(req.params.id, 10);
  const sub = db.prepare(`
    SELECT s.id, p.usuario_id 
    FROM suscriptores s 
    JOIN perfiles p ON s.perfil_id = p.id 
    WHERE s.id = ?
  `).get(subId);
  
  if (!sub) return res.status(404).json({ error: 'Suscriptor no encontrado.' });
  if (sub.usuario_id !== req.user.id) return res.status(403).json({ error: 'Acceso denegado.' });
  
  db.prepare('DELETE FROM suscriptores WHERE id = ?').run(subId);
  res.json({ ok: true, mensaje: 'Suscriptor eliminado correctamente.' });
});

module.exports = router;
