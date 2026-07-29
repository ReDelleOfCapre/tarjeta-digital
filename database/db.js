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
    const OWNER_PHONE = (process.env.OWNER_PHONE || '').replace(/[^0-9]/g, '');
    if (OWNER_PHONE) {
      this.db.run("UPDATE usuarios SET plan = 'paid', role = 'admin' WHERE telefono = ?", [OWNER_PHONE]);
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

