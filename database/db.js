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
    }

    return this;
  }

  /**
   * Guardar la base de datos a disco.
   * Se usa debounce para no escribir en cada operación.
   */
  _saveToDisk() {
    const data = this.db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
  }

  /**
   * Guardar con debounce (50ms) para agrupar escrituras consecutivas.
   */
  _debounceSave() {
    if (this._saveTimer) clearTimeout(this._saveTimer);
    this._saveTimer = setTimeout(() => {
      this._saveToDisk();
    }, 50);
  }

  /**
   * Ejecutar SQL crudo (múltiples statements).
   * Compatible con better-sqlite3: db.exec(sql)
   */
  exec(sql) {
    this.db.exec(sql);
    this._debounceSave();
  }

  /**
   * Ejecutar un PRAGMA.
   * Compatible con better-sqlite3: db.pragma(str)
   */
  pragma(str) {
    this.db.run(`PRAGMA ${str}`);
  }

  /**
   * Preparar un statement.
   * Retorna un objeto con métodos .get(), .all(), .run()
   * compatibles con la API de better-sqlite3.
   *
   * Uso: db.prepare('SELECT * FROM t WHERE id = ?').get(1)
   */
  prepare(sql) {
    const self = this;
    const isWrite = /^\s*(INSERT|UPDATE|DELETE|CREATE|DROP|ALTER)/i.test(sql);

    return {
      /**
       * Ejecutar y obtener una sola fila.
       * @param  {...any} params - Parámetros para bind
       * @returns {Object|undefined} Fila como objeto, o undefined si no hay resultados
       */
      get(...params) {
        const stmt = self.db.prepare(sql);
        if (params.length > 0) {
          stmt.bind(params);
        }
        let row = undefined;
        if (stmt.step()) {
          row = stmt.getAsObject();
        }
        stmt.free();
        return row;
      },

      /**
       * Ejecutar y obtener todas las filas.
       * @param  {...any} params - Parámetros para bind
       * @returns {Array<Object>} Array de filas como objetos
       */
      all(...params) {
        const stmt = self.db.prepare(sql);
        if (params.length > 0) {
          stmt.bind(params);
        }
        const rows = [];
        while (stmt.step()) {
          rows.push(stmt.getAsObject());
        }
        stmt.free();
        return rows;
      },

      /**
       * Ejecutar un statement de escritura (INSERT/UPDATE/DELETE).
       * @param  {...any} params - Parámetros para bind
       * @returns {{ changes: number, lastInsertRowid: number }}
       */
      run(...params) {
        const stmt = self.db.prepare(sql);
        if (params.length > 0) {
          stmt.bind(params);
        }
        stmt.step();
        stmt.free();

        const changes = self.db.getRowsModified();

        // Obtener last insert rowid
        let lastInsertRowid = 0;
        if (/^\s*INSERT/i.test(sql)) {
          const ridStmt = self.db.prepare('SELECT last_insert_rowid() as id');
          if (ridStmt.step()) {
            lastInsertRowid = ridStmt.getAsObject().id;
          }
          ridStmt.free();
        }

        if (isWrite) {
          self._debounceSave();
        }

        return { changes, lastInsertRowid };
      }
    };
  }
}

// Instancia singleton
const wrapper = new DatabaseWrapper();

// Exportar una promesa que se resuelve al wrapper inicializado.
// Las rutas accederán al wrapper a través del módulo.
// El servidor debe esperar a que init() se complete antes de arrancar.
module.exports = wrapper;
module.exports.initPromise = wrapper.init();
