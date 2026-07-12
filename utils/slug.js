const db = require('../database/db');

/**
 * Convierte texto a un slug URL-friendly.
 * Remueve acentos, caracteres especiales, y normaliza.
 *
 * @param {string} text - Texto a convertir
 * @returns {string} Slug generado
 */
function slugify(text) {
  let slug = text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remover acentos
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')    // Reemplazar caracteres especiales con guión
    .replace(/-+/g, '-')            // Colapsar guiones múltiples
    .replace(/^-|-$/g, '');         // Remover guiones al inicio/final

  if (!slug) {
    slug = 'perfil';
  }

  return slug;
}

/**
 * Genera un slug único verificando contra la base de datos.
 * Si el slug base ya existe, agrega un sufijo numérico.
 *
 * @param {string} text - Texto base para el slug
 * @returns {string} Slug único
 */
function generateUniqueSlug(text) {
  const base = slugify(text);

  const existing = db.prepare('SELECT id FROM perfiles WHERE slug = ?').get(base);
  if (!existing) {
    return base;
  }

  for (let i = 1; i <= 100; i++) {
    const candidate = `${base}-${i}`;
    const found = db.prepare('SELECT id FROM perfiles WHERE slug = ?').get(candidate);
    if (!found) {
      return candidate;
    }
  }

  // Fallback con timestamp si todos los intentos numéricos fallan
  return `${base}-${Date.now()}`;
}

module.exports = { slugify, generateUniqueSlug };
