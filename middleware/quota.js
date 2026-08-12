const { dbReady } = require('../database/db');

async function requireQuota(req, res, next) {
  try {
    const userPlan = req.user.plan;
    // PRO users have unlimited energy
    if (userPlan === 'paid' || req.user.role === 'admin') {
      return next();
    }

    const db = await dbReady;
    const user = db.prepare('SELECT acciones_restantes, ultimo_reset FROM usuarios WHERE id = ?').get(req.user.id);
    
    if (!user) {
      return res.status(401).json({ error: 'Usuario no encontrado' });
    }

    const ahora = new Date();
    // SQLite datetime is UTC. Append Z to parse correctly.
    let ultimoResetStr = user.ultimo_reset;
    if (!ultimoResetStr.endsWith('Z')) ultimoResetStr += 'Z';
    const ultimoReset = new Date(ultimoResetStr);
    
    const horasPasadas = (ahora - ultimoReset) / (1000 * 60 * 60);
    const HORAS_COOLDOWN = 8;
    const MAX_ACCIONES = 5;

    let acciones = user.acciones_restantes;
    
    // Check if cooldown has passed
    if (horasPasadas >= HORAS_COOLDOWN) {
      acciones = MAX_ACCIONES;
      // Reset the quota and timestamp (PostgreSQL: CURRENT_TIMESTAMP)
      db.prepare('UPDATE usuarios SET acciones_restantes = ?, ultimo_reset = CURRENT_TIMESTAMP WHERE id = ?')
        .run(acciones, req.user.id);
    }

    if (acciones > 0) {
      // Consume 1 action
      db.prepare('UPDATE usuarios SET acciones_restantes = acciones_restantes - 1 WHERE id = ?')
        .run(req.user.id);
      return next();
    } else {
      // No actions left
      const horasRestantes = Math.ceil(HORAS_COOLDOWN - horasPasadas);
      return res.status(403).json({ 
        error: 'Sin energía', 
        mensaje: `Te has quedado sin energía gratuita. Tu energía se recargará en ${horasRestantes} hora(s).`,
        upgrade: true,
        horas_restantes: horasRestantes
      });
    }

  } catch (err) {
    console.error('Error en middleware quota:', err);
    res.status(500).json({ error: 'Error verificando cuota' });
  }
}

module.exports = requireQuota;
