const { initPromise } = require('../database/db');

const args = process.argv.slice(2);
const telefono = args[0];

if (!telefono) {
  console.error('Uso: node hacer-admin.js <numero_telefono>');
  console.error('Ejemplo: node hacer-admin.js 5512345678');
  process.exit(1);
}

async function makeAdmin() {
  try {
    const database = await initPromise;
    const user = database.prepare('SELECT id, nombre, telefono FROM usuarios WHERE telefono = ?').get(telefono);

    if (!user) {
      console.error(`❌ Usuario con teléfono ${telefono} no encontrado.`);
      process.exit(1);
    }

    database.prepare(`
      UPDATE usuarios 
      SET role = 'admin', plan = 'paid' 
      WHERE id = ?
    `).run(user.id);

    console.log(`✅ ¡Éxito! El usuario ${user.nombre} (${user.telefono}) ahora es ADMIN y tiene plan PRO.`);
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

makeAdmin();
