// ============================================
// VYNK Intelligence — profile.js
// VYNK Profile Score (0–100) y sugerencias de
// mejora derivadas de datos reales. Determinístico.
// ============================================

const rules = require('./rules');
const layout = require('./layout');

// Mensaje según el nivel del score. Herramienta de mejora, no gamificación.
function messageForScore(score) {
  if (score >= 90) return 'Tu identidad está casi perfecta.';
  if (score >= 75) return 'Tu identidad está casi lista.';
  if (score >= 50) return 'Tu identidad avanza bien. Completa lo que falta para destacar.';
  if (score >= 25) return 'Tu identidad está en construcción. Empecemos por lo esencial.';
  return 'Tu identidad necesita una base sólida. Empecemos por los datos básicos.';
}

// Puntúa cada categoría (0-1) según datos reales del perfil y sus bloques.
function categoryScores(profile, blocks, brandInfo) {
  const nombre = String(profile.nombre_perfil || profile.nombre || '').trim();
  const bio = String(profile.bio || '').trim();
  const foto = profile.foto_url || profile.avatar || profile.avatar_url || '';
  const tipo = profile.tipo || profile.tipo_perfil || 'personal';
  const horarioPerfil = (profile.hora_apertura && profile.hora_apertura !== '00:00') || (profile.hora_cierre && profile.hora_cierre !== '00:00');

  const hasContact = blocks.some(function (b) {
    const c = b.contenido || {};
    return (b.tipo === 'whatsapp' && (c.numero || c.telefono)) ||
      (b.tipo === 'link' && /tel:|mailto:/.test(c.url || ''));
  });
  const socialCount = layout.socialNetworks(blocks);
  const hasLocation = blocks.some(function (b) { return b.tipo === 'ubicacion' || b.tipo === 'ubicaciones'; });
  const hasHours = blocks.some(function (b) { return b.tipo === 'horario' || horarioPerfil; });
  const hasCta = blocks.some(function (b) { return layout.recommendPrimaryCta(blocks, tipo).found && rules.blockClass(b.tipo) === 'CONVERSION'; });
  const brandCoverage = brandInfo && typeof brandInfo.brandCoverage === 'number' ? brandInfo.brandCoverage / 100 : (foto ? 0.6 : 0);
  const textChars = layout.countText(blocks);
  const hasContent = blocks.length > 0 && textChars > 0;

  return {
    identidad: nombre ? 1 : 0,
    foto: foto ? 1 : 0,
    bio: bio.length >= 20 ? 1 : (bio.length > 0 ? 0.5 : 0),
    cta: hasCta ? 1 : 0,
    contacto: hasContact ? 1 : 0,
    social: socialCount >= 3 ? 1 : (socialCount > 0 ? 0.5 : 0),
    branding: Math.max(0, Math.min(1, brandCoverage)),
    ubicacion: hasLocation ? 1 : 0,
    horario: hasHours ? 1 : 0,
    contenido: hasContent ? (blocks.length >= 3 && blocks.length <= 10 ? 1 : 0.6) : 0
  };
}

// Compute weighted score 0-100.
function scoreProfile(profile, blocks, brandInfo) {
  const weights = rules.scoreWeights();
  const cats = categoryScores(profile, blocks, brandInfo);

  let total = 0;
  const breakdown = {};
  Object.keys(weights).forEach(function (key) {
    const weighted = Math.round(cats[key] * weights[key]);
    breakdown[key] = {
      label: rules.SCORE_LABELS[key] || key,
      score: weighted,
      max: weights[key],
      fraction: cats[key]
    };
    total += weighted;
  });

  const score = Math.max(0, Math.min(100, Math.round(total)));
  return {
    score,
    message: messageForScore(score),
    breakdown,
    categoryScores: cats
  };
}

module.exports = { scoreProfile, categoryScores, messageForScore };
