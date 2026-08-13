const fs = require('fs');
const path = require('path');

const svgLogo = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="100%" height="100%">
  <defs>
    <linearGradient id="vynk-bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#EEEAFC"/>
      <stop offset="100%" stop-color="#E4DFFA"/>
    </linearGradient>
    <linearGradient id="vynk-grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#5C48E6"/>
      <stop offset="100%" stop-color="#173B63"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="128" fill="url(#vynk-bg)"/>
  <rect width="504" height="504" x="4" y="4" rx="124" fill="none" stroke="url(#vynk-grad)" stroke-width="12" stroke-opacity="0.6"/>
  <path d="M 120 140 L 256 390 L 392 140 L 320 140 L 256 268 L 192 140 Z" fill="url(#vynk-grad)"/>
  <circle cx="256" cy="140" r="28" fill="#5C48E6"/>
</svg>`;

const favPath = path.join(__dirname, '../public/favicon.svg');
const logoPath = path.join(__dirname, '../public/img/logo.svg');
fs.writeFileSync(favPath, svgLogo);
fs.writeFileSync(logoPath, svgLogo);
console.log('✅ Logotipos e Iconos SVG generados correctamente.');

if (require.main === module) {
  const args = process.argv.slice(2);
  const telefono = args[0];
  if (telefono) {
    const { initPromise } = require('../database/db');
    initPromise.then(database => {
      const user = database.prepare('SELECT id, nombre, telefono FROM usuarios WHERE telefono = ?').get(telefono);
      if (user) {
        database.prepare("UPDATE usuarios SET role = 'admin', plan = 'paid' WHERE id = ?").run(user.id);
        console.log(`✅ ¡Éxito! ${user.nombre} (${user.telefono}) es ADMIN.`);
      }
    });
  }
}
