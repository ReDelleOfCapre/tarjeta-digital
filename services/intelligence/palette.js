// ============================================
// VYNK Intelligence — palette.js
// Matemática de color, contraste, extracción y
// recomendación de paletas. Todo determinístico.
// ============================================

const { CONTRAST } = require('./rules');

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function hexToRgb(hex) {
  let raw = String(hex || '').replace('#', '').trim();
  if (raw.length === 3) raw = raw.split('').map(function (c) { return c + c; }).join('');
  if (raw.length !== 6) return null;
  const int = parseInt(raw, 16);
  if (Number.isNaN(int)) return null;
  return { r: (int >> 16) & 255, g: (int >> 8) & 255, b: int & 255 };
}

function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(function (v) {
    return clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0');
  }).join('').toUpperCase();
}

// Luminancia relativa (WCAG).
function luminance(hex) {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;
  const f = function (c) {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(rgb.r) + 0.7152 * f(rgb.g) + 0.0722 * f(rgb.b);
}

// Contraste WCAG entre dos colores (4.5 = AA para texto normal).
function contrastRatio(a, b) {
  const la = luminance(a);
  const lb = luminance(b);
  const lighter = Math.max(la, lb);
  const darker = Math.min(la, lb);
  return (lighter + 0.05) / (darker + 0.05);
}

function mixHex(hexA, hexB, weight) {
  const a = hexToRgb(hexA);
  const b = hexToRgb(hexB);
  if (!a || !b) return hexA || hexB || '#888888';
  const ratio = typeof weight === 'number' ? weight : 0.5;
  return rgbToHex(
    a.r + (b.r - a.r) * ratio,
    a.g + (b.g - a.g) * ratio,
    a.b + (b.b - a.b) * ratio
  );
}

// Texto legible sobre un fondo dado.
function readableText(hex) {
  return luminance(hex) > 0.5 ? '#17151B' : '#FFF8F0';
}

// Saturación aproximada (0-1).
function saturation(hex) {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;
  const max = Math.max(rgb.r, rgb.g, rgb.b) / 255;
  const min = Math.min(rgb.r, rgb.g, rgb.b) / 255;
  if (max === 0) return 0;
  return (max - min) / max;
}

// Temperatura: -1 frío, 0 neutro, +1 cálido.
function temperature(hex) {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;
  return clamp((rgb.r - rgb.b) / 255, -1, 1);
}

function isDark(hex) {
  return luminance(hex) < 0.5;
}

// Ajusta el color para cumplir un contraste mínimo contra un fondo.
// Devuelve { color, adjusted:boolean } — nunca rompe legibilidad.
function ensureContrast(hex, background, target) {
  const targetRatio = target || CONTRAST.AA_TEXT;
  if (contrastRatio(hex, background) >= targetRatio) {
    return { color: hex, adjusted: false };
  }
  // Intentar oscurecer/aplicar negro hacia el fondo.
  const black = '#000000';
  const white = '#FFFFFF';
  const viaBlack = mixHex(hex, black, 0.35);
  const viaWhite = mixHex(hex, white, 0.35);
  const candidates = [viaBlack, viaWhite, black, white].sort(function (a, b) {
    return contrastRatio(b, background) - contrastRatio(a, background);
  });
  const best = candidates[0];
  if (contrastRatio(best, background) >= targetRatio) {
    return { color: best, adjusted: true };
  }
  return { color: hex, adjusted: false };
}

// Extrae colores dominantes de una matriz RGBA (resultado de getImageData).
// Devuelve hasta maxColors colores, ordenados por frecuencia, sin grises planos.
function extractDominantColors(rgbaData, maxColors) {
  const limit = maxColors || 5;
  const bucket = {};
  const width = 56;
  const height = 56;
  if (!rgbaData || !rgbaData.length) return [];

  for (let i = 0; i < rgbaData.length; i += 4) {
    const r = rgbaData[i];
    const g = rgbaData[i + 1];
    const b = rgbaData[i + 2];
    const a = rgbaData[i + 3];
    if (a < 120) continue;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    if (max - min < 24) continue; // ignora grises planos
    const key = [
      Math.round(r / 24) * 24,
      Math.round(g / 24) * 24,
      Math.round(b / 24) * 24
    ].join(',');
    bucket[key] = (bucket[key] || 0) + 1;
  }

  const keys = Object.keys(bucket).sort(function (a, b) {
    return bucket[b] - bucket[a];
  });

  return keys.slice(0, limit).map(function (key) {
    const parts = key.split(',');
    return rgbToHex(Number(parts[0]), Number(parts[1]), Number(parts[2]));
  });
}

// Combina paletas de logo (prioridad) y cover (complemento), sin duplicar.
function mergePalettes(logoColors, coverColors) {
  const seen = {};
  const out = [];
  const push = function (hex) {
    if (!hex) return;
    const key = String(hex).toUpperCase();
    if (!seen[key]) {
      seen[key] = true;
      out.push(String(hex).toUpperCase());
    }
  };
  (logoColors || []).forEach(push);
  (coverColors || []).forEach(push);
  return out.slice(0, 6);
}

// Construye una paleta de marca completa a partir de colores extraídos.
// Devuelve { primary, secondary, accent, background, surface, text, textSecondary, contrast }
function buildBrandPalette(colors) {
  const source = (colors || []).filter(Boolean);
  if (!source.length) {
    return {
      primary: '#E8A33D', secondary: '#EF6F7C', accent: '#E8A33D',
      background: '#17151B', surface: '#2A2630', text: '#F8F4EF',
      textSecondary: 'rgba(248,244,239,0.68)', contrast: 0, source: []
    };
  }

  // Ordenar por saturación descendente para elegir el acento más vibrante.
  const bySaturation = source.slice().sort(function (a, b) {
    return saturation(b) - saturation(a);
  });
  const primary = bySaturation[0];
  const secondary = bySaturation[1] || mixHex(primary, '#FFFFFF', 0.35);

  // Fondo: derivado del color más oscuro y desaturado, o tema oscuro por defecto.
  const darkBase = '#17151B';
  const isPrimaryDark = isDark(primary);
  const background = isPrimaryDark ? mixHex(primary, darkBase, 0.82) : darkBase;
  const surface = mixHex(primary, darkBase, 0.66);

  const text = readableText(background);
  const textSecondary = isDark(text) ? 'rgba(23,21,27,0.68)' : 'rgba(248,244,239,0.68)';

  // Acento legible sobre el fondo.
  const accentOk = ensureContrast(primary, background, CONTRAST.AA_LARGE);
  const accent = accentOk.adjusted ? accentOk.color : primary;

  return {
    primary,
    secondary,
    accent,
    background,
    surface,
    text,
    textSecondary,
    contrast: Math.round(contrastRatio(accent, background) * 100) / 100,
    source
  };
}

// Recomienda un tema del editor (id) dado el análisis de una imagen.
function recommendThemeId(palette) {
  const t = temperature(palette.primary || '#E8A33D');
  const dark = isDark(palette.background || '#17151B');
  const sat = saturation(palette.primary || '#E8A33D');

  if (!dark) {
    if (t > 0.12) return 'champagne';
    if (sat > 0.45) return 'mint';
    return 'paper';
  }
  if (t > 0.18) return 'sunset';
  if (t < -0.18) return 'midnight';
  if (sat > 0.5) return 'coast';
  return 'graphite';
}

// Aplica una receta de estilo sobre una paleta base.
// Recetas: minimal, corporate, luxury, dark, editorial, vibrant, glass.
function applyRecipe(recipe, palette) {
  const p = palette || buildBrandPalette([]);
  switch (recipe) {
    case 'minimal':
      return { background: '#F5F1E7', surface: '#FFFFFF', card: '#EFE7D8', text: '#211D19', muted: '#6E6252', primary: p.primary, secondary: mixHex(p.primary, '#EAD5A0', 0.5), onPrimary: readableText(p.primary) };
    case 'corporate':
      return { background: '#0E1420', surface: '#1B2434', card: '#263247', text: '#F4F6FF', muted: 'rgba(244,246,255,0.68)', primary: p.primary, secondary: mixHex(p.primary, '#7FD8FF', 0.45), onPrimary: readableText(p.primary) };
    case 'luxury':
      return { background: '#15131A', surface: '#221E27', card: '#2F2833', text: '#F5EFE4', muted: 'rgba(245,239,228,0.66)', primary: p.primary || '#D4AF37', secondary: mixHex(p.primary || '#D4AF37', '#E7C99A', 0.5), onPrimary: readableText(p.primary || '#D4AF37') };
    case 'dark':
      return { background: '#141419', surface: '#1F1F26', card: '#2A2A33', text: '#F5F5F7', muted: 'rgba(245,245,247,0.66)', primary: p.primary, secondary: mixHex(p.primary, '#FFD59B', 0.5), onPrimary: readableText(p.primary) };
    case 'editorial':
      return { background: '#1B171D', surface: '#2B242A', card: '#392C32', text: '#F8F4EF', muted: 'rgba(248,244,239,0.68)', primary: p.primary, secondary: mixHex(p.primary, '#F7D08A', 0.46), onPrimary: readableText(p.primary) };
    case 'vibrant':
      return { background: '#150F1C', surface: '#241A2E', card: '#352741', text: '#FDF7F0', muted: 'rgba(253,247,240,0.68)', primary: p.primary, secondary: p.secondary, onPrimary: readableText(p.primary) };
    case 'glass':
      return { background: '#101014', surface: 'rgba(255,255,255,0.08)', card: 'rgba(255,255,255,0.06)', text: '#F5F5F7', muted: 'rgba(245,245,247,0.66)', primary: p.primary, secondary: p.secondary, onPrimary: readableText(p.primary) };
    default:
      return { background: mixHex(p.primary, '#17151B', 0.84), surface: mixHex(p.primary, '#2A2630', 0.78), card: mixHex(p.primary, '#3A3342', 0.68), text: '#F8F4EF', muted: 'rgba(248,244,239,0.68)', primary: p.primary, secondary: mixHex(p.primary, '#FFD59B', 0.52), onPrimary: readableText(p.primary) };
  }
}

// Análisis completo de una paleta (usa en insights del editor).
function analyzePalette(colors) {
  const palette = buildBrandPalette(colors);
  return {
    palette,
    stats: {
      temperature: Math.round(temperature(palette.primary) * 100) / 100,
      saturation: Math.round(saturation(palette.primary) * 100),
      contrast: palette.contrast,
      passesAA: contrastRatio(palette.text, palette.background) >= CONTRAST.AA_TEXT,
      isDark: isDark(palette.background)
    },
    theme: recommendThemeId(palette),
    recipes: ['minimal', 'corporate', 'luxury', 'dark', 'editorial', 'vibrant', 'glass'].map(function (r) {
      return { id: r, theme: applyRecipe(r, palette) };
    })
  };
}

module.exports = {
  hexToRgb, rgbToHex, luminance, contrastRatio, mixHex, readableText,
  saturation, temperature, isDark, ensureContrast, extractDominantColors,
  mergePalettes, buildBrandPalette, recommendThemeId, applyRecipe, analyzePalette,
  CONTRAST
};
