// ============================================
// VYNK Intelligence — recommendations.js
// Recomendaciones accionables derivadas de reglas
// reales y datos reales del perfil. Cada una puede
// aplicarse realmente (theme, orden, agrupación…).
// Determinístico.
// ============================================

const rules = require('./rules');
const layout = require('./layout');

// Normaliza un bloque (para que la UI pueda aplicar cambios).
function toBlockIds(blocks) {
  return blocks.map(function (b) { return b.tipo; });
}

// Recomendaciones por tipo de perfil: bloques esenciales que faltan.
function missingEssentialBlocks(blocks, tipo) {
  const priority = rules.priorityFor(tipo);
  const present = new Set(blocks.map(function (b) { return b.tipo; }));
  const essential = priority.slice(0, 3);
  const missing = essential.filter(function (t) { return !present.has(t); });
  return missing.map(function (t) {
    return {
      id: 'add_' + t,
      category: 'conversion',
      level: 'warning',
      title: 'Agrega un bloque "' + t + '"',
      message: 'Para tu tipo de identidad (' + tipo + '), el bloque "' + t + '" es parte de la composición recomendada y no lo tienes todavía.',
      action: { type: 'add_block', blockType: t },
      blocks: toBlockIds(blocks)
    };
  });
}

// Falta bio o foto → identidad incompleta.
function identityRecommendations(profile) {
  const out = [];
  const nombre = String(profile.nombre_perfil || profile.nombre || '').trim();
  const bio = String(profile.bio || '').trim();
  const foto = profile.foto_url || profile.avatar || profile.avatar_url || '';

  if (!nombre) {
    out.push({
      id: 'identity_name',
      category: 'design',
      level: 'error',
      title: 'Tu tarjeta no tiene nombre',
      message: 'Sin un nombre o marca visible, tu identidad digital no puede presentarse.',
      action: null
    });
  }
  if (!foto) {
    out.push({
      id: 'identity_photo',
      category: 'design',
      level: 'warning',
      title: 'Agrega una foto o logo',
      message: 'Las identidades con foto o logo generan más confianza y mejoran tu paleta automáticamente.',
      action: null
    });
  }
  if (bio.length < 20) {
    out.push({
      id: 'identity_bio',
      category: 'content',
      level: bio.length ? 'warning' : 'error',
      title: 'Tu bio es corta o está vacía',
      message: bio.length ? 'Amplía tu narrativa: 20+ caracteres ayudan a transmitir tu propuesta.' : 'Cuéntanos quién eres para que tu tarjeta hable por ti.',
      action: { type: 'focus_field', field: 'bio_perfil' }
    });
  }
  return out;
}

// CTA principal: existe, está arriba, es coherente con el tipo.
function ctaRecommendations(blocks, tipo) {
  const out = [];
  const ordered = layout.recommendOrder(blocks, tipo);
  const cta = layout.recommendPrimaryCta(blocks, tipo);
  const ideal = rules.primaryCtaFor(tipo);

  if (!cta.found) {
    out.push({
      id: 'cta_missing',
      category: 'conversion',
      level: 'error',
      title: 'No tienes una acción principal',
      message: 'Agrega un bloque de conversión (por ejemplo "' + ideal + '") para que tus visitantes sepan qué hacer.',
      action: { type: 'add_block', blockType: ideal },
      blocks: toBlockIds(blocks)
    });
  } else if (cta.index > 1) {
    const idealOrder = layout.recommendOrder(blocks, tipo).map(function (b) { return b.tipo; });
    out.push({
      id: 'cta_position',
      category: 'conversion',
      level: 'warning',
      title: 'Tu CTA principal está demasiado abajo',
      message: 'La acción principal ("' + cta.tipo + '") ocupa la posición ' + (cta.index + 1) + '. Conviene moverla hacia arriba para captar antes la atención.',
      action: { type: 'move_cta', blockType: cta.tipo, order: idealOrder },
      blocks: toBlockIds(blocks)
    });
  }
  return out;
}

// Contraste: texto o acento sin contraste suficiente.
function contrastRecommendations(profile, brandInfo) {
  const out = [];
  const color = profile.color || '#E8A33D';
  if (brandInfo && brandInfo.contrast) {
    const c = brandInfo.contrast;
    if (typeof c.accentPassesAA === 'boolean' && !c.accentPassesAA) {
      out.push({
        id: 'contrast_accent',
        category: 'branding',
        level: 'warning',
        title: 'El acento no cumple contraste AA',
        message: 'El color de acento tiene contraste ' + c.accent + ':1 sobre el fondo. Podemos proponer una variante accesible.',
        action: { type: 'fix_contrast', color }
      });
    }
  }
  return out;
}

// Densidad: demasiados bloques → agrupar.
function densityRecommendations(blocks) {
  const out = [];
  const density = layout.contentDensity(blocks);
  if (density === 'rich') {
    out.push({
      id: 'density_rich',
      category: 'content',
      level: 'warning',
      title: 'Tu tarjeta tiene demasiado contenido',
      message: 'Con ' + blocks.length + ' bloques la experiencia puede saturar. Considera agrupar o reducir secciones.',
      action: { type: 'suggest_grouping' },
      blocks: toBlockIds(blocks)
    });
  }
  const grouping = layout.suggestGrouping(blocks);
  grouping.forEach(function (g) {
    out.push({
      id: 'group_social',
      category: 'content',
      level: 'info',
      title: 'Agrupa tus redes en un dock',
      message: g.message,
      action: null,
      blocks: toBlockIds(blocks)
    });
  });
  return out;
}

// Ubicación sin horario (y viceversa) para negocios locales.
function locationHoursRecommendations(blocks, profile) {
  const out = [];
  const hasLocation = blocks.some(function (b) { return b.tipo === 'ubicacion' || b.tipo === 'ubicaciones'; });
  const hasHours = blocks.some(function (b) { return b.tipo === 'horario' || ((profile.hora_apertura && profile.hora_apertura !== '00:00') || (profile.hora_cierre && profile.hora_cierre !== '00:00')); });

  if (hasLocation && !hasHours) {
    out.push({
      id: 'location_no_hours',
      category: 'conversion',
      level: 'warning',
      title: 'Tienes ubicación pero no horario',
      message: 'Quien llega a tu mapa querrá saber si estás abierto. Agrega el bloque de horario.',
      action: { type: 'add_block', blockType: 'horario' },
      blocks: toBlockIds(blocks)
    });
  }
  if (hasHours && !hasLocation) {
    out.push({
      id: 'hours_no_location',
      category: 'conversion',
      level: 'info',
      title: 'Tienes horario pero no ubicación',
      message: 'Agrega tu ubicación para que los clientes sepan dónde encontrarte.',
      action: { type: 'add_block', blockType: 'ubicacion' },
      blocks: toBlockIds(blocks)
    });
  }
  return out;
}

// Sugerencias de mejora completas (categorías: diseño, contenido, conversión, branding).
function suggestImprovements(ctx) {
  const profile = ctx.profile || {};
  const blocks = layout.normalizeBlocks(ctx.blocks);
  const tipo = rules.normalizeTipo(profile.tipo || profile.tipo_perfil || 'personal');
  const brandInfo = ctx.brandInfo;

  const all = []
    .concat(identityRecommendations(profile))
    .concat(missingEssentialBlocks(blocks, tipo))
    .concat(ctaRecommendations(blocks, tipo))
    .concat(contrastRecommendations(profile, brandInfo))
    .concat(densityRecommendations(blocks))
    .concat(locationHoursRecommendations(blocks, profile));

  // Dedupe por id.
  const seen = {};
  return all.filter(function (r) {
    if (seen[r.id]) return false;
    seen[r.id] = true;
    return true;
  });
}

module.exports = { suggestImprovements };
