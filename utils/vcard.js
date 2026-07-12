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

  lines.push('BEGIN:VCARD');
  lines.push('VERSION:3.0');
  lines.push(`FN:${escapeVCard(perfil.nombre_perfil)}`);
  lines.push('N:;;;');

  // Procesar campos de contacto
  if (campos && Array.isArray(campos)) {
    for (const campo of campos) {
      switch (campo.tipo) {
        case 'telefono':
        case 'whatsapp':
          lines.push(`TEL;TYPE=CELL:${campo.valor}`);
          break;
        case 'email':
          lines.push(`EMAIL:${campo.valor}`);
          break;
        case 'direccion':
          lines.push(`ADR:;;${escapeVCard(campo.valor)}`);
          break;
        case 'web':
          lines.push(`URL:${campo.valor}`);
          break;
        default:
          lines.push(`NOTE:${escapeVCard(campo.tipo)}: ${escapeVCard(campo.valor)}`);
          break;
      }
    }
  }

  // URL del perfil público
  lines.push(`URL:${baseUrl}/u/${perfil.slug}`);

  // Foto de perfil
  if (perfil.foto_url) {
    lines.push(`PHOTO;VALUE=URI:${baseUrl}${perfil.foto_url}`);
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
