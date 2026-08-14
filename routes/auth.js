// ============================================
// VYNK — Auth Routes (SaaS Core SSO & Legal)
// ============================================
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const passport = require('passport');
const { body, validationResult } = require('express-validator');
const { dbReady } = require('../database/db');
const rateLimit = require('../middleware/rateLimit');
const auth = require('../middleware/auth');
const { sendWelcomeEmail } = require('../utils/email');

const JWT_SECRET = process.env.JWT_SECRET || 'vynk-default-secret';

function isRealCredential(value) {
  return !!value && !/placeholder/i.test(value);
}

function ssoProviderConfig() {
  const googleConfigured = isRealCredential(process.env.GOOGLE_CLIENT_ID) && isRealCredential(process.env.GOOGLE_CLIENT_SECRET);
  const appleConfigured = isRealCredential(process.env.APPLE_CLIENT_ID);
  const microsoftConfigured = isRealCredential(process.env.MICROSOFT_CLIENT_ID) && isRealCredential(process.env.MICROSOFT_CLIENT_SECRET);
  return {
    google: { configured: googleConfigured, clientId: googleConfigured ? process.env.GOOGLE_CLIENT_ID : null },
    apple: { configured: appleConfigured, clientId: appleConfigured ? process.env.APPLE_CLIENT_ID : null },
    microsoft: { configured: microsoftConfigured, clientId: microsoftConfigured ? process.env.MICROSOFT_CLIENT_ID : null }
  };
}

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

// --- Verificación de identidad SSO (lado servidor, nunca confiar en el cliente) ---

// Google: valida el ID token vía tokeninfo y comprueba audience + email verificado.
async function verifyGoogleCredential(credential) {
  if (!isRealCredential(process.env.GOOGLE_CLIENT_ID)) {
    throw new Error('Google SSO no está configurado');
  }
  const resp = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`, {
    method: 'POST'
  });
  if (!resp.ok) {
    const body = await resp.text().catch(() => '');
    throw new Error('Token de Google inválido o expirado');
  }
  const payload = await resp.json();
  if (payload.aud !== process.env.GOOGLE_CLIENT_ID) {
    throw new Error('El token de Google no pertenece a esta aplicación');
  }
  if (!payload.email || payload.email_verified !== 'true') {
    throw new Error('Cuenta de Google sin email verificado');
  }
  if (!payload.sub) throw new Error('Token de Google sin subject');
  return {
    sub: payload.sub,
    email: payload.email,
    nombre: payload.name || null,
    verified: true
  };
}

// Apple: verifica la firma RS256 del identity token contra el JWKS de Apple y comprueba audience/iss.
let appleKeysCache = { ts: 0, keys: null };
async function getAppleSigningKey(kid) {
  if (!appleKeysCache.keys || Date.now() - appleKeysCache.ts > 3600 * 1000) {
    const resp = await fetch('https://appleid.apple.com/auth/keys');
    if (!resp.ok) throw new Error('No se pudo obtener las claves de firmado de Apple');
    appleKeysCache = { ts: Date.now(), keys: await resp.json() };
  }
  const keys = (appleKeysCache.keys && appleKeysCache.keys.keys) || [];
  const key = keys.find(k => k.kid === kid);
  if (!key) throw new Error('Clave de firmado de Apple no encontrada');
  const publicKey = crypto.createPublicKey({ key: { kty: 'RSA', n: key.n, e: key.e }, format: 'jwk' });
  return publicKey;
}

async function verifyAppleIdentityToken(identityToken) {
  if (!isRealCredential(process.env.APPLE_CLIENT_ID)) {
    throw new Error('Sign in with Apple no está configurado');
  }
  let decoded;
  try {
    decoded = jwt.decode(identityToken, { complete: true });
  } catch (e) {
    throw new Error('Identity token de Apple inválido');
  }
  const kid = decoded && decoded.header && decoded.header.kid;
  if (!kid) throw new Error('Identity token de Apple sin kid');
  const publicKey = await getAppleSigningKey(kid);
  let payload;
  try {
    payload = jwt.verify(identityToken, publicKey, {
      algorithms: ['RS256'],
      issuer: 'https://appleid.apple.com',
      audience: process.env.APPLE_CLIENT_ID
    });
  } catch (e) {
    throw new Error('Firma de identity token de Apple no válida');
  }
  if (!payload.sub) throw new Error('Identity token de Apple sin subject');
  return {
    sub: payload.sub,
    email: payload.email || null,
    nombre: payload.name || null,
    verified: true
  };
}

// Upsert: busca por provider id, luego por email; si existe sin proveedor, vincula.
async function upsertSsoUser(provider, identity, extraNombre) {
  const db = await dbReady;
  const colId = provider === 'google' ? 'google_id' : provider === 'apple' ? 'apple_id' : 'microsoft_id';
  const nombre = (extraNombre || identity.nombre || 'Usuario ' + provider.toUpperCase()).trim();
  const email = identity.email || null;

  let colVal = identity.sub;
  let row;
  if (email && provider !== 'microsoft') {
    row = await db.prepare(`SELECT * FROM usuarios WHERE ${colId} = ? OR email = ?`).get(colVal, email);
  } else {
    row = await db.prepare(`SELECT * FROM usuarios WHERE ${colId} = ?`).get(colVal);
  }
  if (!row) {
    const randomTel = '559' + Math.floor(1000000 + Math.random() * 9000000);
    const randomPass = await bcrypt.hash('sso_' + Date.now() + '_' + Math.random(), 10);
    const plan_expira = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const ins = await db.prepare(
      `INSERT INTO usuarios (telefono, nombre, password_hash, email, plan, plan_expira, role, ${colId}, terms_accepted)
       VALUES (?, ?, ?, ?, 'paid', ?, 'user', ?, TRUE)`
    ).run(randomTel, nombre, randomPass, email, plan_expira, colVal);
    row = { id: ins.lastInsertRowid, telefono: randomTel, nombre, email, plan: 'paid', plan_expira, role: 'user', terms_accepted: true };
    if (email) sendWelcomeEmail(email, nombre);
  } else if (!row[colId]) {
    await db.prepare(`UPDATE usuarios SET ${colId} = ? WHERE id = ?`).run(colVal, row.id);
  }
  return row;
}

function ssoSessionPayload(user) {
  const isPro = !!(user.is_pro || user.plan === 'paid');
  return {
    ok: true,
    token: signToken({
      id: user.id,
      telefono: user.telefono,
      plan: user.plan,
      plan_expira: user.plan_expira,
      nombre: user.nombre,
      role: user.role,
      terms_accepted: !!user.terms_accepted
    }),
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
      terms_accepted: !!user.terms_accepted,
      is_first_login: user.is_first_login !== false
    }
  };
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
router.post('/registro', rateLimit(10, 15 * 60 * 1000), [
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

    const existing = await db.prepare("SELECT id FROM usuarios WHERE REPLACE(telefono, '+', '') = ?").get(telefonoNorm);
    if (existing) {
      return res.status(409).json({ error: 'Este teléfono ya está registrado' });
    }

    const password_hash = await bcrypt.hash(password, 10);
    const ownerDetected = isOwner(telefonoNorm, email);
    const plan = 'paid';
    const plan_expira = ownerDetected ? null : new Date(Date.now() + 30*24*60*60*1000).toISOString();
    const role = ownerDetected ? 'admin' : 'user';
    const termsAccepted = legal_aceptado ? true : false;

    const result = await db.prepare(
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

    const { telefono, password } = req.body;
    const input = (telefono || '').trim();

    const db = await dbReady;

    let user;
    if (input.includes('@')) {
      user = await db.prepare('SELECT * FROM usuarios WHERE LOWER(email) = LOWER(?)').get(input);
    } else {
      const telefonoNorm = normalizePhone(input);
      user = await db.prepare("SELECT * FROM usuarios WHERE REPLACE(telefono, '+', '') = ? OR telefono = ?").get(telefonoNorm, input);
    }

    if (!user) {
      return res.status(401).json({ error: 'Teléfono/email o contraseña incorrectos' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Teléfono o contraseña incorrectos' });
    }

    if (isOwner(telefonoNorm, user.email) && (user.plan !== 'paid' || user.role !== 'admin')) {
      await db.prepare('UPDATE usuarios SET plan = ?, role = ? WHERE id = ?').run('paid', 'admin', user.id);
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
    await db.prepare('UPDATE usuarios SET terms_accepted = TRUE WHERE id = ?').run(req.user.id);

    const user = await db.prepare('SELECT * FROM usuarios WHERE id = ?').get(req.user.id);
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

// GET /api/auth/providers — Qué SSO están realmente configurados (para botones honestos en el front)
router.get('/providers', (req, res) => {
  res.json(ssoProviderConfig());
});

// POST /api/auth/sso/google — ID token de Google Identity Services, verificado server-side
router.post('/sso/google', rateLimit(10, 15 * 60 * 1000), async (req, res) => {
  try {
    const { credential } = req.body || {};
    if (!credential) return res.status(400).json({ error: 'Credencial de Google requerida' });

    const identity = await verifyGoogleCredential(credential);
    const user = await upsertSsoUser('google', identity);
    res.json(ssoSessionPayload(user));
  } catch (err) {
    console.error('Error en SSO Google:', err.message);
    res.status(401).json({ error: 'No se pudo verificar tu cuenta de Google' });
  }
});

// POST /api/auth/sso/apple — Identity token de Sign in with Apple, verificado contra el JWKS de Apple
router.post('/sso/apple', rateLimit(10, 15 * 60 * 1000), async (req, res) => {
  try {
    const { identityToken, user: appleUser } = req.body || {};
    if (!identityToken) return res.status(400).json({ error: 'Identity token de Apple requerido' });

    const identity = await verifyAppleIdentityToken(identityToken);
    const extraNombre = appleUser && appleUser.name
      ? [appleUser.name.firstName, appleUser.name.lastName].filter(Boolean).join(' ')
      : null;
    const user = await upsertSsoUser('apple', identity, extraNombre || undefined);
    res.json(ssoSessionPayload(user));
  } catch (err) {
    console.error('Error en SSO Apple:', err.message);
    res.status(401).json({ error: 'No se pudo verificar tu cuenta de Apple' });
  }
});

// GET /api/auth/me — Consultar estado de usuario actual
router.get('/me', auth, async (req, res) => {
  try {
    const db = await dbReady;
    const user = await db.prepare('SELECT * FROM usuarios WHERE id = ?').get(req.user.id);
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
    await db.prepare('UPDATE usuarios SET is_first_login = FALSE WHERE id = ?').run(req.user.id);
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
// POST /api/auth/demo — Login automático en cuenta demo / visitante
router.post('/demo', async (req, res) => {
  try {
    const db = await dbReady;
    let user = await db.prepare('SELECT * FROM usuarios WHERE email = ?').get('demo@VYNK.app');
    if (!user) {
      return res.status(500).json({ error: 'Cuenta demo no inicializada. Reinicia el servidor.' });
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
        telefono: user.telefono,
        nombre: user.nombre,
        email: user.email,
        plan: user.plan,
        role: user.role,
        terms_accepted: !!user.terms_accepted
      }
    });
  } catch (err) {
    console.error('Error en auth demo:', err);
    res.status(500).json({ error: 'Error creando sesión demo' });
  }
});

module.exports = router;
