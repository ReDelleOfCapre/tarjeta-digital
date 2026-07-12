require('dotenv').config();

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

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

const app = express();
const PORT = process.env.PORT || 3000;
const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';

// =============================================
// Middlewares globales
// =============================================

// Seguridad HTTP (CSP deshabilitado para permitir inline styles/scripts en perfil público)
app.use(helmet({ contentSecurityPolicy: false }));

// CORS
app.use(cors());

// Parseo de JSON con límite de 10MB
app.use(express.json({ limit: '10mb' }));

// Parseo de URL-encoded (para formularios)
app.use(express.urlencoded({ extended: true }));

// =============================================
// Archivos estáticos
// =============================================

// Servir frontend estático
app.use(express.static(path.join(process.cwd(), 'public')));

// Servir archivos subidos
app.use('/uploads', express.static(path.resolve(UPLOAD_DIR)));

// =============================================
// Rutas de la API
// =============================================

app.use('/api/auth', authRoutes);
app.use('/api/perfiles', perfilesRoutes);
app.use('/api', camposRoutes);
app.use('/api', archivosRoutes);
app.use('/api/estadisticas', estadisticasRoutes);
app.use('/api/admin', adminRoutes);

// =============================================
// Ruta pública de perfiles
// =============================================

app.get('/u/:slug', perfilPublicoHandler);

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
      console.log('║       📇 TarjetaDigital - Backend          ║');
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
