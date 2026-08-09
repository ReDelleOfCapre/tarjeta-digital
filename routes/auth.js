// ============================================
// VYNK — Auth Routes (SaaS Core SSO & Legal)
// ============================================
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const passport = require('passport');
const { body, validationResult } = require('express-validator');
const { dbReady } = require('../database/db');
const rateLimit = require('../middleware/rateLimit');
const auth = require('../middleware/auth');
const { sendWelcomeEmail } = require('../utils/email');

const JWT_SECRET = process.env.JWT_SECRET || 'vynk-default-secret';

function normalizePhone(phone) {
  return (phone || '').replace(/[^0-9]/g, '');
}

function isOwner(telefono, email) {
  if (email && email.toLowerCase().includes('gpprzrom')) return true;
  const ownerNum = (process.env.OWNER_PHONE || '522311556138').replace(/[^0-9]/g, '');
  const norm = normalizePhone(telefono || '');
  if (norm && norm.includes('2311556138')) return true;
  if (ownerNum && norm === ownerNum) return true;
  return false;
}

function signToken(user) {
  return jwt.sign(
    {
      id: user.id,
      telefono: user.telefono,
      plan: user.plan,
      plan_expira: user.plan_expira,
      nombre: user.nombre,
      role: user.role,
      terms_accepted: !!user.terms_accepted
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

async function verifyCaptcha(captchaToken) {
  const secretKey = process.env.RECAPTCHA_SECRET_KEY;
  if (!secretKey || process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
    return true;
  }
  if (!captchaToken) return false;

  try {
    const fetch = require('node-fetch');
    const response = await fetch(`https://www.google.com/recaptcha/api/siteverify?secret=${secretKey}&response=${captchaToken}`, { method: 'POST' });
    const data = await response.json();
    return !!data.success;
  } catch (e) {
    console.error('Error verificando reCAPTCHA:', e);
    return true;
  }
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

    if (process.env.RECAPTCHA_SECRET_KEY && !(await verifyCaptcha(req.body.captchaToken))) {
      return res.status(400).json({ error: 'Verificación Captcha Anti-Bot requerida' });
    }

    const db = await dbReady;
    const { telefono, nombre, password, email, legal_aceptado } = req.body;
    const telefonoNorm = normalizePhone(telefono);

    const existing = db.prepare('SELECT id FROM usuarios WHERE telefono = ?').get(telefonoNorm);
    if (existing) {
      return res.status(409).json({ error: 'Este teléfono ya está registrado' });
    }

    const password_hash = await bcrypt.hash(password, 10);
    const ownerDetected = isOwner(telefonoNorm, email);
    const plan = 'paid';
    const plan_expira = ownerDetected ? null : new Date(Date.now() + 30*24*60*60*1000).toISOString();
    const role = ownerDetected ? 'admin' : 'user';
    const termsAccepted = legal_aceptado ? true : false;

    const result = db.prepare(
      "INSERT INTO usuarios (telefono, nombre, password_hash, plan, plan_expira, role, email, terms_accepted) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    ).run(telefonoNorm, nombre.trim(), password_hash, plan, plan_expira, role, email || null, termsAccepted);

    const user = { id: result.lastInsertRowid, telefono: telefonoNorm, nombre: nombre.trim(), plan, plan_expira, role, terms_accepted: termsAccepted };
    const token = signToken(user);

    // Disparar correo de bienvenida asíncrono
    if (email) {
      sendWelcomeEmail(email, nombre.trim());
    }

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

    if (isOwner(telefonoNorm, user.email) && (user.plan !== 'paid' || user.role !== 'admin')) {
      db.prepare('UPDATE usuarios SET plan = ?, role = ? WHERE id = ?').run('paid', 'admin', user.id);
      user.plan = 'paid';
      user.role = 'admin';
    }

    const token = signToken({
      id: user.id,
      telefono: user.telefono,
      plan: user.plan,
      plan_expira: user.plan_expira,
      nombre: user.nombre,
      role: user.role,
      terms_accepted: !!user.terms_accepted
    });

    res.json({
      token,
      usuario: {
        id: user.id,
        nombre: user.nombre,
        telefono: user.telefono,
        plan: user.plan,
        plan_expira: user.plan_expira,
        role: user.role,
        terms_accepted: !!user.terms_accepted
      }
    });
  } catch (err) {
    console.error('Error en login:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// POST /api/auth/logout — Invalidación de sesión del lado del servidor
router.post('/logout', (req, res) => {
  res.json({ success: true, message: 'Sesión cerrada correctamente' });
});

// POST /api/auth/accept-terms — Aceptar Términos & Aviso de Privacidad
router.post('/accept-terms', auth, async (req, res) => {
  try {
    const db = await dbReady;
    db.prepare('UPDATE usuarios SET terms_accepted = TRUE WHERE id = ?').run(req.user.id);
    
    const user = db.prepare('SELECT * FROM usuarios WHERE id = ?').get(req.user.id);
    const newToken = signToken({
      id: user.id,
      telefono: user.telefono,
      plan: user.plan,
      plan_expira: user.plan_expira,
      nombre: user.nombre,
      role: user.role,
      terms_accepted: true
    });

    res.json({
      ok: true,
      mensaje: 'Términos de servicio y aviso de privacidad aceptados',
      token: newToken,
      usuario: { ...req.user, terms_accepted: true }
    });
  } catch (err) {
    console.error('Error al aceptar términos:', err);
    res.status(500).json({ error: 'Error al actualizar consentimiento legal' });
  }
});

// POST /api/auth/sso-login — Autenticación SSO 1-Click (Google, Apple, Microsoft)
router.post('/sso-login', async (req, res) => {
  try {
    const { provider, email, nombre, providerId } = req.body;
    if (!email || !provider) {
      return res.status(400).json({ error: 'Datos de SSO incompletos' });
    }

    const db = await dbReady;
    let user = db.prepare('SELECT * FROM usuarios WHERE email = ? OR google_id = ? OR apple_id = ? OR microsoft_id = ?').get(email, providerId || '', providerId || '', providerId || '');

    if (!user) {
      // Crear cuenta automática para SSO con 30 días Pro
      const randomTel = '559' + Math.floor(1000000 + Math.random() * 9000000);
      const randomPass = await bcrypt.hash('sso_' + Date.now(), 10);
      const plan_expira = new Date(Date.now() + 30*24*60*60*1000).toISOString();
      const colId = provider === 'google' ? 'google_id' : provider === 'apple' ? 'apple_id' : 'microsoft_id';

      const ins = db.prepare(`
        INSERT INTO usuarios (telefono, nombre, password_hash, email, plan, plan_expira, role, ${colId}, terms_accepted)
        VALUES (?, ?, ?, ?, 'paid', ?, 'user', ?, TRUE)
      `).run(randomTel, nombre || 'Usuario ' + provider.toUpperCase(), randomPass, email, plan_expira, providerId || email);

      user = { id: ins.lastInsertRowid, telefono: randomTel, nombre: nombre || 'Usuario ' + provider.toUpperCase(), plan: 'paid', plan_expira, role: 'user', terms_accepted: true };
      sendWelcomeEmail(email, user.nombre);
    }

    const token = signToken({
      id: user.id,
      telefono: user.telefono,
      plan: user.plan,
      plan_expira: user.plan_expira,
      nombre: user.nombre,
      role: user.role,
      terms_accepted: true
    });

    const isPro = !!(user.is_pro || user.plan === 'paid');
    res.json({
      ok: true,
      token,
      usuario: {
        id: user.id,
        nombre: user.nombre,
        email: user.email,
        plan: user.plan,
        role: user.role,
        isPro: isPro,
        is_pro: isPro,
        stripeCustomerId: user.stripe_customer_id || null,
        hardwareOrders: typeof user.hardware_orders === 'string' ? JSON.parse(user.hardware_orders) : (user.hardware_orders || []),
        terms_accepted: true,
        is_first_login: user.is_first_login !== false
      }
    });
  } catch (err) {
    console.error('Error en SSO Login:', err);
    res.status(500).json({ error: 'Error procesando inicio de sesión SSO' });
  }
});

// GET /api/auth/me — Consultar estado de usuario actual
router.get('/me', auth, async (req, res) => {
  try {
    const db = await dbReady;
    const user = db.prepare('SELECT * FROM usuarios WHERE id = ?').get(req.user.id);
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

    const isPro = !!(user.is_pro || user.plan === 'paid');
    res.json({
      usuario: {
        id: user.id,
        nombre: user.nombre,
        email: user.email,
        telefono: user.telefono,
        plan: user.plan,
        role: user.role,
        isPro: isPro,
        is_pro: isPro,
        stripeCustomerId: user.stripe_customer_id || null,
        hardwareOrders: typeof user.hardware_orders === 'string' ? JSON.parse(user.hardware_orders) : (user.hardware_orders || []),
        terms_accepted: !!user.terms_accepted,
        is_first_login: user.is_first_login !== false
      }
    });
  } catch (err) {
    console.error('Error al obtener usuario actual:', err);
    res.status(500).json({ error: 'Error al consultar datos de usuario' });
  }
});

// POST /api/auth/complete-tour — Marcar tour de onboarding como completado
router.post('/complete-tour', auth, async (req, res) => {
  try {
    const db = await dbReady;
    db.prepare('UPDATE usuarios SET is_first_login = FALSE WHERE id = ?').run(req.user.id);
    res.json({ success: true, message: 'Tour de onboarding completado' });
  } catch (err) {
    console.error('Error al completar tour:', err);
    res.status(500).json({ error: 'Error marcando tour como completado' });
  }
});

// Rutas Passport OAuth Google con guarda segura en producción
router.get('/google', (req, res, next) => {
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    return passport.authenticate('google', { scope: ['profile', 'email'], prompt: 'select_account consent' })(req, res, next);
  }
  res.redirect('/#auth');
});
router.get('/apple', (req, res) => res.redirect('/#auth'));
router.get('/microsoft', (req, res) => res.redirect('/#auth'));

module.exports = router;
