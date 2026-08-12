const express = require('express');
const router = express.Router();
const db = require('../database/db');
const auth = require('../middleware/auth');
const requireQuota = require('../middleware/quota');
const { getEmbed } = require('../utils/embeds');

router.get('/perfiles/:perfilId/bloques', auth, async (req, res) => {
  try {
    const perfilId = parseInt(req.params.perfilId, 10);
    const perfil = await db.prepare('SELECT usuario_id FROM perfiles WHERE id = ?').get(perfilId);

    if (!perfil) return res.status(404).json({ error: 'Perfil no encontrado.' });
    if (perfil.usuario_id !== req.user.id) return res.status(403).json({ error: 'Acceso denegado.' });

    const bloques = await db.prepare('SELECT * FROM bloques WHERE perfil_id = ? ORDER BY orden ASC').all(perfilId);
    res.json(bloques);
  } catch (err) {
    console.error('Error listando bloques:', err);
    res.status(500).json({ error: 'Error al listar bloques' });
  }
});

router.post('/perfiles/:perfilId/bloques', auth, requireQuota, async (req, res) => {
  try {
    const perfilId = parseInt(req.params.perfilId, 10);
    const perfil = await db.prepare('SELECT usuario_id FROM perfiles WHERE id = ?').get(perfilId);

    if (!perfil) return res.status(404).json({ error: 'Perfil no encontrado.' });
    if (perfil.usuario_id !== req.user.id) return res.status(403).json({ error: 'Acceso denegado.' });

    const countRow = await db.prepare('SELECT COUNT(*) as total FROM bloques WHERE perfil_id = ?').get(perfilId);
    const count = countRow ? countRow.total : 0;

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

    const maxRow = await db.prepare('SELECT MAX(orden) as max FROM bloques WHERE perfil_id = ?').get(perfilId);
    const maxOrden = (maxRow && maxRow.max) ? maxRow.max : 0;
    const ordenFinal = Number.isInteger(req.body.orden) ? req.body.orden : maxOrden + 1;

    const result = await db.prepare(
      'INSERT INTO bloques (perfil_id, tipo, contenido, orden) VALUES (?, ?, ?, ?)'
    ).run(perfilId, tipo, JSON.stringify(parsedContent), ordenFinal);

    const newBloque = await db.prepare('SELECT * FROM bloques WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(newBloque);
  } catch (err) {
    console.error('Error creando bloque:', err);
    res.status(500).json({ error: 'Error al crear bloque' });
  }
});

router.put('/bloques/:id', auth, requireQuota, async (req, res) => {
  try {
    const bloqueId = parseInt(req.params.id, 10);
    const bloque = await db.prepare(`
      SELECT b.*, p.usuario_id
      FROM bloques b
      JOIN perfiles p ON b.perfil_id = p.id
      WHERE b.id = ?
    `).get(bloqueId);

    if (!bloque) return res.status(404).json({ error: 'Bloque no encontrado.' });
    if (bloque.usuario_id !== req.user.id) return res.status(403).json({ error: 'Acceso denegado.' });

    const { contenido, visible, orden } = req.body;
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
    const ordenToSave = orden !== undefined ? orden : bloque.orden;

    await db.prepare(
      'UPDATE bloques SET contenido = ?, visible = ?, orden = ? WHERE id = ?'
    ).run(contentToSave, visibleToSave, ordenToSave, bloqueId);

    const updatedBloque = await db.prepare('SELECT * FROM bloques WHERE id = ?').get(bloqueId);
    res.json(updatedBloque);
  } catch (err) {
    console.error('Error actualizando bloque:', err);
    res.status(500).json({ error: 'Error al actualizar bloque' });
  }
});

router.delete('/bloques/:id', auth, requireQuota, async (req, res) => {
  try {
    const bloqueId = parseInt(req.params.id, 10);
    const bloque = await db.prepare(`
      SELECT b.id, p.usuario_id
      FROM bloques b
      JOIN perfiles p ON b.perfil_id = p.id
      WHERE b.id = ?
    `).get(bloqueId);

    if (!bloque) return res.status(404).json({ error: 'Bloque no encontrado.' });
    if (bloque.usuario_id !== req.user.id) return res.status(403).json({ error: 'Acceso denegado.' });

    await db.prepare('DELETE FROM bloques WHERE id = ?').run(bloqueId);
    res.json({ ok: true, mensaje: 'Bloque eliminado correctamente' });
  } catch (err) {
    console.error('Error eliminando bloque:', err);
    res.status(500).json({ error: 'Error al eliminar bloque' });
  }
});

router.put('/perfiles/:perfilId/bloques/reorder', auth, requireQuota, async (req, res) => {
  try {
    const perfilId = parseInt(req.params.perfilId, 10);
    const perfil = await db.prepare('SELECT usuario_id FROM perfiles WHERE id = ?').get(perfilId);

    if (!perfil) return res.status(404).json({ error: 'Perfil no encontrado.' });
    if (perfil.usuario_id !== req.user.id) return res.status(403).json({ error: 'Acceso denegado.' });

    const { orden } = req.body;
    if (!Array.isArray(orden)) {
      return res.status(400).json({ error: 'Formato de orden inválido.' });
    }

    for (let i = 0; i < orden.length; i++) {
      await db.prepare('UPDATE bloques SET orden = ? WHERE id = ? AND perfil_id = ?').run(i, orden[i], perfilId);
    }

    res.json({ ok: true, mensaje: 'Orden actualizado' });
  } catch (err) {
    console.error('Error reordenando bloques:', err);
    res.status(500).json({ error: 'Error al reordenar bloques' });
  }
});

module.exports = router;
