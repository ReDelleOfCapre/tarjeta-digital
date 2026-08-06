-- ============================================
-- My ID — Database Schema
-- ============================================

PRAGMA foreign_keys = ON;

-- Usuarios
CREATE TABLE IF NOT EXISTS usuarios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  telefono TEXT UNIQUE NOT NULL,
  nombre TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  email TEXT,
  plan TEXT DEFAULT 'free' CHECK(plan IN ('free','paid')),
  plan_expira TEXT,
  role TEXT DEFAULT 'user' CHECK(role IN ('user','admin')),
  fecha_registro TEXT DEFAULT (datetime('now')),
  acciones_restantes INTEGER DEFAULT 5,
  ultimo_reset TEXT DEFAULT (datetime('now'))
);

-- Perfiles (tarjetas)
CREATE TABLE IF NOT EXISTS perfiles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  slug TEXT UNIQUE NOT NULL,
  nombre_perfil TEXT NOT NULL,
  tipo TEXT DEFAULT 'personal',
  foto_url TEXT,
  color TEXT DEFAULT '#007AFF',
  tema TEXT DEFAULT 'auto',
  tema_id INTEGER DEFAULT NULL,
  bio TEXT,
  cumpleanos TEXT,
  lugar_estudio TEXT,
  pronombres TEXT,
  visitas INTEGER DEFAULT 0,
  fecha_creacion TEXT DEFAULT (datetime('now'))
);

-- Campos de contacto (expandido a 30+ tipos)
CREATE TABLE IF NOT EXISTS campos_contacto (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  perfil_id INTEGER NOT NULL REFERENCES perfiles(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL,
  valor TEXT NOT NULL,
  etiqueta TEXT,
  orden INTEGER DEFAULT 0
);

-- Bloques (v3 block editor)
CREATE TABLE IF NOT EXISTS bloques (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  perfil_id INTEGER NOT NULL REFERENCES perfiles(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL,
  contenido TEXT NOT NULL DEFAULT '{}',
  orden INTEGER DEFAULT 0,
  visible INTEGER DEFAULT 1,
  fecha_creacion TEXT DEFAULT (datetime('now'))
);

-- Suscriptores (email capture)
CREATE TABLE IF NOT EXISTS suscriptores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  perfil_id INTEGER NOT NULL REFERENCES perfiles(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  nombre TEXT,
  fecha TEXT DEFAULT (datetime('now')),
  UNIQUE(perfil_id, email)
);

-- Temas
CREATE TABLE IF NOT EXISTS temas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL,
  tipo TEXT DEFAULT 'preset',
  config TEXT NOT NULL DEFAULT '{}',
  premium INTEGER DEFAULT 0
);

-- Archivos
CREATE TABLE IF NOT EXISTS archivos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  perfil_id INTEGER NOT NULL REFERENCES perfiles(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL,
  nombre TEXT NOT NULL,
  url TEXT NOT NULL,
  tamano INTEGER DEFAULT 0,
  fecha_subida TEXT DEFAULT (datetime('now'))
);

-- Estadísticas
CREATE TABLE IF NOT EXISTS estadisticas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  perfil_id INTEGER NOT NULL REFERENCES perfiles(id) ON DELETE CASCADE,
  evento TEXT NOT NULL,
  ip_hash TEXT,
  user_agent TEXT,
  fecha TEXT DEFAULT (datetime('now'))
);

-- Tarjetas de revendedor (Pro crea tarjetas para clientes)
CREATE TABLE IF NOT EXISTS tarjetas_revendedor (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  revendedor_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  perfil_id INTEGER NOT NULL REFERENCES perfiles(id) ON DELETE CASCADE,
  cliente_telefono TEXT,
  cliente_nombre TEXT,
  codigo_activacion TEXT UNIQUE,
  estado TEXT DEFAULT 'pendiente' CHECK(estado IN ('pendiente','activada','cancelada')),
  fecha_creacion TEXT DEFAULT (datetime('now'))
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_perfiles_slug ON perfiles(slug);
CREATE INDEX IF NOT EXISTS idx_perfiles_usuario ON perfiles(usuario_id);
CREATE INDEX IF NOT EXISTS idx_campos_perfil ON campos_contacto(perfil_id);
CREATE INDEX IF NOT EXISTS idx_bloques_perfil ON bloques(perfil_id);
CREATE INDEX IF NOT EXISTS idx_archivos_perfil ON archivos(perfil_id);
CREATE INDEX IF NOT EXISTS idx_estadisticas_perfil ON estadisticas(perfil_id);
CREATE INDEX IF NOT EXISTS idx_estadisticas_fecha ON estadisticas(fecha);
CREATE INDEX IF NOT EXISTS idx_usuarios_telefono ON usuarios(telefono);
CREATE INDEX IF NOT EXISTS idx_revendedor_codigo ON tarjetas_revendedor(codigo_activacion);

-- Pagos y suscripciones
CREATE TABLE IF NOT EXISTS pagos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  plan TEXT NOT NULL CHECK(plan IN ('mensual','anual')),
  monto REAL NOT NULL,
  comprobante_url TEXT,
  estado TEXT DEFAULT 'pendiente' CHECK(estado IN ('pendiente','aprobado','rechazado')),
  motivo_rechazo TEXT,
  aprobado_por INTEGER REFERENCES usuarios(id),
  fecha_solicitud TEXT DEFAULT (datetime('now')),
  fecha_resolucion TEXT
);
CREATE INDEX IF NOT EXISTS idx_pagos_usuario ON pagos(usuario_id);
CREATE INDEX IF NOT EXISTS idx_pagos_estado ON pagos(estado);
