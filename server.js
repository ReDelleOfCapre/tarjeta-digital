require('dotenv').config();

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// Importar promesa de inicialización de la base de datos
const { initPromise: dbReady } = require('./database/db');

// Importar rutas
const authRoutes = require('./routes/auth');
const perfilesRoutes = require('./routes/perfiles');
const { perfilPublicoHandler } = require('./routes/perfiles');
const camposRoutes = require('./routes/campos');
const archivosRoutes = require('./routes/archivos');
const estadisticasRoutes = require('./routes/estadisticas');
const adminRoutes = require('./routes/admin');
const bloquesRoutes = require('./routes/bloques');
const suscriptoresRoutes = require('./routes/suscriptores');
const workspacesRoutes = require('./routes/workspaces');
const intelligenceRoutes = require('./routes/intelligence');

const app = express();
const PORT = process.env.PORT || 3000;
const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';
const STARTED_AT = Date.now();

// Garantizar existencia de directorios de carga en arranque (Acción Preventiva)
try {
  if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  const publicUploads = path.join(__dirname, 'public', 'uploads');
  if (!fs.existsSync(publicUploads)) fs.mkdirSync(publicUploads, { recursive: true });
} catch (e) {
  console.error('Error al inicializar directorios de cargas:', e);
}

// =============================================
// Guards de proceso — estabilidad preventiva
// =============================================
process.on('unhandledRejection', (reason) => {
  console.error('⚠️ Promesa no manejada (el proceso continúa):', reason);
});

process.on('uncaughtException', (err) => {
  console.error('⚠️ Excepción no capturada (el proceso continúa):', err);
});

process.on('warning', (warning) => {
  if (warning && warning.name === 'MaxListenersExceededWarning') return;
  console.warn('⚠️ Warning:', warning && warning.message || warning);
});

// =============================================
// Middlewares globales
// =============================================

// Seguridad HTTP con CSP optimizado y flexible para imágenes, CDNs, scripts inline y Service Worker
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'", "https:", "http:", "data:", "blob:"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https:", "http:"],
      scriptSrcElem: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https:", "http:"],
      scriptSrcAttr: ["'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https:", "http:"],
      styleSrcElem: ["'self'", "'unsafe-inline'", "https:", "http:"],
      styleSrcAttr: ["'unsafe-inline'"],
      fontSrc: ["'self'", "data:", "https:", "http:"],
      imgSrc: ["'self'", "data:", "blob:", "https:", "http:"],
      frameSrc: ["'self'", "https:", "http:"],
      connectSrc: ["'self'", "https:", "http:", "wss:", "ws:"],
      objectSrc: ["'none'"]
    }
  },
  crossOriginEmbedderPolicy: false
}));


// =============================================
// Stripe Webhook (Requiere raw body con express.raw antes de express.json)
// =============================================
app.post('/api/webhook/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  // Sin secreto de webhook no confiamos en el cuerpo: rechazamos en vez de
  // cumplir pedidos con eventos no verificados (§36, §57).
  if (!endpointSecret) {
    console.warn('⚠️ Webhook Stripe rechazado: falta STRIPE_WEBHOOK_SECRET en el entorno.');
    return res.status(400).send('Webhook no configurado.');
  }
  const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

  let event;
  const signature = req.headers['stripe-signature'];
  try {
    event = stripe.webhooks.constructEvent(req.body, signature, endpointSecret);
  } catch (err) {
    console.error('⚠️ Error de verificación de firma del Webhook de Stripe:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Responder 200 OK rápidamente para evitar reintentos redundantes de Stripe
  res.status(200).json({ received: true });

  // Lógica de Cumplimiento Automático (Fulfillment)
  if (event && event.type === 'checkout.session.completed') {
    const session = event.data ? event.data.object : {};
    const { db } = require('./database/db');
    const customerEmail = session.customer_details?.email || session.customer_email;

    try {
      if (session.mode === 'subscription') {
        console.log(`⚡ Fulfillment Pro activado para ${customerEmail}`);
        if (customerEmail) {
          await db.prepare(
            "UPDATE usuarios SET is_pro = TRUE, plan = 'paid', stripe_customer_id = ? WHERE email = ? OR LOWER(email) = LOWER(?)"
          ).run(session.customer || '', customerEmail, customerEmail);
        }
      } else if (session.mode === 'payment') {
        const shipping = session.shipping_details || session.shipping || {};
        console.log(`📦 Fulfillment de Hardware NFC registrado para ${customerEmail}:`, shipping);

        const orderRecord = {
          id: session.id,
          amount: session.amount_total,
          currency: session.currency,
          shipping: shipping,
          created_at: new Date()
        };

        if (customerEmail) {
          await db.prepare(`
            UPDATE usuarios
            SET hardware_orders = COALESCE(hardware_orders, '[]'::jsonb) || ?::jsonb,
                stripe_customer_id = COALESCE(stripe_customer_id, ?)
            WHERE email = ? OR LOWER(email) = LOWER(?)
          `).run(JSON.stringify([orderRecord]), session.customer || '', customerEmail, customerEmail);
        }
      }
    } catch (e) {
      console.error('❌ Error en Fulfillment de Webhook:', e);
    }
  }
});

// Parseo de JSON con límite de 10MB
app.use(express.json({ limit: '10mb' }));

// Parseo de URL-encoded (para formularios)
app.use(express.urlencoded({ extended: true }));

// =============================================
// Interceptar Rutas de Admin (Bloqueo de Acceso Público Estático)
// =============================================
app.get(['/admin-login', '/admin-login.html'], (req, res) => {
  res.sendFile(path.join(process.cwd(), 'views', 'admin-login.html'));
});

app.get(['/admin', '/admin.html'], (req, res) => {
  res.sendFile(path.join(process.cwd(), 'views', 'admin.html'));
});

// Rutas Legales
app.get(['/privacidad', '/privacidad.html'], (req, res) => {
  res.sendFile(path.join(process.cwd(), 'public', 'legal.html'));
});

app.get(['/terminos', '/terminos.html'], (req, res) => {
  res.sendFile(path.join(process.cwd(), 'public', 'legal.html'));
});

// Alias amigable: /editor → editor.html (el archivo estático sí se sirve)
app.get('/editor', (req, res) => {
  res.redirect(301, '/editor.html');
});

// Endpoint de monitoreo / Health Check para Render y Uptime Checks
app.get(['/health', '/api/health'], (req, res) => {
  res.status(200).json({ status: 'ok', uptime: process.uptime(), timestamp: Date.now() });
});

// =============================================
// Archivos estáticos
// =============================================

// Servir frontend estático
app.use(express.static(path.join(process.cwd(), 'public')));

// Composition Engine isomórfico (una sola fuente de verdad en shared/):
// el mismo módulo lo consume Node (motor de inteligencia) y el navegador.
app.get('/js/vynk-composition.js', (req, res) => {
  res.type('application/javascript');
  res.sendFile(path.join(process.cwd(), 'shared', 'vynk-composition.js'));
});

// Experience Engine isomórfico (Revolución de Diseño): decisiones de diseño
// deterministas (arquetipo, jerarquía, patrones, fondo, motion, contraste).
app.get('/js/vynk-experience.js', (req, res) => {
  res.type('application/javascript');
  res.sendFile(path.join(process.cwd(), 'shared', 'vynk-experience.js'));
});

// Servir archivos subidos
app.use('/uploads', express.static(path.resolve(UPLOAD_DIR)));

// Servir fallback SVG de avatar si el archivo subido no existe en disco (Acción Preventiva)
app.use('/uploads', (req, res) => {
  res.setHeader('Content-Type', 'image/svg+xml');
  res.send(`<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" stroke-width="1.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`);
});

// =============================================
// Rutas de la API
// =============================================

app.use('/api/auth', authRoutes);
app.use('/api/perfiles', perfilesRoutes);
app.use('/api', camposRoutes);
app.use('/api', archivosRoutes);
app.use('/api/estadisticas', estadisticasRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api', bloquesRoutes);
app.use('/api', suscriptoresRoutes);
app.use('/api/workspaces', workspacesRoutes);
app.use('/api/intelligence', intelligenceRoutes);

const pagosRoutes = require('./routes/pagos');
app.use('/api/pagos', pagosRoutes);

const { fetchUrlMetadata } = require('./services/metadataService');
app.post('/api/metadata', async (req, res) => {
  try {
    const { url } = req.body || {};
    if (!url) return res.status(400).json({ error: 'URL requerida' });
    const meta = await fetchUrlMetadata(url);
    res.json(meta);
  } catch(err) {
    res.status(500).json({ error: 'Error al consultar metadata', title: '', description: '', image: '', favicon: '' });
  }
});

// POST /api/metadata/analyze-connections — Lector y Analizador Inteligente de Conexiones & Enlaces en Lote
app.post('/api/metadata/analyze-connections', async (req, res) => {
  try {
    const { urls } = req.body || {};
    if (!urls || !Array.isArray(urls)) {
      return res.status(400).json({ error: 'Se requiere un arreglo de URLs para analizar' });
    }

    const cleanUrls = urls.filter(u => typeof u === 'string' && u.trim().length > 0).slice(0, 20);
    const resultados = await Promise.all(
      cleanUrls.map(async (u) => {
        const meta = await fetchUrlMetadata(u);
        return {
          url: u,
          ...meta
        };
      })
    );

    res.json({
      ok: true,
      total_analizadas: resultados.length,
      conexiones: resultados
    });
  } catch (err) {
    console.error('Error analizando lote de conexiones:', err);
    res.status(500).json({ error: 'Error al procesar lote de metadatos' });
  }
});

// =============================================
// Motor Transaccional B2B & Growth Loop Invitaciones
// =============================================
const { sendOnboardingEmail, sendInviteEmail } = require('./services/emailService');

app.post('/api/onboarding', async (req, res) => {
  try {
    const { email, nombre, profileUrl } = req.body || {};
    if (!email) return res.status(400).json({ error: 'Se requiere un correo electrónico' });

    await sendOnboardingEmail(email, nombre, profileUrl);
    res.json({ success: true, message: 'Correo de bienvenida y onboarding enviado correctamente' });
  } catch (err) {
    console.error('❌ Error enviando onboarding:', err);
    res.status(500).json({ error: 'Error enviando correo de onboarding' });
  }
});

app.post('/api/invite', async (req, res) => {
  try {
    const { email, senderName } = req.body || {};
    if (!email) return res.status(400).json({ error: 'Ingresa un correo electrónico de destino' });

    const inviteToken = 'vynk_' + crypto.randomBytes(24).toString('hex');
    await sendInviteEmail(email, senderName || 'Colega VYNK', inviteToken);

    res.json({
      success: true,
      message: `Invitación enviada exitosamente a ${email}`,
      inviteToken
    });
  } catch (err) {
    console.error('❌ Error enviando invitación:', err);
    res.status(500).json({ error: 'Error enviando invitación' });
  }
});

// =============================================
// Stripe Transaccional: Subscripciones Pro y Venta de Hardware NFC
// =============================================
const { createCheckoutSession } = require('./services/stripeService');

app.post('/api/create-checkout-session', async (req, res) => {
  try {
    const { productId, title, price, type } = req.body || {};
    const origin = req.headers.origin || `${req.protocol}://${req.get('host')}`;

    const session = await createCheckoutSession({
      productId,
      title,
      price,
      type: type || (productId && productId.includes('plan') ? 'subscription' : 'payment'),
      origin
    });

    if (!session.url) {
      return res.status(503).json({ success: false, error: session.error || 'Pagos no configurados.' });
    }

    res.json({ success: true, url: session.url });
  } catch (err) {
    console.error('❌ Error en Stripe Checkout endpoint:', err);
    res.status(500).json({ error: 'Error procesando la sesión de pago' });
  }
});

// =============================================
// Ruta pública de perfiles
// =============================================

app.get(['/u/:slug', '/v/:slug', '/p/:id', '/p/:slug'], perfilPublicoHandler);

// =============================================
// Crear directorio de uploads si no existe
// =============================================

if (!fs.existsSync(path.resolve(UPLOAD_DIR))) {
  fs.mkdirSync(path.resolve(UPLOAD_DIR), { recursive: true });
  console.log(`📁 Directorio de uploads creado: ${path.resolve(UPLOAD_DIR)}`);
}

// Crear directorio de views si no existe
const viewsDir = path.join(process.cwd(), 'views');
if (!fs.existsSync(viewsDir)) {
  fs.mkdirSync(viewsDir, { recursive: true });
}

// =============================================
// Health check — estado de la API
// =============================================

const { version } = require('./package.json');

app.get('/api/health', async (req, res) => {
  const base = {
    ok: true,
    service: 'vynk',
    uptime: Math.round((Date.now() - STARTED_AT) / 1000),
    timestamp: new Date().toISOString(),
    version: version
  };
  try {
    const db = await dbReady;
    await db.prepare('SELECT 1 AS ok').get();
    res.json({ ...base, db: 'connected' });
  } catch (err) {
    console.error('❌ Health check: DB no disponible:', err.message);
    res.status(503).json({ ...base, ok: false, db: 'error', error: err.message });
  }
});

// =============================================
// Manejador de errores global
// =============================================

app.use((err, req, res, next) => {
  console.error('❌ Error no manejado:', err);

  // Errores de Multer
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      error: 'El archivo excede el tamaño máximo permitido.'
    });
  }

  res.status(500).json({
    error: 'Error interno del servidor. Intenta de nuevo más tarde.'
  });
});

// =============================================
// Iniciar servidor (esperar a que la DB esté lista)
// =============================================

async function start() {
  try {
    await dbReady;
    console.log('✅ Base de datos conectada');

    app.listen(PORT, () => {
      console.log('');
      console.log('╔════════════════════════════════════════════╗');
      console.log('║          ⚡ VYNK — Backend                  ║');
      console.log('╠════════════════════════════════════════════╣');
      console.log(`║  🌐 Servidor: http://localhost:${PORT}        ║`);
      console.log(`║  📁 Uploads:  ${path.resolve(UPLOAD_DIR)}`);
      console.log(`║  🗄️  Base datos: ${process.env.DB_PATH || './database/tarjeta.db'}`);
      console.log('╚════════════════════════════════════════════╝');
      console.log('');
    });
  } catch (err) {
    console.error('❌ Error al iniciar:', err);
    process.exit(1);
  }
}

start();

module.exports = app;
