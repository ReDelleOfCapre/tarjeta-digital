// ============================================
// VYNK Intelligence — layout.js
// Motor de layout: densidad, clasificación de
// bloques, orden recomendado y agrupación.
// Determinístico.
// ============================================

const rules = require('./rules');

// Normaliza un bloque del editor a { tipo, contenido }.
function normalizeBlocks(blocks) {
  if (!Array.isArray(blocks)) return [];
  return blocks.filter(Boolean).map(function (b) {
    let content = b.contenido || b.content || b.data || {};
    if (typeof content === 'string') {
      try { content = JSON.parse(content); } catch (e) { content = {}; }
    }
    return {
      id: b.id,
      tipo: b.tipo || b.type || b.block_type || 'link',
      contenido: content,
      visible: b.visible === false || b.visible === 0 || b.visible === '0' ? false : true,
      orden: typeof b.orden === 'number' ? b.orden : 0
    };
  }).filter(function (b) { return b.visible !== false; });
}

function countText(blocks) {
  let chars = 0;
  blocks.forEach(function (b) {
    const c = b.contenido || {};
    const pieces = [c.texto, c.titulo, c.subtitulo, c.descripcion, c.bio];
    pieces.forEach(function (p) {
      if (typeof p === 'string') chars += p.length;
    });
    if (Array.isArray(c.dias)) {
      c.dias.forEach(function (d) {
        if (d && d.horario) chars += String(d.horario).length;
      });
    }
  });
  return chars;
}

function countImages(blocks) {
  let images = 0;
  blocks.forEach(function (b) {
    const c = b.contenido || {};
    if (b.tipo === 'galeria' && Array.isArray(c.imagenes)) images += c.imagenes.length;
    if (c.imagen && c.imagen.url) images += 1;
    if (c.url && /\.(png|jpe?g|gif|webp|avif)(\?|$)/i.test(c.url)) images += 1;
  });
  return images;
}

function countLinks(blocks) {
  let links = 0;
  blocks.forEach(function (b) {
    const c = b.contenido || {};
    if (c.url) links += 1;
    if (Array.isArray(c.redes)) links += c.redes.filter(function (r) { return r && r.url; }).length;
    if (c.numero || c.telefono) links += 1;
  });
  return links;
}

function countCtas(blocks) {
  return blocks.filter(function (b) {
    return rules.blockClass(b.tipo) === 'CONVERSION';
  }).length;
}

// Densidad de contenido: minimal | balanced | rich.
function contentDensity(blocks) {
  const count = blocks.length;
  const thresholds = rules.DENSITY_THRESHOLDS;
  let density = 'minimal';
  if (count > thresholds.balanced) density = 'rich';
  else if (count > thresholds.minimal) density = 'balanced';
  return density;
}

// Clasifica todos los bloques con su clase semántica.
function classifyBlocks(blocks) {
  return blocks.map(function (b) {
    return { tipo: b.tipo, contenido: b.contenido, class: rules.blockClass(b.tipo) };
  });
}

// Orden recomendado según el tipo de perfil: los bloques del usuario
// se reordenan respetando la prioridad ideal de su tipo.
function recommendOrder(blocks, tipo) {
  const priority = rules.priorityFor(tipo);
  const scored = blocks.map(function (b) {
    const idx = priority.indexOf(b.tipo);
    return { block: b, score: idx === -1 ? 99 : idx };
  });
  scored.sort(function (a, b) {
    return a.score - b.score;
  });
  return scored.map(function (item) { return item.block; });
}

// CTA principal recomendado: el primer bloque de conversión en el orden ideal.
function recommendPrimaryCta(blocks, tipo) {
  const ideal = rules.primaryCtaFor(tipo);
  const ordered = recommendOrder(blocks, tipo);
  const existing = ordered.find(function (b) { return b.tipo === ideal; });
  if (existing) return { tipo: ideal, found: true, index: ordered.indexOf(existing) };
  const firstCta = ordered.find(function (b) { return rules.blockClass(b.tipo) === 'CONVERSION'; });
  if (firstCta) return { tipo: firstCta.tipo, found: true, index: ordered.indexOf(firstCta) };
  return { tipo: ideal, found: false, index: -1 };
}

// Redes sociales agrupables en un social dock.
function socialNetworks(blocks) {
  const nets = {};
  blocks.forEach(function (b) {
    const c = b.contenido || {};
    if (b.tipo === 'social_icons' && Array.isArray(c.redes)) {
      c.redes.forEach(function (r) {
        if (r && r.tipo && r.url) nets[r.tipo] = r.url;
      });
    }
    if (c.url && /instagram|tiktok|youtube|facebook|linkedin|x\.com|twitter|spotify|github/i.test(c.url)) {
      nets[c.url] = c.url;
    }
  });
  return Object.keys(nets).length;
}

// Agrupación sugerida: redes sueltas → dock.
function suggestGrouping(blocks) {
  const socialBlocks = blocks.filter(function (b) {
    return b.tipo === 'social_icons';
  });
  const looseSocial = blocks.filter(function (b) {
    const c = b.contenido || {};
    return (b.tipo === 'link' || b.tipo === 'nota') && c.url && /instagram|tiktok|youtube|facebook|linkedin/i.test(c.url);
  });
  const suggestions = [];
  if (socialBlocks.length && looseSocial.length) {
    suggestions.push({
      type: 'group_social',
      message: 'Tienes ' + looseSocial.length + ' enlaces de redes sueltos además de tu bloque de redes. Podemos agruparlos en el dock social.',
      blockTypes: looseSocial.map(function (b) { return b.tipo; })
    });
  }
  return suggestions;
}

// Análisis completo de layout + densidad.
function analyzeLayout(blocks, tipo) {
  const normalized = normalizeBlocks(blocks);
  const ordered = recommendOrder(normalized, tipo);
  return {
    blocks: normalized,
    classified: classifyBlocks(normalized),
    order: ordered.map(function (b) { return b.tipo; }),
    counts: {
      total: normalized.length,
      textChars: countText(normalized),
      images: countImages(normalized),
      links: countLinks(normalized),
      ctas: countCtas(normalized),
      socialNetworks: socialNetworks(normalized)
    },
    density: contentDensity(normalized),
    primaryCta: recommendPrimaryCta(normalized, tipo),
    grouping: suggestGrouping(normalized)
  };
}

module.exports = {
  normalizeBlocks, countText, countImages, countLinks, countCtas,
  contentDensity, classifyBlocks, recommendOrder, recommendPrimaryCta,
  socialNetworks, suggestGrouping, analyzeLayout
};
