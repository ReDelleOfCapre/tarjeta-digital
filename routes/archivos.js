const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const db = require('../database/db');
const auth = require('../middleware/auth');
const checkPlanLimit = require('../middleware/planLimits');
const { uploadFile } = require('../middleware/upload');

router.post('/perfiles/:id/archivos', auth, checkPlanLimit('archivo'), (req, res) => {
  const perfilId = parseInt(req.params.id, 10);

  uploadFile(req, res, async (err) => {
    try {
      if (err) {
        return res.status(400).json({ error: err.message });
      }

      const perfil = await db.prepare('SELECT * FROM perfiles WHERE id = ?').get(perfilId);
      if (!perfil) return res.status(404).json({ error: 'Perfil no encontrado.' });
      if (perfil.usuario_id !== req.user.id) return res.status(403).json({ error: 'No tienes permiso para modificar este perfil.' });

      if (!req.file) {
        return res.status(400).json({ error: 'No se proporcionó ningún archivo.' });
      }

      const result = await db.prepare(
        `INSERT INTO archivos (perfil_id, tipo, nombre, url, tamano)
         VALUES (?, ?, ?, ?, ?)`
      ).run(
        perfilId,
        req.file.mimetype,
        req.file.originalname,
        `/uploads/${req.file.filename}`,
        req.file.size
      );

      const archivo = await db.prepare('SELECT * FROM archivos WHERE id = ?').get(result.lastInsertRowid);

      res.status(201).json(archivo);
    } catch (e) {
      console.error('Error subiendo archivo:', e);
      res.status(500).json({ error: 'Error al subir archivo' });
    }
  });
});

router.delete('/archivos/:id', auth, async (req, res) => {
  try {
    const archivoId = parseInt(req.params.id, 10);

    const archivo = await db.prepare(`
      SELECT a.*, p.usuario_id
      FROM archivos a
      JOIN perfiles p ON a.perfil_id = p.id
      WHERE a.id = ?
    `).get(archivoId);

    if (!archivo) return res.status(404).json({ error: 'Archivo no encontrado.' });
    if (archivo.usuario_id !== req.user.id) return res.status(403).json({ error: 'No tienes permiso para eliminar este archivo.' });

    const filePath = path.join(process.cwd(), archivo.url);
    fs.unlink(filePath, (err) => {
      if (err && err.code !== 'ENOENT') {
        console.error('Error eliminando archivo del disco:', err);
      }
    });

    await db.prepare('DELETE FROM archivos WHERE id = ?').run(archivoId);

    res.json({ ok: true, mensaje: 'Archivo eliminado correctamente.' });
  } catch (err) {
    console.error('Error eliminando archivo:', err);
    res.status(500).json({ error: 'Error al eliminar archivo' });
  }
});

module.exports = router;
