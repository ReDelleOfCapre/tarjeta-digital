const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const db = require('../database/db');
const createRateLimit = require('../middleware/rateLimit');

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRY = '7d';

/**
 * POST /api/auth/registro
 * Registrar un nuevo usuario.
 */
router.post(
  '/registro',
  [
    body('telefono')
      .notEmpty().withMessage('El teléfono es obligatorio.')
      .isLength({ min: 10, max: 15 }).withMessage('El teléfono debe tener entre 10 y 15 caracteres.'),
    body('nombre')
      .notEmpty().withMessage('El nombre es obligatorio.')
      .trim()
      .isLength({ min: 2, max: 50 }).withMessage('El nombre debe tener entre 2 y 50 caracteres.'),
    body('password')
      .isLength({ min: 6 }).withMessage('La contraseña debe tener al menos 6 caracteres.')
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Datos de registro inválidos.',
        detalles: errors.array().map(e => e.msg)
      });
    }

    const { telefono, nombre, password } = req.body;

    // Verificar si el teléfono ya está registrado
    const existingUser = db.prepare('SELECT id FROM usuarios WHERE telefono = ?').get(telefono);
    if (existingUser) {
      return res.status(409).json({
        error: 'Este número de teléfono ya está registrado.'
      });
    }

    // Hashear contraseña
    const password_hash = bcrypt.hashSync(password, 10);

    // Insertar usuario
    const result = db.prepare(
      'INSERT INTO usuarios (telefono, nombre, password_hash) VALUES (?, ?, ?)'
    ).run(telefono, nombre, password_hash);

    const usuario = {
      id: result.lastInsertRowid,
      nombre,
      telefono,
      plan: 'free'
    };

    // Generar JWT
    const token = jwt.sign(
      { id: usuario.id, telefono: usuario.telefono, plan: usuario.plan, nombre: usuario.nombre },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRY }
    );

    res.status(201).json({ token, usuario });
  }
);

/**
 * POST /api/auth/login
 * Iniciar sesión con teléfono y contraseña.
 */
router.post(
  '/login',
  createRateLimit(5, 15 * 60 * 1000),
  [
    body('telefono').notEmpty().withMessage('El teléfono es obligatorio.'),
    body('password').notEmpty().withMessage('La contraseña es obligatoria.')
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Datos de inicio de sesión inválidos.',
        detalles: errors.array().map(e => e.msg)
      });
    }

    const { telefono, password } = req.body;

    // Buscar usuario por teléfono
    const user = db.prepare(
      'SELECT id, telefono, nombre, password_hash, plan FROM usuarios WHERE telefono = ?'
    ).get(telefono);

    if (!user) {
      return res.status(401).json({
        error: 'Teléfono o contraseña incorrectos.'
      });
    }

    // Verificar contraseña
    const isValid = bcrypt.compareSync(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({
        error: 'Teléfono o contraseña incorrectos.'
      });
    }

    const usuario = {
      id: user.id,
      nombre: user.nombre,
      telefono: user.telefono,
      plan: user.plan
    };

    // Generar JWT
    const token = jwt.sign(
      { id: usuario.id, telefono: usuario.telefono, plan: usuario.plan, nombre: usuario.nombre },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRY }
    );

    res.json({ token, usuario });
  }
);

module.exports = router;
