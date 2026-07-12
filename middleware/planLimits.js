const db = require('../database/db');

/**
 * Límites del plan gratuito por tipo de recurso.
 */
const FREE_LIMITS = {
  perfil: 1,
  campo: 3,
  archivo: 1
};

/**
 * Fábrica de middleware para verificar límites del plan.
 *
 * @param {'perfil'|'campo'|'archivo'} resourceType - Tipo de recurso a verificar
 * @returns {Function} Middleware Express
 */
function checkPlanLimit(resourceType) {
  return function (req, res, next) {
    const user = req.user;

    // Plan de pago no tiene límites
    if (user.plan === 'paid') {
      return next();
    }

    const limit = FREE_LIMITS[resourceType];
    if (limit === undefined) {
      return next();
    }

    let currentCount = 0;

    switch (resourceType) {
      case 'perfil': {
        const row = db.prepare(
          'SELECT COUNT(*) as total FROM perfiles WHERE usuario_id = ?'
        ).get(user.id);
        currentCount = row.total;
        break;
      }

      case 'campo': {
        const perfilId = parseInt(req.params.id, 10);
        if (isNaN(perfilId)) {
          return res.status(400).json({ error: 'ID de perfil inválido.' });
        }
        const row = db.prepare(
          'SELECT COUNT(*) as total FROM campos_contacto WHERE perfil_id = ?'
        ).get(perfilId);
        currentCount = row.total;
        break;
      }

      case 'archivo': {
        const perfilId = parseInt(req.params.id, 10);
        if (isNaN(perfilId)) {
          return res.status(400).json({ error: 'ID de perfil inválido.' });
        }
        const row = db.prepare(
          'SELECT COUNT(*) as total FROM archivos WHERE perfil_id = ?'
        ).get(perfilId);
        currentCount = row.total;
        break;
      }
    }

    if (currentCount >= limit) {
      const resourceNames = {
        perfil: 'perfiles',
        campo: 'campos de contacto',
        archivo: 'archivos'
      };

      return res.status(403).json({
        error: 'Límite alcanzado',
        limite: true,
        plan: 'free',
        mensaje: `Actualiza a Pro para crear más ${resourceNames[resourceType]}`,
        upgrade: true
      });
    }

    next();
  };
}

module.exports = checkPlanLimit;
