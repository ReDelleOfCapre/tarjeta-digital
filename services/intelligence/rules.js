// ============================================
// VYNK Intelligence — rules.js
// Reglas de composición: tipos de perfil, clases
// de bloques, prioridades y pesos. Determinístico.
// ============================================

// Tipos de perfil conocidos por el sistema (aliases se normalizan en normalizeTipo)
const TIPO_ALIASES = {
  negocio: 'business',
  negocio_local: 'business',
  restaurant: 'restaurant',
  restaurante: 'restaurant',
  creador: 'creator',
  creativo: 'creator',
  artista: 'artist',
  profesional: 'professional',
  portfolio: 'portfolio',
  evento: 'event',
  event: 'event',
  corporativo: 'corporate',
  corporate: 'corporate',
  personal: 'personal',
  otro: 'personal'
};

// Clasificación semántica de cada bloque.
// PRIMARY/SECONDARY = conversión · CONTENT = texto · SOCIAL = redes ·
// UTILITY = utilidades · INFORMATION = datos · MEDIA = multimedia · CONVERSION = CTA
const BLOCK_CLASSES = {
  whatsapp: 'CONVERSION',
  link: 'CONVERSION',
  pago: 'CONVERSION',
  email_capture: 'CONVERSION',
  countdown: 'CONVERSION',
  agendar: 'CONVERSION',
  seccion: 'INFORMATION',
  ubicacion: 'INFORMATION',
  horario: 'INFORMATION',
  social_icons: 'SOCIAL',
  spotify: 'MEDIA',
  youtube: 'MEDIA',
  tiktok: 'MEDIA',
  galeria: 'MEDIA',
  texto: 'CONTENT',
  nota: 'CONTENT',
  wishlist: 'CONTENT',
  pdf: 'UTILITY'
};

// Prioridad de bloques por tipo de perfil (composición ideal, en orden).
// Se usa para recomendar orden, CTA principal y agrupación.
const TIPO_BLOCK_PRIORITY = {
  business: ['whatsapp', 'link', 'pago', 'email_capture', 'horario', 'ubicacion', 'seccion', 'social_icons', 'galeria', 'texto', 'nota', 'wishlist', 'countdown', 'pdf'],
  restaurant: ['whatsapp', 'link', 'ubicacion', 'horario', 'pago', 'galeria', 'pdf', 'seccion', 'texto', 'social_icons', 'countdown'],
  creator: ['social_icons', 'link', 'galeria', 'youtube', 'tiktok', 'spotify', 'email_capture', 'seccion', 'texto', 'nota', 'wishlist', 'countdown'],
  artist: ['social_icons', 'galeria', 'link', 'spotify', 'youtube', 'email_capture', 'seccion', 'texto', 'wishlist', 'countdown'],
  professional: ['whatsapp', 'link', 'email_capture', 'horario', 'ubicacion', 'pdf', 'seccion', 'texto', 'social_icons'],
  portfolio: ['galeria', 'social_icons', 'link', 'youtube', 'tiktok', 'spotify', 'email_capture', 'seccion', 'texto', 'nota'],
  event: ['countdown', 'link', 'whatsapp', 'ubicacion', 'pago', 'email_capture', 'seccion', 'social_icons', 'galeria', 'texto'],
  corporate: ['whatsapp', 'link', 'email_capture', 'horario', 'ubicacion', 'social_icons', 'pago', 'seccion', 'texto', 'galeria'],
  personal: ['link', 'social_icons', 'whatsapp', 'email_capture', 'seccion', 'texto', 'galeria', 'nota', 'wishlist']
};

// CTA recomendado por tipo (el bloque de conversión principal).
const TIPO_PRIMARY_CTA = {
  business: 'whatsapp',
  restaurant: 'whatsapp',
  creator: 'link',
  artist: 'link',
  professional: 'link',
  portfolio: 'link',
  event: 'countdown',
  corporate: 'link',
  personal: 'link'
};

// Umbrales de densidad de contenido.
const DENSITY_THRESHOLDS = {
  minimal: 4,      // <= 4 bloques → minimal
  balanced: 10     // <= 10 bloques → balanced ; > 10 → rich
};

// Umbrales de contraste WCAG.
const CONTRAST = {
  AA_TEXT: 4.5,    // texto normal
  AA_LARGE: 3.0,   // texto grande / UI
  AAA: 7.0
};

// Peso de cada categoría del Profile Score (suma 100).
const SCORE_WEIGHTS = {
  identidad: 20,
  foto: 8,
  bio: 12,
  cta: 14,
  contacto: 10,
  social: 8,
  branding: 10,
  ubicacion: 5,
  horario: 5,
  contenido: 8
};

// Etiquetas legibles por categoría (UI).
const SCORE_LABELS = {
  identidad: 'Identidad',
  foto: 'Foto / Logo',
  bio: 'Biografía',
  cta: 'Acción principal',
  contacto: 'Contacto',
  social: 'Redes sociales',
  branding: 'Marca',
  ubicacion: 'Ubicación',
  horario: 'Horario',
  contenido: 'Contenido'
};

function normalizeTipo(tipo) {
  const t = String(tipo || '').toLowerCase().trim();
  return TIPO_ALIASES[t] || t || 'personal';
}

function blockClass(tipo) {
  return BLOCK_CLASSES[tipo] || 'CONTENT';
}

function priorityFor(tipo) {
  const t = normalizeTipo(tipo);
  return TIPO_BLOCK_PRIORITY[t] || TIPO_BLOCK_PRIORITY.personal;
}

function primaryCtaFor(tipo) {
  const t = normalizeTipo(tipo);
  return TIPO_PRIMARY_CTA[t] || 'link';
}

function scoreWeights() {
  return Object.assign({}, SCORE_WEIGHTS);
}

module.exports = {
  normalizeTipo,
  blockClass,
  priorityFor,
  primaryCtaFor,
  scoreWeights,
  SCORE_LABELS,
  BLOCK_CLASSES,
  TIPO_ALIASES,
  TIPO_BLOCK_PRIORITY,
  TIPO_PRIMARY_CTA,
  DENSITY_THRESHOLDS,
  CONTRAST
};
