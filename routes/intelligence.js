// ============================================
// VYNK Intelligence — routes/intelligence.js
// Expone VynkIntelligence sobre datos reales de la DB.
// Requiere auth. Sin LLM, sin API keys.
// ============================================

const express = require('express');
const router = express.Router();
const db = require('../database/db');
const auth = require('../middleware/auth');
const { VynkIntelligence } = require('../services/intelligence');

// Analiza un perfil del usuario. Dos modos:
//  - POST { perfil_id } → usa bloques/analytics reales de la DB (dashboard)
//  - POST { profile, blocks } → analiza el estado vivo del editor (sin guardar)
router.post('/analyze', auth, async (req, res) => {
  try {
    const engine = new VynkIntelligence();
    const perfilId = parseInt((req.body && req.body.perfil_id) || (req.query && req.query.perfil_id), 10);

    // Modo editor: analiza el snapshot enviado por el cliente.
    if (!perfilId && req.body && (req.body.profile || req.body.blocks)) {
      const result = engine.analyzeProfile({
        profile: req.body.profile || {},
        blocks: req.body.blocks || [],
        analytics: req.body.analytics || null
      });
      return res.json({ provider: engine.providerName(), providerKind: engine.providerKind(), ...result });
    }

    if (!perfilId) {
      return res.status(400).json({ error: 'Se requiere perfil_id o profile/blocks.' });
    }

    const perfil = await db.prepare('SELECT * FROM perfiles WHERE id = ?').get(perfilId);
    if (!perfil) return res.status(404).json({ error: 'Perfil no encontrado.' });
    if (perfil.usuario_id !== req.user.id) {
      return res.status(403).json({ error: 'No tienes permiso para analizar este perfil.' });
    }

    const bloques = await db.prepare(
      'SELECT * FROM bloques WHERE perfil_id = ? AND visible = 1 ORDER BY orden ASC'
    ).all(perfilId) || [];

    const analytics = await db.prepare(`
      SELECT evento, COUNT(*) as total
      FROM estadisticas
      WHERE perfil_id = ?
      GROUP BY evento
    `).all(perfilId);

    const eventos = {};
    (analytics || []).forEach(function (row) { eventos[row.evento] = row.total; });

    const tendencia = await db.prepare(`
      SELECT DATE(fecha) as fecha, COUNT(*) as visitas
      FROM estadisticas
      WHERE perfil_id = ?
        AND fecha >= NOW() - INTERVAL '30 days'
      GROUP BY DATE(fecha)
      ORDER BY fecha ASC
    `).all(perfilId) || [];

    const result = engine.analyzeProfile({
      profile: {
        id: perfil.id,
        nombre_perfil: perfil.nombre_perfil,
        tipo: perfil.tipo,
        bio: perfil.bio,
        foto_url: perfil.foto_url,
        banner_url: perfil.banner_url,
        color: perfil.color,
        tema: perfil.tema,
        hora_apertura: perfil.hora_apertura,
        hora_cierre: perfil.hora_cierre,
        slug: perfil.slug
      },
      blocks: bloques,
      analytics: {
        visitas_total: perfil.visitas || 0,
        eventos,
        tendencia
      }
    });

    res.json({
      provider: engine.providerName(),
      providerKind: engine.providerKind(),
      ...result
    });
  } catch (err) {
    console.error('Error en /api/intelligence/analyze:', err);
    res.status(500).json({ error: 'Error al analizar el perfil' });
  }
});

// "Mejorar diseño" (Revolución de Diseño): sugiere acciones concretas
// sobre el blueprint del Experience Engine. Cliente en vivo o por DB.
router.post('/design', auth, async (req, res) => {
  try {
    const experience = require('../shared/vynk-experience');
    const perfilId = parseInt((req.body && req.body.perfil_id) || (req.query && req.body && req.query.perfil_id), 10) || null;
    let profile = (req.body && req.body.profile) || {};
    let blocks = (req.body && req.body.blocks) || [];

    // Modo dashboard/DB: resuelve perfil + bloques reales del usuario.
    if (!blocks.length && perfilId) {
      const perfil = await db.prepare('SELECT * FROM perfiles WHERE id = ?').get(perfilId);
      if (!perfil) return res.status(404).json({ error: 'Perfil no encontrado.' });
      if (perfil.usuario_id !== req.user.id) {
        return res.status(403).json({ error: 'No tienes permiso para analizar este perfil.' });
      }
      profile = perfil;
      blocks = await db.prepare(
        'SELECT id, block_type AS tipo, contenido, orden FROM bloques WHERE perfil_id = ? AND visible = 1 ORDER BY orden ASC'
      ).all(perfilId) || [];
    }

    const normalized = (blocks || []).map(function (b) {
      let c = b.contenido || b.content || {};
      if (typeof c === 'string') { try { c = JSON.parse(c); } catch (e) { c = {}; } }
      return { id: b.id, tipo: b.tipo || b.block_type || 'link', contenido: c };
    });

    const comp = (req.body && req.body.comp) || undefined;
    const result = experience.suggestDesign({
      tipo: profile.tipo || 'personal',
      blocks: normalized,
      density: profile.densidad || 'auto',
      profile,
      comp
    });

    res.json({
      provider: 'deterministic',
      providerKind: 'rules',
      suggestions: result.recommendations,
      design: result.blueprint ? {
        archetype: result.blueprint.archetype.id,
        label: result.blueprint.archetype.label,
        patterns: result.blueprint.patterns,
        background: result.blueprint.background.mode
      } : null
    });
  } catch (err) {
    console.error('Error en /api/intelligence/design:', err);
    res.status(500).json({ error: 'Error al generar sugerencias de diseño' });
  }
});

// Analiza una paleta de colores enviada desde el cliente (logo/cover/foto).
router.post('/palette', auth, async (req, res) => {
  try {
    const colors = (req.body && req.body.colors) || [];
    const palette = require('../services/intelligence/palette');
    const analysis = palette.analyzePalette(colors.filter(function (c) { return typeof c === 'string'; }));
    res.json(analysis);
  } catch (err) {
    console.error('Error en /api/intelligence/palette:', err);
    res.status(500).json({ error: 'Error al analizar la paleta' });
  }
});

// Genera una bio determinística para un perfil del usuario.
router.post('/bio', auth, async (req, res) => {
  try {
    const engine = new VynkIntelligence();
    const profile = (req.body && req.body.profile) || {};
    const result = await engine.generateBio({ profile });
    res.json(result);
  } catch (err) {
    console.error('Error en /api/intelligence/bio:', err);
    res.status(500).json({ error: 'Error al generar la bio' });
  }
});

// Chat determinístico (soporte/asistente VYNK).
router.post('/chat', auth, async (req, res) => {
  try {
    const engine = new VynkIntelligence();
    const message = (req.body && req.body.message) || '';
    const profile = (req.body && req.body.profile) || {};
    const result = await engine.chat({ message, profile });
    res.json(result);
  } catch (err) {
    console.error('Error en /api/intelligence/chat:', err);
    res.status(500).json({ error: 'Error al procesar el mensaje' });
  }
});

module.exports = router;
