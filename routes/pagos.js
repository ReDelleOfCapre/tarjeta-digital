const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { dbReady } = require('../database/db');

// Autenticación requerida para todas estas rutas
router.use(auth);

// POST /api/pagos/solicitar
router.post('/solicitar', async (req, res) => {
  try {
    const { plan, comprobante_url } = req.body;
    
    if (!plan || !['mensual', 'anual'].includes(plan)) {
      return res.status(400).json({ error: 'Plan inválido' });
    }
    if (!comprobante_url) {
      return res.status(400).json({ error: 'Se requiere el comprobante' });
    }

    const monto = plan === 'mensual' ? 149 : 1499;

    const db = await dbReady;
    
    const stmt = db.prepare(`
      INSERT INTO pagos (usuario_id, plan, monto, comprobante_url, estado) 
      VALUES (?, ?, ?, ?, 'pendiente')
    `);
    
    stmt.run(req.user.id, plan, monto, comprobante_url);

    res.json({ ok: true, mensaje: 'Solicitud recibida' });
  } catch (err) {
    console.error('Error al solicitar pago:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/pagos/mis-pagos
router.get('/mis-pagos', async (req, res) => {
  try {
    const db = await dbReady;
    
    const pagos = db.prepare(`
      SELECT id, plan, monto, comprobante_url, estado, motivo_rechazo, fecha_solicitud, fecha_resolucion
      FROM pagos
      WHERE usuario_id = ?
      ORDER BY fecha_solicitud DESC
    `).all(req.user.id);
    
    res.json({ pagos });
  } catch (err) {
    console.error('Error al obtener pagos:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
