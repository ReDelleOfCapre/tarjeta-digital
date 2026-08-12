// Sistema de temas espejo del editor (public/js/block-editor.js).
// Permite generar paletas y CSS por perfil en el servidor para la tarjeta pública.

function hexToRgb(hex) {
  let raw = String(hex || '').replace('#', '');
  if (raw.length === 3) {
    raw = raw.split('').map(function (p) { return p + p; }).join('');
  }
  const int = parseInt(raw, 16) || 0;
  return { r: (int >> 16) & 255, g: (int >> 8) & 255, b: int & 255 };
}

function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(function (value) {
    const safe = Math.max(0, Math.min(255, Math.round(value)));
    return safe.toString(16).padStart(2, '0');
  }).join('').toUpperCase();
}

function mixHex(hexA, hexB, weight) {
  const a = hexToRgb(hexA);
  const b = hexToRgb(hexB);
  const ratio = typeof weight === 'number' ? weight : 0.5;
  return rgbToHex(
    a.r + (b.r - a.r) * ratio,
    a.g + (b.g - a.g) * ratio,
    a.b + (b.b - a.b) * ratio
  );
}

function readableText(hex) {
  const rgb = hexToRgb(hex);
  const luminance = (0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b) / 255;
  return luminance > 0.62 ? '#17151B' : '#FFF8F0';
}

function luminance(hex) {
  const rgb = hexToRgb(hex);
  return (0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b) / 255;
}

function rgba(hex, alpha) {
  const rgb = hexToRgb(hex);
  return 'rgba(' + rgb.r + ',' + rgb.g + ',' + rgb.b + ',' + (alpha || 1) + ')';
}

function buildTheme(themeId, accent) {
  const primary = accent || '#E8A33D';
  switch (themeId) {
    case 'paper':
      return {
        background: '#F2E9DC', surface: '#FFFFFF', card: '#F3E7D6', text: '#211D19', muted: '#6C6258',
        primary: primary, secondary: mixHex(primary, '#F7D5A6', 0.55), onPrimary: readableText(primary)
      };
    case 'coast':
      return {
        background: mixHex(primary, '#0F2730', 0.82), surface: mixHex(primary, '#173843', 0.84), card: mixHex(primary, '#1C3E41', 0.72),
        text: '#F4F3EF', muted: 'rgba(244,243,239,0.68)', primary: primary, secondary: mixHex(primary, '#78D7C6', 0.48), onPrimary: readableText(primary)
      };
    case 'graphite':
      return {
        background: mixHex(primary, '#0E1118', 0.92), surface: mixHex(primary, '#1D2430', 0.88), card: mixHex(primary, '#2A3342', 0.76),
        text: '#F6F3EE', muted: 'rgba(246,243,238,0.66)', primary: primary, secondary: mixHex(primary, '#97A9FF', 0.44), onPrimary: readableText(primary)
      };
    case 'velvet':
      return {
        background: mixHex(primary, '#1A0E1E', 0.84), surface: mixHex(primary, '#2B1430', 0.74), card: mixHex(primary, '#4D2050', 0.68),
        text: '#FFF7F7', muted: 'rgba(255,247,247,0.68)', primary: primary, secondary: mixHex(primary, '#F4A3C8', 0.52), onPrimary: readableText(primary)
      };
    case 'editorial':
      return {
        background: mixHex(primary, '#1B171D', 0.86), surface: mixHex(primary, '#2B242A', 0.78), card: mixHex(primary, '#392C32', 0.67),
        text: '#F8F4EF', muted: 'rgba(248,244,239,0.68)', primary: primary, secondary: mixHex(primary, '#F7D08A', 0.46), onPrimary: readableText(primary)
      };
    case 'forest':
      return {
        background: mixHex(primary, '#0F231B', 0.86), surface: mixHex(primary, '#1B3A2B', 0.78), card: mixHex(primary, '#2C533F', 0.66),
        text: '#F2F5EC', muted: 'rgba(242,245,236,0.68)', primary: primary, secondary: mixHex(primary, '#8FD0A8', 0.48), onPrimary: readableText(primary)
      };
    case 'sunset':
      return {
        background: mixHex(primary, '#241018', 0.84), surface: mixHex(primary, '#3A1B22', 0.74), card: mixHex(primary, '#6E2F24', 0.6),
        text: '#FFF6EF', muted: 'rgba(255,246,239,0.68)', primary: primary, secondary: mixHex(primary, '#FFB27A', 0.5), onPrimary: readableText(primary)
      };
    case 'midnight':
      return {
        background: mixHex(primary, '#070D22', 0.9), surface: mixHex(primary, '#14203F', 0.8), card: mixHex(primary, '#213258', 0.68),
        text: '#F4F6FF', muted: 'rgba(244,246,255,0.68)', primary: primary, secondary: mixHex(primary, '#7FD8FF', 0.45), onPrimary: readableText(primary)
      };
    case 'champagne':
      return {
        background: '#F3EADB', surface: '#FFFBEF', card: '#EFE1C6', text: '#2C2418', muted: '#7A6A50',
        primary: primary, secondary: mixHex(primary, '#E7C99A', 0.5), onPrimary: readableText(primary)
      };
    case 'mint':
      return {
        background: '#E9F4EE', surface: '#FFFFFF', card: '#DDEFE4', text: '#16301F', muted: '#4F7260',
        primary: primary, secondary: mixHex(primary, '#A9E2C4', 0.5), onPrimary: readableText(primary)
      };
    case 'rose':
      return {
        background: '#FBEAF0', surface: '#FFFFFF', card: '#F6DCE7', text: '#33202A', muted: '#7A5666',
        primary: primary, secondary: mixHex(primary, '#F4A8C4', 0.45), onPrimary: readableText(primary)
      };
    default:
      return {
        background: mixHex(primary, '#17151B', 0.84), surface: mixHex(primary, '#2A2630', 0.78), card: mixHex(primary, '#3A3342', 0.68),
        text: '#F8F4EF', muted: 'rgba(248,244,239,0.68)', primary: primary, secondary: mixHex(primary, '#FFD59B', 0.52), onPrimary: readableText(primary)
      };
  }
}

// Genera <style> con las variables CSS para la tarjeta pública.
function buildThemeCss(themeId, accent) {
  const t = buildTheme(themeId, accent);
  const primary = t.primary.replace('#', '').toUpperCase();
  const r = parseInt(primary.slice(0, 2), 16) || 232;
  const g = parseInt(primary.slice(2, 4), 16) || 163;
  const b = parseInt(primary.slice(4, 6), 16) || 61;
  const isLight = luminance(String(t.background).replace('#', '')) > 0.5;

  const glow = 'rgba(' + r + ',' + g + ',' + b + ',' + (isLight ? 0.12 : 0.22) + ')';
  const border = isLight ? 'rgba(43,36,29,0.14)' : 'rgba(255,255,255,0.12)';
  const chipBg = 'rgba(' + r + ',' + g + ',' + b + ',' + (isLight ? 0.12 : 0.16) + ')';
  const textTertiary = isLight ? mixHex(String(t.text).replace('#', ''), 'FFFFFF', 0.55) : 'rgba(255,255,255,0.55)';
  const tagColor = isLight ? mixHex(t.primary, String(t.text).replace('#', ''), 0.25) : t.secondary;

  return `:root {
  --primary: ${t.primary};
  --accent: ${t.primary};
  --accent-soft: ${tagColor};
  --accent-glow: ${glow};
  --bg-primary: ${t.background};
  --bg-surface: ${t.surface};
  --bg-card: ${t.card};
  --bg-tertiary: ${t.surface};
  --text-primary: ${t.text};
  --text-secondary: ${t.muted};
  --text-tertiary: ${textTertiary};
  --card-border: ${border};
  --separator: ${border};
  --chip-bg: ${chipBg};
}

/* Overrides públicos: la tarjeta de perfil usa tokens del tema en vez de colores fijos dark */
body {
  background-color: ${t.background} !important;
  background-image:
    radial-gradient(1200px 600px at 20% -10%, var(--accent-glow, rgba(124, 58, 237, 0.16)), transparent 60%),
    radial-gradient(900px 500px at 110% 10%, var(--accent-glow, rgba(122, 106, 240, 0.10)), transparent 55%) !important;
  background-attachment: fixed !important;
  color: var(--text-primary, #F8FAFC) !important;
}
.block-link,
.bento-card,
.block-wrapper > a,
.block-wrapper > div:not(.bento-map-card),
.bento-hero-card,
.bento-social-card,
.bento-media-card,
.bento-rich-card,
.block-wa,
.block-pdf {
  background: ${t.card} !important;
  border-color: ${border} !important;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.28) !important;
}
.block-wrapper > a:hover,
.block-wrapper > div:not(.bento-map-card):hover,
.block-link:hover,
.bento-hero-card:hover,
.bento-social-card:hover,
.bento-media-card:hover,
.bento-rich-card:hover,
.block-wa:hover,
.block-pdf:hover {
  background: ${t.surface} !important;
  border-color: ${t.primary} !important;
}
.bl-title,
.bento-hero-title {
  color: ${t.text} !important;
}
.bl-sub,
.bento-hero-sub {
  color: ${t.muted} !important;
}
.bento-social-handle {
  color: ${t.muted} !important;
}
.bento-badge {
  color: ${t.primary} !important;
  background: ${chipBg} !important;
  border-color: ${border} !important;
}
.tag, .vp-meta a {
  color: ${tagColor} !important;
}`;
}

module.exports = { buildTheme, buildThemeCss };