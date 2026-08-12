// ============================================
// My ID — Plan Limits Middleware
// ============================================
const { dbReady } = require('../database/db');

const LIMITS = {
  free: { perfil: 3, campo: 6, archivo: 1 },
  paid: { perfil: 999, campo: 999, archivo: 999 }
};

function checkPlanLimit(resourceType) {
  return async (req, res, next) => {
    try {
      const db = await dbReady;
      const plan = req.user.plan || 'free';
      const limit = LIMITS[plan] ? LIMITS[plan][resourceType] : LIMITS.free[resourceType];

      if (plan === 'paid') return next();

      let count = 0;

      switch (resourceType) {
        case 'perfil': {
          const row = await db.prepare(
            'SELECT COUNT(*) as total FROM perfiles WHERE usuario_id = ?'
          ).get(req.user.id);
          count = row.total;
          break;
        }
        case 'campo': {
          const perfilId = req.params.id;
          const perfil = await db.prepare('SELECT id, usuario_id FROM perfiles WHERE id = ?').get(perfilId);
          if (!perfil || perfil.usuario_id !== req.user.id) {
            return res.status(403).json({ error: 'No autorizado' });
          }
          const row = await db.prepare(
            'SELECT COUNT(*) as total FROM campos_contacto WHERE perfil_id = ?'
          ).get(perfilId);
          count = row.total;
          break;
        }
        case 'archivo': {
          const perfilId = req.params.id;
          const perfil = await db.prepare('SELECT id, usuario_id FROM perfiles WHERE id = ?').get(perfilId);
          if (!perfil || perfil.usuario_id !== req.user.id) {
            return res.status(403).json({ error: 'No autorizado' });
          }
          const row = await db.prepare(
            'SELECT COUNT(*) as total FROM archivos WHERE perfil_id = ?'
          ).get(perfilId);
          count = row.total;
          break;
        }
      }

      if (count >= limit) {
        const resourceNames = { perfil: 'tarjetas', campo: 'campos', archivo: 'archivos' };
        return res.status(403).json({
          error: 'Límite alcanzado',
          limite: true,
          plan: 'free',
          actual: count,
          maximo: limit,
          mensaje: `Has alcanzado el límite de ${limit} ${resourceNames[resourceType]} en el plan gratuito. ¡Actualiza a Pro para crear sin límites!`,
          upgrade: true
        });
      }

      next();
    } catch (err) {
      console.error('Error en planLimits:', err);
      next(err);
    }
  };
}

module.exports = checkPlanLimit;
