// ============================================
// VYNK — Auth Routes
// ============================================
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { dbReady } = require('../database/db');
const rateLimit = require('../middleware/rateLimit');

const JWT_SECRET = process.env.JWT_SECRET || 'vynk-default-secret';
const OWNER_PHONE = (process.env.OWNER_PHONE || '').replace(/[^0-9]/g, '');

function normalizePhone(phone) {
  return phone.replace(/[^0-9]/g, '');
}

function isOwner(telefono) {
  if (!OWNER_PHONE) return false;
  return normalizePhone(telefono) === OWNER_PHONE;
}

function signToken(user) {
  return jwt.sign(
    { id: user.id, telefono: user.telefono, plan: user.plan, nombre: user.nombre, role: user.role },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

// POST /api/auth/registro
router.post('/registro', [
  body('telefono').notEmpty().isLength({ min: 7, max: 15 }).withMessage('Teléfono inválido'),
  body('nombre').notEmpty().trim().isLength({ min: 2, max: 50 }).withMessage('Nombre requerido (2-50 caracteres)'),
  body('password').isLength({ min: 6 }).withMessage('La contraseña debe tener al menos 6 caracteres'),
  body('email').optional().isEmail().withMessage('Email inválido')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array()[0].msg });
    }

    const db = await dbReady;
    const { telefono, nombre, password, email, legal_aceptado } = req.body;
    const telefonoNorm = normalizePhone(telefono);

    // Check if already registered
    const existing = db.prepare('SELECT id FROM usuarios WHERE telefono = ?').get(telefonoNorm);
    if (existing) {
      return res.status(409).json({ error: 'Este teléfono ya está registrado' });
    }

    const password_hash = await bcrypt.hash(password, 10);

    // Auto-detect owner
    const ownerDetected = isOwner(telefonoNorm);
    const plan = ownerDetected ? 'paid' : 'free';
    const role = ownerDetected ? 'admin' : 'user';

    const result = db.prepare(
      'INSERT INTO usuarios (telefono, nombre, password_hash, plan, role, email) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(telefonoNorm, nombre.trim(), password_hash, plan, role, email || null);

    const user = { id: result.lastInsertRowid, telefono: telefonoNorm, nombre: nombre.trim(), plan, role };
    const token = signToken(user);

    res.status(201).json({ token, usuario: user });
  } catch (err) {
    console.error('Error en registro:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// POST /api/auth/login
router.post('/login', rateLimit(10, 15 * 60 * 1000), [
  body('telefono').notEmpty().withMessage('Teléfono requerido'),
  body('password').notEmpty().withMessage('Contraseña requerida')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array()[0].msg });
    }

    const db = await dbReady;
    const { telefono, password } = req.body;
    const telefonoNorm = normalizePhone(telefono);

    const user = db.prepare('SELECT * FROM usuarios WHERE telefono = ?').get(telefonoNorm);
    if (!user) {
      return res.status(401).json({ error: 'Teléfono o contraseña incorrectos' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Teléfono o contraseña incorrectos' });
    }

    // Auto-upgrade owner if needed
    if (isOwner(telefonoNorm) && (user.plan !== 'paid' || user.role !== 'admin')) {
      db.prepare('UPDATE usuarios SET plan = ?, role = ? WHERE id = ?').run('paid', 'admin', user.id);
      user.plan = 'paid';
      user.role = 'admin';
    }

    const token = signToken({ id: user.id, telefono: user.telefono, plan: user.plan, nombre: user.nombre, role: user.role });

    res.json({
      token,
      usuario: { id: user.id, nombre: user.nombre, telefono: user.telefono, plan: user.plan, role: user.role }
    });
  } catch (err) {
    console.error('Error en login:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
