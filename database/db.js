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


    // Add bio, cumpleanos, lugar_estudio, pronombres to perfiles if missing
    const newCols = ['bio', 'cumpleanos', 'lugar_estudio', 'pronombres'];
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

