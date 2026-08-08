const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'tarjeta.db');

// Asegurar que el directorio de la base de datos existe
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

/**
 * Wrapper de compatibilidad sobre sql.js que expone una API
 * similar a better-sqlite3 (síncrona) para no modificar las rutas.
 *
 * sql.js es SQLite compilado a WebAssembly — cero dependencias nativas.
 */
class DatabaseWrapper {
  constructor() {
    this.db = null;
    this._saveTimer = null;
  }

  /**
   * Inicialización asíncrona — DEBE llamarse antes de usar el wrapper.
   */
  async init() {
    const SQL = await initSqlJs();

    // Cargar DB existente o crear nueva
    if (fs.existsSync(DB_PATH)) {
      const buffer = fs.readFileSync(DB_PATH);
      this.db = new SQL.Database(buffer);
    } else {
      this.db = new SQL.Database();
    }

    // Habilitar claves foráneas
    this.db.run('PRAGMA foreign_keys = ON');

    // WAL no soportado en sql.js (opera en memoria con flush a disco)
    // Usamos journal_mode = MEMORY para rendimiento
    this.db.run('PRAGMA journal_mode = MEMORY');

    // Inicializar esquema si las tablas no existen
    const result = this.db.exec(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='usuarios'"
    );

    if (result.length === 0) {
      const schemaPath = path.join(__dirname, 'schema.sql');
      const schema = fs.readFileSync(schemaPath, 'utf-8');
      this.db.exec(schema);
      this._saveToDisk();
      console.log('✅ Base de datos inicializada con esquema');
    } else {
      // Migrations for existing databases
      this._runMigrations();
    }

    // Auto-seed database with Admin user and 10 test profiles
    this._seedDatabase();

    // Ensure premium profiles (Cristina y Pequeño Juan) with full blocks
    this._ensurePremiumProfiles();

    return this;
  }

  /**
   * Run schema migrations on existing databases.
   */
  _runMigrations() {
    // Add role column to usuarios if missing
    try {
      this.db.exec("SELECT role FROM usuarios LIMIT 1");
    } catch (e) {
      this.db.exec("ALTER TABLE usuarios ADD COLUMN role TEXT DEFAULT 'user' CHECK(role IN ('user','admin'))");
      console.log('✅ Migración: columna role agregada a usuarios');
    }

    // Add plan_expira and email columns to usuarios if missing
    try {
      this.db.exec("SELECT plan_expira, email FROM usuarios LIMIT 1");
    } catch (e) {
      try { this.db.exec("ALTER TABLE usuarios ADD COLUMN plan_expira TEXT DEFAULT NULL"); } catch(err) {}
      try { this.db.exec("ALTER TABLE usuarios ADD COLUMN email TEXT DEFAULT NULL"); } catch(err) {}
      console.log('✅ Migración: columnas plan_expira y email agregadas a usuarios');
    }

    // Add acciones_restantes and ultimo_reset columns to usuarios if missing
    try {
      this.db.exec("SELECT acciones_restantes, ultimo_reset FROM usuarios LIMIT 1");
    } catch (e) {
      try { this.db.exec("ALTER TABLE usuarios ADD COLUMN acciones_restantes INTEGER DEFAULT 10"); } catch(err) {}
      try { this.db.exec("ALTER TABLE usuarios ADD COLUMN ultimo_reset TEXT DEFAULT (datetime('now'))"); } catch(err) {}
      console.log('✅ Migración: columnas acciones_restantes y ultimo_reset agregadas a usuarios');
    }


    // Add bio, cumpleanos, lugar_estudio, pronombres, banner_url to perfiles if missing
    const newCols = ['bio', 'cumpleanos', 'lugar_estudio', 'pronombres', 'banner_url'];
    for (const col of newCols) {
      try {
        this.db.exec(`SELECT ${col} FROM perfiles LIMIT 1`);
      } catch (e) {
        this.db.exec(`ALTER TABLE perfiles ADD COLUMN ${col} TEXT`);
        console.log(`✅ Migración: columna ${col} agregada a perfiles`);
      }
    }

    // Create tarjetas_revendedor table if missing
    try {
      this.db.exec("SELECT id FROM tarjetas_revendedor LIMIT 1");
    } catch (e) {
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS tarjetas_revendedor (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          revendedor_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
          perfil_id INTEGER NOT NULL REFERENCES perfiles(id) ON DELETE CASCADE,
          cliente_telefono TEXT,
          cliente_nombre TEXT,
          codigo_activacion TEXT UNIQUE,
          estado TEXT DEFAULT 'pendiente' CHECK(estado IN ('pendiente','activada','cancelada')),
          fecha_creacion TEXT DEFAULT (datetime('now'))
        )
      `);
      this.db.exec("CREATE INDEX IF NOT EXISTS idx_revendedor_codigo ON tarjetas_revendedor(codigo_activacion)");
      console.log('✅ Migración: tabla tarjetas_revendedor creada');
    }

    // Auto-upgrade owner
    const OWNER_PHONE = (process.env.OWNER_PHONE || '522311556138').replace(/[^0-9]/g, '');
    try {
      this.db.run("UPDATE usuarios SET plan = 'paid', role = 'admin' WHERE email LIKE '%gpprzrom%' OR telefono LIKE '%2311556138%'");
      if (OWNER_PHONE) {
        this.db.run("UPDATE usuarios SET plan = 'paid', role = 'admin' WHERE telefono = ?", [OWNER_PHONE]);
      }
    } catch(e) {}

    // Create bloques table
    try {
      this.db.exec("SELECT id FROM bloques LIMIT 1");
    } catch (e) {
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS bloques (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          perfil_id INTEGER NOT NULL REFERENCES perfiles(id) ON DELETE CASCADE,
          tipo TEXT NOT NULL,
          contenido TEXT NOT NULL DEFAULT '{}',
          orden INTEGER DEFAULT 0,
          visible INTEGER DEFAULT 1,
          fecha_creacion TEXT DEFAULT (datetime('now'))
        )
      `);
      this.db.exec("CREATE INDEX IF NOT EXISTS idx_bloques_perfil ON bloques(perfil_id)");
      console.log('✅ Migración: tabla bloques creada');
    }

    // Create suscriptores table
    try {
      this.db.exec("SELECT id FROM suscriptores LIMIT 1");
    } catch (e) {
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS suscriptores (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          perfil_id INTEGER NOT NULL REFERENCES perfiles(id) ON DELETE CASCADE,
          email TEXT NOT NULL,
          nombre TEXT,
          fecha TEXT DEFAULT (datetime('now')),
          UNIQUE(perfil_id, email)
        )
      `);
      console.log('✅ Migración: tabla suscriptores creada');
    }

    // Create temas table
    try {
      this.db.exec("SELECT id FROM temas LIMIT 1");
    } catch (e) {
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS temas (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          nombre TEXT NOT NULL,
          tipo TEXT DEFAULT 'preset',
          config TEXT NOT NULL DEFAULT '{}',
          premium INTEGER DEFAULT 0
        )
      `);
      console.log('✅ Migración: tabla temas creada');
    }

    // Create pagos table
    try {
      this.db.exec("SELECT id FROM pagos LIMIT 1");
    } catch (e) {
      this.db.exec(`
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
        )
      `);
      this.db.exec("CREATE INDEX IF NOT EXISTS idx_pagos_usuario ON pagos(usuario_id)");
      this.db.exec("CREATE INDEX IF NOT EXISTS idx_pagos_estado ON pagos(estado)");
      console.log('✅ Migración: tabla pagos creada');
    }

    // Add tema_id to perfiles
    try {
      this.db.exec("SELECT tema_id FROM perfiles LIMIT 1");
    } catch (e) {
      this.db.exec("ALTER TABLE perfiles ADD COLUMN tema_id INTEGER DEFAULT NULL");
      console.log('✅ Migración: columna tema_id agregada a perfiles');
    }

    // Auto-migrate campos_contacto to bloques
    try {
      const perfilesToMigrate = this.prepare(`
        SELECT p.id 
        FROM perfiles p
        LEFT JOIN bloques b ON p.id = b.perfil_id
        WHERE b.id IS NULL
        AND EXISTS (SELECT 1 FROM campos_contacto c WHERE c.perfil_id = p.id)
      `).all();
      
      if (perfilesToMigrate.length > 0) {
        console.log('🔄 Iniciando migración de campos de contacto a bloques...');
        
        for (const { id: perfilId } of perfilesToMigrate) {
          const campos = this.prepare(
            'SELECT id, tipo, valor, etiqueta, orden FROM campos_contacto WHERE perfil_id = ? ORDER BY orden ASC'
          ).all(perfilId);
          
          if (campos.length > 0) {
            let socialRedes = [];
            let currentOrden = 0;
            
            const insertBloque = this.prepare(
              'INSERT INTO bloques (perfil_id, tipo, contenido, orden) VALUES (?, ?, ?, ?)'
            );
            
            for (const c of campos) {
              const socialTypes = ['facebook', 'instagram', 'tiktok', 'linkedin', 'twitter', 'youtube', 'threads', 'telegram', 'snapchat', 'discord', 'twitch', 'kick', 'spotify', 'apple_music', 'steam', 'xbox', 'psn', 'pinterest', 'reddit', 'bereal', 'github', 'behance', 'dribbble'];
              
              if (socialTypes.includes(c.tipo)) {
                socialRedes.push({ tipo: c.tipo, url: c.valor });
              } else {
                let bloqueTipo = 'link';
                let contenido = { url: c.valor, titulo: c.etiqueta || c.tipo, subtitulo: '', icono: '', color: '' };
                
                if (c.tipo === 'whatsapp') {
                  bloqueTipo = 'whatsapp';
                  contenido = { numero: c.valor, mensaje_default: '' };
                } else if (c.tipo === 'email' || c.tipo === 'telefono' || c.tipo === 'direccion') {
                  contenido.titulo = c.etiqueta || c.tipo;
                }
                
                insertBloque.run(perfilId, bloqueTipo, JSON.stringify(contenido), currentOrden);
                currentOrden++;
              }
            }
            
            if (socialRedes.length > 0) {
              const contenido = JSON.stringify({ redes: socialRedes });
              insertBloque.run(perfilId, 'social_icons', contenido, currentOrden);
            }
          }
        }
        console.log('✅ Migración de campos_contacto a bloques completada');
      }
    } catch (e) {
      console.error('Error durante migración de campos:', e);
    }

    this._saveToDisk();
  }

  /**
   * Auto-sembrar cuenta Admin, 5 Usuarios Free y 5 Usuarios Pro con sus perfiles
   */
  _seedDatabase() {
    try {
      const countRes = this.prepare('SELECT COUNT(*) as total FROM perfiles').get();
      const totalPerfiles = countRes ? countRes.total : 0;
      if (totalPerfiles > 0) {
        console.log('ℹ️ Base de datos ya contiene ' + totalPerfiles + ' perfiles. Omitiendo sembrado inicial.');
        return;
      }

      const defaultPassHash = '$2a$10$UL3O/uLxzkBfrOBYqOveAu0P3dq6JTb7xvAQzjESiXw9jl82YOG8.';

      // 1. Asegurar cuenta Admin (Giovanni Paolo) como ID 1 por defecto
      this.prepare(`
        INSERT OR IGNORE INTO usuarios (id, telefono, nombre, password_hash, email, plan, role, acciones_restantes)
        VALUES (1, '2311556138', 'Giovanni Paolo', ?, 'gpprzrom@gmail.com', 'paid', 'admin', 10)
      `).run(defaultPassHash);

      let admin = this.prepare("SELECT id FROM usuarios WHERE id = 1 OR telefono LIKE '%2311556138%' OR email LIKE '%gpprzrom%'").get();
      if (!admin) admin = { id: 1 };
      this.prepare("UPDATE usuarios SET role = 'admin', plan = 'paid', email = 'gpprzrom@gmail.com', nombre = 'Giovanni Paolo' WHERE id = ?").run(admin.id);

      const targetUserId = admin.id;

      // Re-asignar incondicionalmente las 7 tarjetas al usuario principal
      const seedCards = [
        { slug: 'giovanni', nombre: 'Giovanni Paolo — VYNK Director', tipo: 'personal', color: '#7C3AED', tema: 'neon', bio: 'Fundador de VYNK. Creando la mejor plataforma de identidad digital.' },
        { slug: 'cristina', nombre: 'Cristina Restaurante & Taquería', tipo: 'negocio', color: '#B91C1C', tema: 'food', bio: '⭐ 4.2 (1,300+ opiniones) · 📍 3 Sucursales en Teziutlán' },
        { slug: 'cristina-teziutlan', nombre: 'Cristina Restaurante & Taquería', tipo: 'negocio', color: '#B91C1C', tema: 'food', bio: '⭐ 4.2 (1,300+ opiniones) · 📍 3 Sucursales en Teziutlán' },
        { slug: 'cristina-taqueria', nombre: 'Cristina Restaurante & Taquería', tipo: 'negocio', color: '#B91C1C', tema: 'food', bio: '⭐ 4.2 (1,300+ opiniones) · 📍 3 Sucursales en Teziutlán' },
        { slug: 'pequeno-juan', nombre: 'Pequeño Juan | Medio Digital Líder', tipo: 'negocio', color: '#E11D48', tema: 'neon', bio: '⭐ 5.0 (226K+ Seguidores) · El Medio Digital Mejor Posicionado de Teziutlán' },
        { slug: 'peque-juan', nombre: 'Pequeño Juan | Medio Digital Líder', tipo: 'negocio', color: '#E11D48', tema: 'neon', bio: '⭐ 5.0 (226K+ Seguidores) · El Medio Digital Mejor Posicionado de Teziutlán' },
        { slug: 'pequeno-juan-medio-digital', nombre: 'Pequeño Juan | Medio Digital Líder', tipo: 'negocio', color: '#E11D48', tema: 'neon', bio: '⭐ 5.0 (226K+ Seguidores) · El Medio Digital Mejor Posicionado de Teziutlán' }
      ];

      for (const card of seedCards) {
        this.prepare(`
          INSERT OR IGNORE INTO perfiles (usuario_id, slug, nombre_perfil, tipo, color, tema, bio)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(targetUserId, card.slug, card.nombre, card.tipo, card.color, card.tema, card.bio);

        this.prepare("UPDATE perfiles SET usuario_id = ? WHERE slug = ?").run(targetUserId, card.slug);
      }

      // Perfil oficial del Admin
      let adminP = this.prepare("SELECT id FROM perfiles WHERE slug = 'giovanni'").get();
      if (!adminP) {
        const resP = this.prepare(`
          INSERT INTO perfiles (usuario_id, slug, nombre_perfil, tipo, color, tema, bio)
          VALUES (?, 'giovanni', 'Giovanni Paolo — VYNK Director', 'personal', '#7C3AED', 'neon', 'Fundador de VYNK. Creando la mejor plataforma de identidad digital.')
        `).run(admin.id);
        const pId = resP.lastInsertRowid;
        this.prepare("INSERT INTO bloques (perfil_id, tipo, contenido, orden) VALUES (?, 'whatsapp', ?, 0)").run(pId, JSON.stringify({ numero: '522311556138', mensaje_default: 'Hola Giovanni!' }));
        this.prepare("INSERT INTO bloques (perfil_id, tipo, contenido, orden) VALUES (?, 'social_icons', ?, 1)").run(pId, JSON.stringify({ redes: [{ tipo: 'instagram', url: 'https://instagram.com' }, { tipo: 'linkedin', url: 'https://linkedin.com' }] }));
      }

      // Crear / Actualizar tarjetas de Cristina Teziutlán ( slugs: 'cristina-teziutlan', 'cristina' y 'cristina-taqueria' )
      const cristinaSlugs = ['cristina-teziutlan', 'cristina', 'cristina-taqueria'];
      for (const slug of cristinaSlugs) {
        let cristinaP = this.prepare("SELECT id FROM perfiles WHERE slug = ?").get(slug);
        let cId;
        const bioText = '⭐ 4.2 (1,300+ opiniones) · 📍 3 Sucursales en Teziutlán · Tacos al pastor, árabes, cortes y desayunos.';
        if (!cristinaP) {
          const resC = this.prepare(`
            INSERT OR IGNORE INTO perfiles (usuario_id, slug, nombre_perfil, tipo, color, tema, bio, foto_url, banner_url)
            VALUES (?, ?, 'Cristina Restaurante & Taquería', 'negocio', '#B91C1C', 'food', ?, 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=300', 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1000')
          `).run(targetUserId, slug, bioText);
          cId = resC.lastInsertRowid;
        } else {
          cId = cristinaP.id;
          this.prepare(`
            UPDATE perfiles SET 
              usuario_id = ?,
              banner_url = 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1000',
              foto_url = 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=300',
              color = '#B91C1C',
              tema = 'food',
              bio = ?
            WHERE id = ?
          `).run(targetUserId, bioText, cId);
        }

        // Limpiar y sembrar bloques de Cristina Restaurante & Taquería
        this.prepare("DELETE FROM bloques WHERE perfil_id = ?").run(cId);

        this.prepare("INSERT OR IGNORE INTO bloques (perfil_id, tipo, contenido, orden) VALUES (?, 'whatsapp', ?, 0)").run(
          cId, JSON.stringify({ titulo: 'Pedir por WhatsApp / Domicilio', url: 'https://wa.me/522311556138', numero: '522311556138', texto: 'Pedir por WhatsApp / Domicilio' })
        );

        this.prepare("INSERT OR IGNORE INTO bloques (perfil_id, tipo, contenido, orden) VALUES (?, 'link', ?, 1)").run(
          cId, JSON.stringify({ titulo: 'Ver Menú en Uber Eats', url: 'https://www.ubereats.com/mx/store/cristina-restaurante-%26-taqueria-suc-centro/Yd6UdKQ7WiSBAcOFDE-wOA', icono: '🛵', color: '#10B981' })
        );

        this.prepare("INSERT OR IGNORE INTO bloques (perfil_id, tipo, contenido, orden) VALUES (?, 'seccion', ?, 2)").run(
          cId, JSON.stringify({ titulo: 'Nuestras 3 Sucursales en Teziutlán' })
        );

        this.prepare("INSERT OR IGNORE INTO bloques (perfil_id, tipo, contenido, orden) VALUES (?, 'link', ?, 3)").run(
          cId, JSON.stringify({ titulo: 'Sucursal Centro (Allende #603)', url: 'https://maps.google.com/?q=Cristina+Restaurante+&+Taquería+Allende+603+Teziutlan', icono: '📍', color: '#D97706' })
        );

        this.prepare("INSERT OR IGNORE INTO bloques (perfil_id, tipo, contenido, orden) VALUES (?, 'link', ?, 4)").run(
          cId, JSON.stringify({ titulo: 'Sucursal Av. Hidalgo #1718', url: 'https://maps.google.com/?q=Av.+Miguel+Hidalgo+1718+Teziutlan', icono: '🚗', color: '#D97706' })
        );

        this.prepare("INSERT OR IGNORE INTO bloques (perfil_id, tipo, contenido, orden) VALUES (?, 'link', ?, 5)").run(
          cId, JSON.stringify({ titulo: 'Sucursal Mercado Victoria (#51)', url: 'https://maps.google.com/?q=Mercado+Victoria+Teziutlan', icono: '🏪', color: '#D97706' })
        );
      }

      // Perfil Empresarial: Pequeño Juan Medio Digital — Teziutlán
      const juanSlugs = ['pequeno-juan', 'peque-juan', 'pequeno-juan-medio-digital'];
      for (const slug of juanSlugs) {
        let juanP = this.prepare("SELECT id FROM perfiles WHERE slug = ?").get(slug);
        let jId;
        const bioText = '⭐ 5.0 (226K+ Seguidores) · El medio digital de noticias y comunicación líder en Teziutlán.';
        if (!juanP) {
          const resJ = this.prepare(`
            INSERT OR IGNORE INTO perfiles (usuario_id, slug, nombre_perfil, tipo, color, tema, bio, foto_url, banner_url)
            VALUES (?, ?, 'Pequeño Juan | Medio Digital Líder', 'negocio', '#E11D48', 'neon', ?, 'https://images.unsplash.com/photo-1598899134739-24c46f58b8c0?w=300', 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=1000')
          `).run(targetUserId, slug, bioText);
          jId = resJ.lastInsertRowid;
        } else {
          jId = juanP.id;
          this.prepare(`
            UPDATE perfiles SET 
              usuario_id = ?,
              banner_url = 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=1000',
              foto_url = 'https://images.unsplash.com/photo-1598899134739-24c46f58b8c0?w=300',
              color = '#E11D48',
              tema = 'neon',
              bio = ?
            WHERE id = ?
          `).run(targetUserId, bioText, jId);
        }

        // Limpiar y sembrar bloques de Pequeño Juan
        this.prepare("DELETE FROM bloques WHERE perfil_id = ?").run(jId);

        this.prepare("INSERT OR IGNORE INTO bloques (perfil_id, tipo, contenido, orden) VALUES (?, 'whatsapp', ?, 0)").run(
          jId, JSON.stringify({ titulo: 'Cotizar Publicidad y Coberturas', url: 'https://wa.me/522311120932', numero: '522311120932', texto: 'Cotizar Publicidad y Coberturas' })
        );

        this.prepare("INSERT OR IGNORE INTO bloques (perfil_id, tipo, contenido, orden) VALUES (?, 'link', ?, 1)").run(
          jId, JSON.stringify({ titulo: 'Página Oficial de Facebook', url: 'https://www.facebook.com/Pequeño-Juan-Teziutlán-Centro', icono: '📱', color: '#1877F2' })
        );

        this.prepare("INSERT OR IGNORE INTO bloques (perfil_id, tipo, contenido, orden) VALUES (?, 'link', ?, 2)").run(
          jId, JSON.stringify({ titulo: 'Llamar a Redacción (tel:2311120932)', url: 'tel:2311120932', icono: '📞', color: '#0284C7' })
        );

        this.prepare("INSERT OR IGNORE INTO bloques (perfil_id, tipo, contenido, orden) VALUES (?, 'seccion', ?, 3)").run(
          jId, JSON.stringify({ titulo: 'Ubicación de Oficinas' })
        );

        this.prepare("INSERT OR IGNORE INTO bloques (perfil_id, tipo, contenido, orden) VALUES (?, 'link', ?, 4)").run(
          jId, JSON.stringify({ titulo: 'Oficinas Av. Benito Juárez 1510-A, Centro', url: 'https://maps.google.com/?q=Av.+Benito+Juárez+1510-A+Teziutlan', icono: '📍', color: '#E11D48' })
        );
      }

      // 2. Definir los 5 Usuarios Free y 5 Usuarios Pro
      const seedUsers = [
        // 5 Usuarios Free
        { tel: '5510000001', nombre: 'Laura Gómez', email: 'laura@ejemplo.com', plan: 'free', expira: null, slug: 'laura-design', color: '#3B82F6', tema: 'ios', bio: 'Diseñadora independiente y creativa.' },
        { tel: '5510000002', nombre: 'Roberto Silva', email: 'roberto@ejemplo.com', plan: 'free', expira: null, slug: 'roberto-consultor', color: '#D97706', tema: 'minimal', bio: 'Consultor de negocios local.' },
        { tel: '5510000003', nombre: 'Mariana Ríos', email: 'mariana@ejemplo.com', plan: 'free', expira: null, slug: 'mariana-foto', color: '#8B5CF6', tema: 'ios', bio: 'Fotógrafa de eventos y retrato.' },
        { tel: '5510000004', nombre: 'Fernando Torres', email: 'fernando@ejemplo.com', plan: 'free', expira: null, slug: 'fernando-fit', color: '#10B981', tema: 'minimal', bio: 'Entrenador físico personal.' },
        { tel: '5510000005', nombre: 'Camila Mendoza', email: 'camila@ejemplo.com', plan: 'free', expira: null, slug: 'camila-art', color: '#EC4899', tema: 'ios', bio: 'Ilustradora digital y artista.' },
        
        // 5 Usuarios Pro
        { tel: '5520000001', nombre: 'Carlos Mendoza (Pro)', email: 'carlos.pro@ejemplo.com', plan: 'paid', expira: new Date(Date.now() + 30*86400000).toISOString(), slug: 'carlos-pro', color: '#7C3AED', tema: 'neon', bio: 'Consultor Corporativo Senior & Speaker.' },
        { tel: '5520000002', nombre: 'Sofía Rivera (Pro)', email: 'sofia.pro@ejemplo.com', plan: 'paid', expira: new Date(Date.now() + 30*86400000).toISOString(), slug: 'sofia-creator', color: '#FF6B6B', tema: 'gradient', bio: 'Content Creator (+500k seguidores).' },
        { tel: '5520000003', nombre: 'Alex Dev (Pro)', email: 'alex.pro@ejemplo.com', plan: 'paid', expira: new Date(Date.now() + 365*86400000).toISOString(), slug: 'alex-dev', color: '#00ff41', tema: 'retro', bio: 'Full Stack Tech Lead & Cloud Architect.' },
        { tel: '5520000004', nombre: 'DJ Quantum (Pro)', email: 'dj.pro@ejemplo.com', plan: 'paid', expira: new Date(Date.now() + 30*86400000).toISOString(), slug: 'dj-quantum', color: '#06B6D4', tema: 'glass', bio: 'Productor de Música Electrónica & Tour DJ.' },
        { tel: '5520000005', nombre: 'Growth Studio (Pro)', email: 'growth.pro@ejemplo.com', plan: 'paid', expira: new Date(Date.now() + 365*86400000).toISOString(), slug: 'growth-studio', color: '#6366F1', tema: 'glass', bio: 'Agencia de Marketing Digital & Escalabilidad.' }
      ];

      for (const u of seedUsers) {
        let userRecord = this.prepare("SELECT id FROM usuarios WHERE telefono = ? OR email = ?").get(u.tel, u.email);
        if (!userRecord) {
          const resU = this.prepare(`
            INSERT INTO usuarios (telefono, nombre, password_hash, email, plan, plan_expira, role, acciones_restantes)
            VALUES (?, ?, ?, ?, ?, ?, 'user', 10)
          `).run(u.tel, u.nombre, defaultPassHash, u.email, u.plan, u.expira);
          userRecord = { id: resU.lastInsertRowid };
        } else {
          this.prepare(`
            UPDATE usuarios SET plan = ?, plan_expira = ? WHERE id = ?
          `).run(u.plan, u.expira, userRecord.id);
        }

        // Crear tarjeta del usuario si no existe
        let perfilRecord = this.prepare("SELECT id FROM perfiles WHERE slug = ?").get(u.slug);
        if (!perfilRecord) {
          const resP = this.prepare(`
            INSERT INTO perfiles (usuario_id, slug, nombre_perfil, tipo, color, tema, bio)
            VALUES (?, ?, ?, 'personal', ?, ?, ?)
          `).run(userRecord.id, u.slug, u.nombre, u.color, u.tema, u.bio);
          const pId = resP.lastInsertRowid;

          this.prepare("INSERT INTO bloques (perfil_id, tipo, contenido, orden) VALUES (?, 'whatsapp', ?, 0)").run(pId, JSON.stringify({ numero: u.tel, mensaje_default: 'Hola!' }));
          this.prepare("INSERT INTO bloques (perfil_id, tipo, contenido, orden) VALUES (?, 'social_icons', ?, 1)").run(pId, JSON.stringify({ redes: [{ tipo: 'instagram', url: 'https://instagram.com' }, { tipo: 'facebook', url: 'https://facebook.com' }] }));
          this.prepare("INSERT INTO bloques (perfil_id, tipo, contenido, orden) VALUES (?, 'link', ?, 2)").run(pId, JSON.stringify({ url: 'https://vynk.onrender.com', titulo: '⚡ Visitar mi sitio', icono: '🌐', color: u.color }));
        }
      }

      console.log('✅ Base de datos sembrada con 5 Usuarios Free, 5 Usuarios Pro y Admin');
      this._saveToDisk();
    } catch (e) {
      console.error('Error en _seedDatabase:', e);
    }
  }

  /**
   * Garantizar las 2 tarjetas premium hiper-detalladas (Cristina y Pequeño Juan)
   */
  _ensurePremiumProfiles() {
    try {
      const defaultPassHash = '$2a$10$UL3O/uLxzkBfrOBYqOveAu0P3dq6JTb7xvAQzjESiXw9jl82YOG8.';
      
      let admin = this.prepare("SELECT id FROM usuarios WHERE id = 1 OR telefono LIKE '%2311556138%' OR email LIKE '%gpprzrom%'").get();
      if (!admin) {
        this.prepare(`
          INSERT OR IGNORE INTO usuarios (id, telefono, nombre, password_hash, email, plan, role, acciones_restantes)
          VALUES (1, '2311556138', 'Giovanni Paolo', ?, 'gpprzrom@gmail.com', 'paid', 'admin', 10)
        `).run(defaultPassHash);
        admin = { id: 1 };
      }

      const userId = admin.id;

      // 🌮 1. Cristina Restaurante & Taquería (slug: cristina)
      const cBio = '👑 El auténtico sabor de Teziutlán. Tacos al pastor, desayunos buffet y platillos típicos en nuestros 3 establecimientos.';
      const cristinaRows = this.prepare("SELECT id FROM perfiles WHERE slug = 'cristina' ORDER BY id ASC").all();
      let cId;

      if (cristinaRows && cristinaRows.length > 0) {
        cId = cristinaRows[0].id;
        // Limpiar duplicados si existieran más de 1 perfil con el mismo slug
        if (cristinaRows.length > 1) {
          const extraIds = cristinaRows.slice(1).map(r => r.id);
          for (const extraId of extraIds) {
            this.prepare("DELETE FROM bloques WHERE perfil_id = ?").run(extraId);
            this.prepare("DELETE FROM perfiles WHERE id = ?").run(extraId);
          }
        }
        this.prepare("UPDATE perfiles SET usuario_id = ?, nombre_perfil = 'Cristina Restaurante & Taquería', tipo = 'negocio', color = '#E53E3E', tema = 'food', bio = ? WHERE id = ?").run(userId, cBio, cId);
      } else {
        const resC = this.prepare(`
          INSERT INTO perfiles (usuario_id, slug, nombre_perfil, tipo, color, tema, bio, foto_url, banner_url)
          VALUES (?, 'cristina', 'Cristina Restaurante & Taquería', 'negocio', '#E53E3E', 'food', ?, 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=300', 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1000')
        `).run(userId, cBio);
        cId = resC.lastInsertRowid;
      }

      if (cId) {
        this.prepare("DELETE FROM bloques WHERE perfil_id = ?").run(cId);

        this.prepare("INSERT INTO bloques (perfil_id, tipo, contenido, orden) VALUES (?, 'whatsapp', ?, 0)").run(
          cId, JSON.stringify({ titulo: 'WhatsApp', url: 'https://wa.me/522311556138', numero: '522311556138', texto: 'WhatsApp' })
        );

        this.prepare("INSERT INTO bloques (perfil_id, tipo, contenido, orden) VALUES (?, 'link', ?, 1)").run(
          cId, JSON.stringify({ titulo: '📖 Menú Digital & Carta Completa', subtitulo: 'Tacos al pastor, desayunos buffet, cortes y antojitos típicos', url: 'https://www.ubereats.com/mx/store/cristina-restaurante-%26-taqueria-suc-centro/Yd6UdKQ7WiSBAcOFDE-wOA', icono: '📖', color: '#E53E3E' })
        );

        this.prepare("INSERT INTO bloques (perfil_id, tipo, contenido, orden) VALUES (?, 'social_icons', ?, 2)").run(
          cId, JSON.stringify({ redes: [{ tipo: 'facebook', url: 'https://www.facebook.com/CristinaRestauranteOficial/' }, { tipo: 'instagram', url: 'https://instagram.com/cristinarestaurante' }] })
        );

        this.prepare("INSERT INTO bloques (perfil_id, tipo, contenido, orden) VALUES (?, 'link', ?, 3)").run(
          cId, JSON.stringify({ titulo: '📍 Sucursal 1: Centro — Allende #603', subtitulo: 'Tel: (231) 312-2032 | Servicio 9:00 AM - 11:00 PM', url: 'https://maps.google.com/?q=Cristina+Restaurante+&+Taquería+Allende+603+Teziutlan', icono: '📍', color: '#D97706' })
        );

        this.prepare("INSERT INTO bloques (perfil_id, tipo, contenido, orden) VALUES (?, 'link', ?, 4)").run(
          cId, JSON.stringify({ titulo: '📍 Sucursal 2: La Maquinita — Av. Hidalgo #1718', subtitulo: 'Tel: (231) 688-4065 | El Pinal, Teziutlán', url: 'https://maps.google.com/?q=Av.+Miguel+Hidalgo+1718+Teziutlan', icono: '🚗', color: '#D97706' })
        );

        this.prepare("INSERT INTO bloques (perfil_id, tipo, contenido, orden) VALUES (?, 'link', ?, 5)").run(
          cId, JSON.stringify({ titulo: '📍 Sucursal 3: Mercado Victoria — Calle Mercado #51', subtitulo: 'Sabor tradicional en el corazón comercial de la ciudad', url: 'https://maps.google.com/?q=Mercado+Victoria+Teziutlan', icono: '🏪', color: '#D97706' })
        );

        this.prepare("INSERT INTO bloques (perfil_id, tipo, contenido, orden) VALUES (?, 'link', ?, 6)").run(
          cId, JSON.stringify({ titulo: '🛵 Pedir a Domicilio por Uber Eats', subtitulo: 'Entregas rápidas directo a tu casa u oficina', url: 'https://www.ubereats.com/mx/store/cristina-restaurante-%26-taqueria-suc-centro/Yd6UdKQ7WiSBAcOFDE-wOA', icono: '🛵', color: '#10B981' })
        );

        this.prepare("INSERT INTO bloques (perfil_id, tipo, contenido, orden) VALUES (?, 'link', ?, 7)").run(
          cId, JSON.stringify({ titulo: '⭐ Reseñas & Calificación TripAdvisor', subtitulo: 'Uno de los restaurantes más recomendados de Teziutlán', url: 'https://www.tripadvisor.com/Search?q=Cristina+Restaurante+Teziutlan', icono: '⭐', color: '#F59E0B' })
        );
      }

      // 📺 2. Pequeño Juan | Medio Digital Líder (slug: pequeno-juan)
      const jBio = '⭐ 5.0 (226K+ Seguidores) · El medio digital de noticias y comunicación líder en Teziutlán.';
      const juanRows = this.prepare("SELECT id FROM perfiles WHERE slug = 'pequeno-juan' ORDER BY id ASC").all();
      let jId;

      if (juanRows && juanRows.length > 0) {
        jId = juanRows[0].id;
        // Limpiar duplicados si existieran más de 1 perfil con el mismo slug
        if (juanRows.length > 1) {
          const extraIds = juanRows.slice(1).map(r => r.id);
          for (const extraId of extraIds) {
            this.prepare("DELETE FROM bloques WHERE perfil_id = ?").run(extraId);
            this.prepare("DELETE FROM perfiles WHERE id = ?").run(extraId);
          }
        }
        this.prepare("UPDATE perfiles SET usuario_id = ?, nombre_perfil = 'Pequeño Juan | Medio Digital Líder', tipo = 'negocio', color = '#3182CE', tema = 'neon', bio = ? WHERE id = ?").run(userId, jBio, jId);
      } else {
        const resJ = this.prepare(`
          INSERT INTO perfiles (usuario_id, slug, nombre_perfil, tipo, color, tema, bio, foto_url, banner_url)
          VALUES (?, 'pequeno-juan', 'Pequeño Juan | Medio Digital Líder', 'negocio', '#3182CE', 'neon', ?, 'https://images.unsplash.com/photo-1598899134739-24c46f58b8c0?w=300', 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=1000')
        `).run(userId, jBio);
        jId = resJ.lastInsertRowid;
      }

      if (jId) {
        this.prepare("DELETE FROM bloques WHERE perfil_id = ?").run(jId);

        this.prepare("INSERT INTO bloques (perfil_id, tipo, contenido, orden) VALUES (?, 'whatsapp', ?, 0)").run(
          jId, JSON.stringify({ titulo: 'Cotizar Publicidad y Coberturas', url: 'https://wa.me/522311120932', numero: '522311120932', texto: 'Cotizar Publicidad y Coberturas' })
        );

        this.prepare("INSERT INTO bloques (perfil_id, tipo, contenido, orden) VALUES (?, 'link', ?, 1)").run(
          jId, JSON.stringify({ titulo: '📘 Página Oficial de Facebook', subtitulo: 'Únete a nuestros más de 226,000 seguidores', url: 'https://www.facebook.com/Pequeño-Juan-Teziutlán-Centro', icono: '📘', color: '#1877F2' })
        );

        this.prepare("INSERT INTO bloques (perfil_id, tipo, contenido, orden) VALUES (?, 'link', ?, 2)").run(
          jId, JSON.stringify({ titulo: '📞 Llamar a Redacción', subtitulo: 'Atención y coberturas 24/7 (231 112 0932)', url: 'tel:2311120932', icono: '📞', color: '#3182CE' })
        );

        this.prepare("INSERT INTO bloques (perfil_id, tipo, contenido, orden) VALUES (?, 'link', ?, 3)").run(
          jId, JSON.stringify({ titulo: '📍 Oficinas Centrales', subtitulo: 'Av. Benito Juárez 1510-A, Centro, Teziutlán', url: 'https://maps.google.com/?q=Av.+Benito+Juárez+1510-A+Teziutlan', icono: '📍', color: '#3182CE' })
        );
      }

      console.log('✅ Tarjetas premium garantizadas (Cristina y Pequeño Juan)');
      this._saveToDisk();
    } catch (e) {
      console.error('Error en _ensurePremiumProfiles:', e);
    }
  }

  /**
   * Guardar la base de datos a disco.
   */
  _saveToDisk() {
    const data = this.db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
  }

  /**
   * Guardar con debounce (50ms).
   */
  _debounceSave() {
    if (this._saveTimer) clearTimeout(this._saveTimer);
    this._saveTimer = setTimeout(() => {
      this._saveToDisk();
    }, 50);
  }

  exec(sql) {
    this.db.exec(sql);
    this._debounceSave();
  }

  pragma(str) {
    this.db.run(`PRAGMA ${str}`);
  }

  prepare(sql) {
    const self = this;
    const isWrite = /^\s*(INSERT|UPDATE|DELETE|CREATE|DROP|ALTER)/i.test(sql);

    return {
      get(...params) {
        const stmt = self.db.prepare(sql);
        if (params.length > 0) stmt.bind(params);
        let row = undefined;
        if (stmt.step()) row = stmt.getAsObject();
        stmt.free();
        return row;
      },

      all(...params) {
        const stmt = self.db.prepare(sql);
        if (params.length > 0) stmt.bind(params);
        const rows = [];
        while (stmt.step()) rows.push(stmt.getAsObject());
        stmt.free();
        return rows;
      },

      run(...params) {
        const stmt = self.db.prepare(sql);
        if (params.length > 0) stmt.bind(params);
        stmt.step();
        stmt.free();

        const changes = self.db.getRowsModified();
        let lastInsertRowid = 0;
        if (/^\s*INSERT/i.test(sql)) {
          const ridStmt = self.db.prepare('SELECT last_insert_rowid() as id');
          if (ridStmt.step()) lastInsertRowid = ridStmt.getAsObject().id;
          ridStmt.free();
        }

        if (isWrite) self._debounceSave();
        return { changes, lastInsertRowid };
      }
    };
  }
}

// Singleton with async init
const wrapper = new DatabaseWrapper();
const dbReady = wrapper.init();

module.exports = wrapper;
module.exports.dbReady = dbReady;
module.exports.initPromise = dbReady;

