// ============================================
// VYNK Intelligence — rules.js
// Reglas de composición: tipos de perfil, clases
// de bloques, prioridades y pesos. Determinístico.
//
// FUENTE ÚNICA DE VERDAD: shared/vynk-composition.js
// (misma tabla que usa el renderer en el navegador).
// Este módulo re-exporta para el motor del servidor
// y añade los pesos del Profile Score (solo servidor).
// ============================================

const composition = require('../../shared/vynk-composition');

const {
  TIPO_ALIASES,
  BLOCK_CLASSES,
  TIPO_BLOCK_PRIORITY,
  TIPO_PRIMARY_CTA,
  DENSITY_THRESHOLDS,
  SECTION_LABELS,
  CTA_LABELS
} = composition.TABLES;

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

function normalizeTipo(tipo) { return composition.normalizeTipo(tipo); }
function blockClass(tipo) { return composition.blockClass(tipo); }
function priorityFor(tipo) { return composition.priorityFor(tipo); }
function primaryCtaFor(tipo) { return composition.primaryCtaFor(tipo); }
function morphFor(block, tipo, opts) { return composition.morphFor(block, tipo, opts); }
function smartPriority(block, tipo) { return composition.smartPriority(block, tipo); }
function buildComposition(input) { return composition.buildComposition(input); }
function scoreWeights() { return Object.assign({}, SCORE_WEIGHTS); }

module.exports = {
  normalizeTipo,
  blockClass,
  priorityFor,
  primaryCtaFor,
  morphFor,
  smartPriority,
  buildComposition,
  scoreWeights,
  SCORE_LABELS,
  BLOCK_CLASSES,
  TIPO_ALIASES,
  TIPO_BLOCK_PRIORITY,
  TIPO_PRIMARY_CTA,
  SECTION_LABELS,
  CTA_LABELS,
  DENSITY_THRESHOLDS,
  CONTRAST
};
