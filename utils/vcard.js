/**
 * Genera una vCard 3.0 a partir de datos de perfil y campos de contacto.
 *
 * @param {Object} perfil - Datos del perfil
 * @param {Array} campos - Array de campos de contacto
 * @param {string} baseUrl - URL base del sitio (ej: https://midominio.com)
 * @returns {string} Contenido vCard como string
 */
function generateVCard(perfil, campos, baseUrl) {
  const lines = [];
  const fullName = String(perfil.nombre_perfil || '').trim() || 'Contacto';

  // Dividir nombre en apellido(nombres) — vCard 3.0 N:familiar;dado;...
  const parts = fullName.split(/\s+/);
  const given = parts.shift() || '';
  const family = parts.join(' ') || '';

  lines.push('BEGIN:VCARD');
  lines.push('VERSION:3.0');
  lines.push(`FN:${escapeVCard(fullName)}`);
  lines.push(`N:${escapeVCard(family)};${escapeVCard(given)};;;`);

  // Procesar campos de contacto
  if (campos && Array.isArray(campos)) {
    for (const campo of campos) {
      if (!campo || typeof campo.valor !== 'string' || !campo.valor.trim()) continue;
      const valor = campo.valor.trim();
      switch (campo.tipo) {
        case 'telefono':
        case 'whatsapp':
          lines.push(`TEL;TYPE=CELL:${escapeVCard(valor)}`);
          break;
        case 'email':
          lines.push(`EMAIL:${escapeVCard(valor)}`);
          break;
        case 'direccion':
          lines.push(`ADR;TYPE=WORK:;;${escapeVCard(valor)}`);
          break;
        case 'web':
          lines.push(`URL:${escapeVCard(valor)}`);
          break;
        default:
          lines.push(`NOTE:${escapeVCard(campo.tipo)}: ${escapeVCard(valor)}`);
          break;
      }
    }
  }

  // URL del perfil público
  lines.push(`URL:${baseUrl}/u/${perfil.slug}`);

  // Foto de perfil
  if (perfil.foto_url) {
    const foto = String(perfil.foto_url).startsWith('http')
      ? perfil.foto_url
      : baseUrl + perfil.foto_url;
    lines.push(`PHOTO;VALUE=URI:${foto}`);
  }

  // Cargo / tipo de perfil
  if (perfil.tipo) {
    lines.push(`TITLE:${escapeVCard(perfil.tipo)}`);
  }

  lines.push('END:VCARD');

  return lines.join('\r\n');
}

/**
 * Escapa caracteres especiales para vCard.
 */
function escapeVCard(str) {
  if (!str) return '';
  return str
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

module.exports = { generateVCard };
