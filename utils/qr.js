const QRCode = require('qrcode');

/**
 * Genera un código QR de alta gama estilo Startup 2027 como Buffer PNG.
 * Usa nivel de corrección de error 'H' (High) y paleta oscura de contraste elevado.
 *
 * @param {string} url - URL a codificar en el QR
 * @param {object} options - Opciones avanzadas de color y tamaño
 * @returns {Promise<Buffer>} Buffer con la imagen PNG del QR
 */
async function generateQR(url, options = {}) {
  const darkColor = options.darkColor || '#5C48E6';
  const lightColor = options.lightColor || '#08080E';

  const buffer = await QRCode.toBuffer(url, {
    type: 'png',
    margin: options.margin !== undefined ? options.margin : 3,
    width: options.width || 600,
    errorCorrectionLevel: 'H',
    color: {
      dark: options.darkColor || '#000000',
      light: options.lightColor || '#FFFFFF'
    }
  });

  return buffer;
}

module.exports = { generateQR };
