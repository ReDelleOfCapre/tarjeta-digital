-- ============================================
-- VYNK — PostgreSQL Database Schema (Neon)
-- ============================================

-- Usuarios
CREATE TABLE IF NOT EXISTS usuarios (
  id SERIAL PRIMARY KEY,
  telefono VARCHAR(20) UNIQUE NOT NULL,
  nombre VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  plan VARCHAR(20) DEFAULT 'free' CHECK(plan IN ('free','paid')),
  plan_expira TIMESTAMP,
  role VARCHAR(20) DEFAULT 'user' CHECK(role IN ('user','admin')),
  fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  acciones_restantes INT DEFAULT 10,
  ultimo_reset TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Perfiles (tarjetas)
CREATE TABLE IF NOT EXISTS perfiles (
  id SERIAL PRIMARY KEY,
  usuario_id INT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  slug VARCHAR(255) UNIQUE NOT NULL,
  nombre_perfil VARCHAR(255) NOT NULL,
  tipo VARCHAR(50) DEFAULT 'personal',
  foto_url TEXT,
  banner_url TEXT,
  color VARCHAR(50) DEFAULT '#007AFF',
  tema VARCHAR(50) DEFAULT 'auto',
  tema_id INT DEFAULT NULL,
  bio TEXT,
  cumpleanos VARCHAR(50),
  lugar_estudio VARCHAR(255),
  pronombres VARCHAR(50),
  visitas INT DEFAULT 0,
  fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Campos de contacto
CREATE TABLE IF NOT EXISTS campos_contacto (
  id SERIAL PRIMARY KEY,
  perfil_id INT NOT NULL REFERENCES perfiles(id) ON DELETE CASCADE,
  tipo VARCHAR(50) NOT NULL,
  valor TEXT NOT NULL,
  etiqueta VARCHAR(255),
  orden INT DEFAULT 0
);

-- Bloques (v3 block editor)
CREATE TABLE IF NOT EXISTS bloques (
  id SERIAL PRIMARY KEY,
  perfil_id INT NOT NULL REFERENCES perfiles(id) ON DELETE CASCADE,
  tipo VARCHAR(50) NOT NULL,
  contenido TEXT NOT NULL DEFAULT '{}',
  orden INT DEFAULT 0,
  visible INT DEFAULT 1,
  fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Suscriptores (email capture)
CREATE TABLE IF NOT EXISTS suscriptores (
  id SERIAL PRIMARY KEY,
  perfil_id INT NOT NULL REFERENCES perfiles(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  nombre VARCHAR(255),
  fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(perfil_id, email)
);

-- Temas
CREATE TABLE IF NOT EXISTS temas (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(255) NOT NULL,
  tipo VARCHAR(50) DEFAULT 'preset',
  config TEXT NOT NULL DEFAULT '{}',
  premium INT DEFAULT 0
);

-- Archivos
CREATE TABLE IF NOT EXISTS archivos (
  id SERIAL PRIMARY KEY,
  perfil_id INT NOT NULL REFERENCES perfiles(id) ON DELETE CASCADE,
  tipo VARCHAR(50) NOT NULL,
  nombre VARCHAR(255) NOT NULL,
  url TEXT NOT NULL,
  tamano BIGINT DEFAULT 0,
  fecha_subida TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Estadísticas
CREATE TABLE IF NOT EXISTS estadisticas (
  id SERIAL PRIMARY KEY,
  perfil_id INT NOT NULL REFERENCES perfiles(id) ON DELETE CASCADE,
  evento VARCHAR(100) NOT NULL,
  ip_hash VARCHAR(255),
  user_agent TEXT,
  fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tarjetas de revendedor
CREATE TABLE IF NOT EXISTS tarjetas_revendedor (
  id SERIAL PRIMARY KEY,
  revendedor_id INT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  perfil_id INT NOT NULL REFERENCES perfiles(id) ON DELETE CASCADE,
  cliente_telefono VARCHAR(20),
  cliente_nombre VARCHAR(255),
  codigo_activacion VARCHAR(100) UNIQUE,
  estado VARCHAR(20) DEFAULT 'pendiente' CHECK(estado IN ('pendiente','activada','cancelada')),
  fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Pagos y suscripciones
CREATE TABLE IF NOT EXISTS pagos (
  id SERIAL PRIMARY KEY,
  usuario_id INT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  plan VARCHAR(20) NOT NULL CHECK(plan IN ('mensual','anual')),
  monto NUMERIC(10,2) NOT NULL,
  comprobante_url TEXT,
  estado VARCHAR(20) DEFAULT 'pendiente' CHECK(estado IN ('pendiente','aprobado','rechazado')),
  motivo_rechazo TEXT,
  aprobado_por INT REFERENCES usuarios(id),
  fecha_solicitud TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  fecha_resolucion TIMESTAMP
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
CREATE INDEX IF NOT EXISTS idx_pagos_usuario ON pagos(usuario_id);
CREATE INDEX IF NOT EXISTS idx_pagos_estado ON pagos(estado);
