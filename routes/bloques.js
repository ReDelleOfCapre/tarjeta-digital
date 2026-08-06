const express = require('express');
const router = express.Router();
const db = require('../database/db');
const auth = require('../middleware/auth');
const requireQuota = require('../middleware/quota');
const { getEmbed } = require('../utils/embeds');

// GET /api/perfiles/:perfilId/bloques
router.get('/perfiles/:perfilId/bloques', auth, (req, res) => {
  const perfilId = parseInt(req.params.perfilId, 10);
  const perfil = db.prepare('SELECT usuario_id FROM perfiles WHERE id = ?').get(perfilId);
  
  if (!perfil) return res.status(404).json({ error: 'Perfil no encontrado.' });
  if (perfil.usuario_id !== req.user.id) return res.status(403).json({ error: 'Acceso denegado.' });
  
  const bloques = db.prepare('SELECT * FROM bloques WHERE perfil_id = ? ORDER BY orden ASC').all(perfilId);
  res.json(bloques);
});

// POST /api/perfiles/:perfilId/bloques
router.post('/perfiles/:perfilId/bloques', auth, requireQuota, (req, res) => {
  const perfilId = parseInt(req.params.perfilId, 10);
  const perfil = db.prepare('SELECT usuario_id FROM perfiles WHERE id = ?').get(perfilId);
  
  if (!perfil) return res.status(404).json({ error: 'Perfil no encontrado.' });
  if (perfil.usuario_id !== req.user.id) return res.status(403).json({ error: 'Acceso denegado.' });
  
  const count = db.prepare('SELECT COUNT(*) as total FROM bloques WHERE perfil_id = ?').get(perfilId).total;
  
  if (req.user.plan !== 'paid' && count >= 6) {
    return res.status(403).json({ error: 'Límite de bloques alcanzado en plan gratuito. Actualiza a premium.' });
  }
  
  const { tipo, contenido } = req.body;
  let parsedContent = typeof contenido === 'string' ? JSON.parse(contenido) : contenido;
  
  if (['spotify', 'youtube', 'tweet', 'tiktok'].includes(tipo)) {
    const embedInfo = getEmbed(parsedContent.url);
    if (embedInfo.html) {
      parsedContent.embed_html = embedInfo.html;
    }
  }
  
  const maxOrden = db.prepare('SELECT MAX(orden) as max FROM bloques WHERE perfil_id = ?').get(perfilId).max || 0;
  
  const result = db.prepare(
    'INSERT INTO bloques (perfil_id, tipo, contenido, orden) VALUES (?, ?, ?, ?)'
  ).run(perfilId, tipo, JSON.stringify(parsedContent), maxOrden + 1);
  
  const newBloque = db.prepare('SELECT * FROM bloques WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(newBloque);
});

// PUT /api/bloques/:id
router.put('/bloques/:id', auth, requireQuota, (req, res) => {
  const bloqueId = parseInt(req.params.id, 10);
  const bloque = db.prepare(`
    SELECT b.*, p.usuario_id 
    FROM bloques b 
    JOIN perfiles p ON b.perfil_id = p.id 
    WHERE b.id = ?
  `).get(bloqueId);
  
  if (!bloque) return res.status(404).json({ error: 'Bloque no encontrado.' });
  if (bloque.usuario_id !== req.user.id) return res.status(403).json({ error: 'Acceso denegado.' });
  
  const { contenido, visible } = req.body;
  let contentToSave = contenido;
  
  if (contenido) {
    let parsedContent = typeof contenido === 'string' ? JSON.parse(contenido) : contenido;
    if (['spotify', 'youtube', 'tweet', 'tiktok'].includes(bloque.tipo) && parsedContent.url) {
      const embedInfo = getEmbed(parsedContent.url);
      if (embedInfo.html) {
        parsedContent.embed_html = embedInfo.html;
      }
    }
    contentToSave = JSON.stringify(parsedContent);
  } else {
    contentToSave = bloque.contenido;
  }
  
  const visibleToSave = visible !== undefined ? visible : bloque.visible;
  
  db.prepare(
    'UPDATE bloques SET contenido = ?, visible = ? WHERE id = ?'
  ).run(contentToSave, visibleToSave, bloqueId);
  
  const updatedBloque = db.prepare('SELECT * FROM bloques WHERE id = ?').get(bloqueId);
  res.json(updatedBloque);
});

// DELETE /api/bloques/:id
router.delete('/bloques/:id', auth, requireQuota, (req, res) => {
  const bloqueId = parseInt(req.params.id, 10);
  const bloque = db.prepare(`
    SELECT b.id, p.usuario_id 
    FROM bloques b 
    JOIN perfiles p ON b.perfil_id = p.id 
    WHERE b.id = ?
  `).get(bloqueId);
  
  if (!bloque) return res.status(404).json({ error: 'Bloque no encontrado.' });
  if (bloque.usuario_id !== req.user.id) return res.status(403).json({ error: 'Acceso denegado.' });
  
  db.prepare('DELETE FROM bloques WHERE id = ?').run(bloqueId);
  res.json({ ok: true, mensaje: 'Bloque eliminado correctamente' });
});

// PUT /api/perfiles/:perfilId/bloques/reorder
router.put('/perfiles/:perfilId/bloques/reorder', auth, requireQuota, (req, res) => {
  const perfilId = parseInt(req.params.perfilId, 10);
  const perfil = db.prepare('SELECT usuario_id FROM perfiles WHERE id = ?').get(perfilId);
  
  if (!perfil) return res.status(404).json({ error: 'Perfil no encontrado.' });
  if (perfil.usuario_id !== req.user.id) return res.status(403).json({ error: 'Acceso denegado.' });
  
  const { orden } = req.body; // array of block ids
  if (!Array.isArray(orden)) {
    return res.status(400).json({ error: 'Formato de orden inválido.' });
  }
  
  const stmt = db.prepare('UPDATE bloques SET orden = ? WHERE id = ? AND perfil_id = ?');
  
  for (let i = 0; i < orden.length; i++) {
    stmt.run(i, orden[i], perfilId);
  }
  
  res.json({ ok: true, mensaje: 'Orden actualizado' });
});

module.exports = router;
