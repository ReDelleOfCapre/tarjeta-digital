-- =============================================
-- TarjetaDigital - Schema DDL
-- =============================================

PRAGMA foreign_keys = ON;

-- Tabla de usuarios
CREATE TABLE IF NOT EXISTS usuarios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  telefono TEXT UNIQUE NOT NULL,
  nombre TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  plan TEXT DEFAULT 'free' CHECK(plan IN ('free', 'paid')),
  fecha_registro TEXT DEFAULT (datetime('now'))
);

-- Tabla de perfiles (tarjetas digitales)
CREATE TABLE IF NOT EXISTS perfiles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  slug TEXT UNIQUE NOT NULL,
  nombre_perfil TEXT NOT NULL,
  tipo TEXT,
  foto_url TEXT,
  color TEXT DEFAULT '#6C63FF',
  visitas INTEGER DEFAULT 0,
  fecha_creacion TEXT DEFAULT (datetime('now'))
);

-- Tabla de campos de contacto
CREATE TABLE IF NOT EXISTS campos_contacto (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  perfil_id INTEGER NOT NULL REFERENCES perfiles(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL,
  valor TEXT NOT NULL,
  etiqueta TEXT,
  orden INTEGER DEFAULT 0
);

-- Tabla de archivos adjuntos
CREATE TABLE IF NOT EXISTS archivos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  perfil_id INTEGER NOT NULL REFERENCES perfiles(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL,
  nombre TEXT NOT NULL,
  url TEXT NOT NULL,
  tamaño INTEGER DEFAULT 0,
  fecha_subida TEXT DEFAULT (datetime('now'))
);

-- Tabla de estadísticas de eventos
CREATE TABLE IF NOT EXISTS estadisticas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  perfil_id INTEGER NOT NULL REFERENCES perfiles(id) ON DELETE CASCADE,
  evento TEXT NOT NULL,
  ip_hash TEXT,
  user_agent TEXT,
  fecha TEXT DEFAULT (datetime('now'))
);

-- =============================================
-- Índices
-- =============================================

CREATE INDEX IF NOT EXISTS idx_perfiles_slug ON perfiles(slug);
CREATE INDEX IF NOT EXISTS idx_perfiles_usuario_id ON perfiles(usuario_id);
CREATE INDEX IF NOT EXISTS idx_campos_contacto_perfil_id ON campos_contacto(perfil_id);
CREATE INDEX IF NOT EXISTS idx_archivos_perfil_id ON archivos(perfil_id);
CREATE INDEX IF NOT EXISTS idx_estadisticas_perfil_id ON estadisticas(perfil_id);
CREATE INDEX IF NOT EXISTS idx_estadisticas_fecha ON estadisticas(fecha);
CREATE INDEX IF NOT EXISTS idx_usuarios_telefono ON usuarios(telefono);
