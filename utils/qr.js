const QRCode = require('qrcode');

/**
 * Genera un código QR como Buffer PNG.
 *
 * @param {string} url - URL a codificar en el QR
 * @returns {Promise<Buffer>} Buffer con la imagen PNG del QR
 */
async function generateQR(url) {
  const buffer = await QRCode.toBuffer(url, {
    type: 'png',
    margin: 2,
    width: 400,
    color: {
      dark: '#1a1a2e',
      light: '#ffffff'
    }
  });
  return buffer;
}

module.exports = { generateQR };
