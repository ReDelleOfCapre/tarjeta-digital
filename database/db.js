const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const { Pool } = require('pg');
const path = require('path');
const fs = require('fs');

require('dotenv').config();

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_peRwZf4D5XsK@ep-crimson-tooth-axo8ifo4.c-4.us-east-2.aws.neon.tech/neondb?sslmode=require';

// Worker Thread Execution Logic
if (!isMainThread) {
  const pool = new Pool({
    connectionString: workerData.connectionString,
    ssl: { rejectUnauthorized: false },
    max: 20,
    idleTimeoutMillis: 30000
  });

  parentPort.on('message', async (task) => {
    const { id, sql, params, sharedBuffer } = task;
    const typedArray = new Int32Array(sharedBuffer);

    try {
      let finalSql = sql;
      if (/^\s*INSERT/i.test(finalSql) && !/RETURNING/i.test(finalSql) && !/ON\s+CONFLICT/i.test(finalSql)) {
        finalSql += ' RETURNING id';
      }

      const res = await pool.query(finalSql, params);
      const output = JSON.stringify({
        rows: res.rows || [],
        rowCount: res.rowCount || 0,
        lastInsertRowid: res.rows && res.rows[0] && res.rows[0].id ? res.rows[0].id : 0
      });

      fs.writeFileSync(path.join(__dirname, `res_${id}.tmp`), output);
      typedArray[0] = 1; // Success flag
    } catch (err) {
      fs.writeFileSync(path.join(__dirname, `res_${id}.tmp`), JSON.stringify({ error: err.message }));
      typedArray[0] = 2; // Error flag
    } finally {
      Atomics.notify(typedArray, 0);
    }
  });
  return;
}

/**
 * Main Thread Database Wrapper using Built-in Atomics & Worker Threads
 */
class PgDatabaseWrapper {
  constructor() {
    this.connectionString = DATABASE_URL;
    this.taskId = 0;

    this.worker = new Worker(__filename, {
      workerData: { connectionString: this.connectionString }
    });

    this.pool = new Pool({
      connectionString: this.connectionString,
      ssl: { rejectUnauthorized: false }
    });
  }

  _normalizeSql(sql) {
    let normalized = sql.replace(/INSERT\s+OR\s+IGNORE\s+INTO/gi, 'INSERT INTO');
    let hasConflictClause = /ON\s+CONFLICT/i.test(normalized);

    let paramIndex = 0;
    normalized = normalized.replace(/\?/g, () => {
      paramIndex++;
      return `$${paramIndex}`;
    });

    if (sql.match(/INSERT\s+OR\s+IGNORE\s+INTO/i) && !hasConflictClause) {
      normalized += ' ON CONFLICT DO NOTHING';
    }

    return normalized;
  }

  async init() {
    try {
      const schemaPath = path.join(__dirname, 'schema.sql');
      const schemaSql = fs.readFileSync(schemaPath, 'utf-8');
      await this.pool.query(schemaSql);
      await this._runMigrations();
      console.log('✅ Base de datos Neon PostgreSQL (Cloud) conectada e inicializada con esquema');

      await this._seedDatabase();
      await this._ensurePremiumProfiles();
      await this._cleanupDuplicateProfiles();

      return this;
    } catch (err) {
      console.error('❌ Error inicializando Neon PostgreSQL:', err);
      throw err;
    }
  }

  async _runMigrations() {
    try {
      await this.pool.query("ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS google_id VARCHAR(255)");
      await this.pool.query("ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS apple_id VARCHAR(255)");
      await this.pool.query("ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS microsoft_id VARCHAR(255)");
      await this.pool.query("ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS terms_accepted BOOLEAN DEFAULT FALSE");
    } catch (e) {
      console.error('Error corriendo migraciones PG:', e);
    }
  }

  async _seedDatabase() {
    try {
      const defaultPassHash = '$2a$10$UL3O/uLxzkBfrOBYqOveAu0P3dq6JTb7xvAQzjESiXw9jl82YOG8.';
      
      const adminRes = await this.pool.query("SELECT id FROM usuarios WHERE id = 1 OR telefono LIKE '%2311556138%' OR email LIKE '%gpprzrom%'");
      let adminId = adminRes.rows[0] ? adminRes.rows[0].id : null;

      if (!adminId) {
        const insAdmin = await this.pool.query(`
          INSERT INTO usuarios (id, telefono, nombre, password_hash, email, plan, role, acciones_restantes)
          VALUES (1, '2311556138', 'Giovanni Paolo', $1, 'gpprzrom@gmail.com', 'paid', 'admin', 10)
          ON CONFLICT (id) DO NOTHING
          RETURNING id
        `, [defaultPassHash]);
        adminId = insAdmin.rows[0] ? insAdmin.rows[0].id : 1;
      }

      await this.pool.query("UPDATE usuarios SET role = 'admin', plan = 'paid', email = 'gpprzrom@gmail.com', nombre = 'Giovanni Paolo' WHERE id = $1", [adminId]);

      const giovanniRes = await this.pool.query("SELECT id FROM perfiles WHERE slug = 'giovanni'");
      if (giovanniRes.rows.length === 0) {
        const insG = await this.pool.query(`
          INSERT INTO perfiles (usuario_id, slug, nombre_perfil, tipo, color, tema, bio)
          VALUES ($1, 'giovanni', 'Giovanni Paolo — VYNK Director', 'personal', '#7C3AED', 'neon', 'Fundador de VYNK. Creando la mejor plataforma de identidad digital.')
          RETURNING id
        `, [adminId]);
        const gId = insG.rows[0].id;
        await this.pool.query("INSERT INTO bloques (perfil_id, tipo, contenido, orden) VALUES ($1, 'whatsapp', $2, 0)", [gId, JSON.stringify({ numero: '522311556138', mensaje_default: 'Hola Giovanni!' })]);
        await this.pool.query("INSERT INTO bloques (perfil_id, tipo, contenido, orden) VALUES ($1, 'social_icons', $2, 1)", [gId, JSON.stringify({ redes: [{ tipo: 'instagram', url: 'https://instagram.com' }, { tipo: 'linkedin', url: 'https://linkedin.com' }] })]);
      }
    } catch (e) {
      console.error('Error en _seedDatabase PG:', e);
    }
  }

  async _ensurePremiumProfiles() {
    try {
      const adminRes = await this.pool.query("SELECT id FROM usuarios WHERE id = 1 OR email LIKE '%gpprzrom%' LIMIT 1");
      const userId = adminRes.rows[0] ? adminRes.rows[0].id : 1;

      // 🌮 1. Cristina
      const cBio = '👑 El auténtico sabor de Teziutlán. Tacos al pastor, desayunos buffet y platillos típicos en nuestros 3 establecimientos.';
      const cRes = await this.pool.query("SELECT id FROM perfiles WHERE slug = 'cristina' ORDER BY id ASC");
      let cId;

      if (cRes.rows.length > 0) {
        cId = cRes.rows[0].id;
        if (cRes.rows.length > 1) {
          const extraIds = cRes.rows.slice(1).map(r => r.id);
          for (const extraId of extraIds) {
            await this.pool.query("DELETE FROM bloques WHERE perfil_id = $1", [extraId]);
            await this.pool.query("DELETE FROM perfiles WHERE id = $1", [extraId]);
          }
        }
        await this.pool.query("UPDATE perfiles SET usuario_id = $1, nombre_perfil = 'Cristina Restaurante & Taquería', tipo = 'negocio', color = '#E53E3E', tema = 'food', bio = $2 WHERE id = $3", [userId, cBio, cId]);
      } else {
        const insC = await this.pool.query(`
          INSERT INTO perfiles (usuario_id, slug, nombre_perfil, tipo, color, tema, bio, foto_url, banner_url)
          VALUES ($1, 'cristina', 'Cristina Restaurante & Taquería', 'negocio', '#E53E3E', 'food', $2, 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=300', 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1000')
          RETURNING id
        `, [userId, cBio]);
        cId = insC.rows[0].id;
      }

      if (cId) {
        await this.pool.query("DELETE FROM bloques WHERE perfil_id = $1", [cId]);

        await this.pool.query("INSERT INTO bloques (perfil_id, tipo, contenido, orden) VALUES ($1, 'whatsapp', $2, 0)", [
          cId, JSON.stringify({ titulo: 'WhatsApp', url: 'https://wa.me/522311556138', numero: '522311556138', texto: 'WhatsApp' })
        ]);
        await this.pool.query("INSERT INTO bloques (perfil_id, tipo, contenido, orden) VALUES ($1, 'link', $2, 1)", [
          cId, JSON.stringify({ titulo: '📖 Menú Digital & Carta Completa', subtitulo: 'Tacos al pastor, desayunos buffet, cortes y antojitos típicos', url: 'https://www.ubereats.com/mx/store/cristina-restaurante-%26-taqueria-suc-centro/Yd6UdKQ7WiSBAcOFDE-wOA', icono: '📖', color: '#E53E3E' })
        ]);
        await this.pool.query("INSERT INTO bloques (perfil_id, tipo, contenido, orden) VALUES ($1, 'social_icons', $2, 2)", [
          cId, JSON.stringify({ redes: [{ tipo: 'facebook', url: 'https://www.facebook.com/CristinaRestauranteOficial/' }, { tipo: 'instagram', url: 'https://instagram.com/cristinarestaurante' }] })
        ]);
        await this.pool.query("INSERT INTO bloques (perfil_id, tipo, contenido, orden) VALUES ($1, 'link', $2, 3)", [
          cId, JSON.stringify({ titulo: '📍 Sucursal 1: Centro — Allende #603', subtitulo: 'Tel: (231) 312-2032 | Servicio 9:00 AM - 11:00 PM', url: 'https://maps.google.com/?q=Cristina+Restaurante+&+Taquería+Allende+603+Teziutlan', icono: '📍', color: '#D97706' })
        ]);
        await this.pool.query("INSERT INTO bloques (perfil_id, tipo, contenido, orden) VALUES ($1, 'link', $2, 4)", [
          cId, JSON.stringify({ titulo: '📍 Sucursal 2: La Maquinita — Av. Hidalgo #1718', subtitulo: 'Tel: (231) 688-4065 | El Pinal, Teziutlán', url: 'https://maps.google.com/?q=Av.+Miguel+Hidalgo+1718+Teziutlan', icono: '🚗', color: '#D97706' })
        ]);
        await this.pool.query("INSERT INTO bloques (perfil_id, tipo, contenido, orden) VALUES ($1, 'link', $2, 5)", [
          cId, JSON.stringify({ titulo: '📍 Sucursal 3: Mercado Victoria — Calle Mercado #51', subtitulo: 'Sabor tradicional en el corazón comercial de la ciudad', url: 'https://maps.google.com/?q=Mercado+Victoria+Teziutlan', icono: '🏪', color: '#D97706' })
        ]);
        await this.pool.query("INSERT INTO bloques (perfil_id, tipo, contenido, orden) VALUES ($1, 'link', $2, 6)", [
          cId, JSON.stringify({ titulo: '🛵 Pedir a Domicilio por Uber Eats', subtitulo: 'Entregas rápidas directo a tu casa u oficina', url: 'https://www.ubereats.com/mx/store/cristina-restaurante-%26-taqueria-suc-centro/Yd6UdKQ7WiSBAcOFDE-wOA', icono: '🛵', color: '#10B981' })
        ]);
        await this.pool.query("INSERT INTO bloques (perfil_id, tipo, contenido, orden) VALUES ($1, 'link', $2, 7)", [
          cId, JSON.stringify({ titulo: '⭐ Reseñas & Calificación TripAdvisor', subtitulo: 'Uno de los restaurantes más recomendados de Teziutlán', url: 'https://www.tripadvisor.com/Search?q=Cristina+Restaurante+Teziutlan', icono: '⭐', color: '#F59E0B' })
        ]);
      }

      // 📺 2. Pequeño Juan
      const jBio = '⭐ 5.0 (226K+ Seguidores) · El medio digital de noticias y comunicación líder en Teziutlán.';
      const jRes = await this.pool.query("SELECT id FROM perfiles WHERE slug = 'pequeno-juan' ORDER BY id ASC");
      let jId;

      if (jRes.rows.length > 0) {
        jId = jRes.rows[0].id;
        if (jRes.rows.length > 1) {
          const extraIds = jRes.rows.slice(1).map(r => r.id);
          for (const extraId of extraIds) {
            await this.pool.query("DELETE FROM bloques WHERE perfil_id = $1", [extraId]);
            await this.pool.query("DELETE FROM perfiles WHERE id = $1", [extraId]);
          }
        }
        await this.pool.query("UPDATE perfiles SET usuario_id = $1, nombre_perfil = 'Pequeño Juan | Medio Digital Líder', tipo = 'negocio', color = '#3182CE', tema = 'neon', bio = $2 WHERE id = $3", [userId, jBio, jId]);
      } else {
        const insJ = await this.pool.query(`
          INSERT INTO perfiles (usuario_id, slug, nombre_perfil, tipo, color, tema, bio, foto_url, banner_url)
          VALUES ($1, 'pequeno-juan', 'Pequeño Juan | Medio Digital Líder', 'negocio', '#3182CE', 'neon', $2, 'https://images.unsplash.com/photo-1598899134739-24c46f58b8c0?w=300', 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=1000')
          RETURNING id
        `, [userId, jBio]);
        jId = insJ.rows[0].id;
      }

      if (jId) {
        await this.pool.query("DELETE FROM bloques WHERE perfil_id = $1", [jId]);

        await this.pool.query("INSERT INTO bloques (perfil_id, tipo, contenido, orden) VALUES ($1, 'whatsapp', $2, 0)", [
          jId, JSON.stringify({ titulo: 'Cotizar Publicidad y Coberturas', url: 'https://wa.me/522311120932', numero: '522311120932', texto: 'Cotizar Publicidad y Coberturas' })
        ]);
        await this.pool.query("INSERT INTO bloques (perfil_id, tipo, contenido, orden) VALUES ($1, 'link', $2, 1)", [
          jId, JSON.stringify({ titulo: '📘 Página Oficial de Facebook', subtitulo: 'Únete a nuestros más de 226,000 seguidores', url: 'https://www.facebook.com/Pequeño-Juan-Teziutlán-Centro', icono: '📘', color: '#1877F2' })
        ]);
        await this.pool.query("INSERT INTO bloques (perfil_id, tipo, contenido, orden) VALUES ($1, 'link', $2, 2)", [
          jId, JSON.stringify({ titulo: '📞 Llamar a Redacción', subtitulo: 'Atención y coberturas 24/7 (231 112 0932)', url: 'tel:2311120932', icono: '📞', color: '#3182CE' })
        ]);
        await this.pool.query("INSERT INTO bloques (perfil_id, tipo, contenido, orden) VALUES ($1, 'link', $2, 3)", [
          jId, JSON.stringify({ titulo: '📍 Oficinas Centrales', subtitulo: 'Av. Benito Juárez 1510-A, Centro, Teziutlán', url: 'https://maps.google.com/?q=Av.+Benito+Juárez+1510-A+Teziutlan', icono: '📍', color: '#3182CE' })
        ]);
      }

      console.log('✅ Tarjetas premium garantizadas en Neon PostgreSQL');
    } catch (e) {
      console.error('Error en _ensurePremiumProfiles PG:', e);
    }
  }

  async _cleanupDuplicateProfiles() {
    try {
      const invalidSlugs = ['cristina-teziutlan', 'cristina-taqueria', 'peque-juan', 'pequeno-juan-medio-digital'];
      for (const slug of invalidSlugs) {
        const rows = await this.pool.query("SELECT id FROM perfiles WHERE slug = $1", [slug]);
        for (const r of rows.rows) {
          await this.pool.query("DELETE FROM bloques WHERE perfil_id = $1", [r.id]);
          await this.pool.query("DELETE FROM perfiles WHERE id = $1", [r.id]);
        }
      }
    } catch (e) {
      console.error('Error en _cleanupDuplicateProfiles PG:', e);
    }
  }

  _executeSync(sql, params = []) {
    const id = ++this.taskId;
    const sharedBuffer = new SharedArrayBuffer(4);
    const typedArray = new Int32Array(sharedBuffer);

    this.worker.postMessage({ id, sql, params, sharedBuffer });

    Atomics.wait(typedArray, 0, 0);

    const tmpPath = path.join(__dirname, `res_${id}.tmp`);
    if (fs.existsSync(tmpPath)) {
      const content = fs.readFileSync(tmpPath, 'utf-8');
      try { fs.unlinkSync(tmpPath); } catch (e) {}
      const data = JSON.parse(content);
      if (data.error) throw new Error(data.error);
      return data;
    }
    return { rows: [], rowCount: 0, lastInsertRowid: 0 };
  }

  prepare(sql) {
    const self = this;
    const normalizedSql = this._normalizeSql(sql);

    return {
      get(...params) {
        const res = self._executeSync(normalizedSql, params);
        return res.rows && res.rows.length > 0 ? res.rows[0] : undefined;
      },

      all(...params) {
        const res = self._executeSync(normalizedSql, params);
        return res.rows || [];
      },

      run(...params) {
        const res = self._executeSync(normalizedSql, params);
        return {
          changes: res.rowCount || 0,
          lastInsertRowid: res.lastInsertRowid || 0
        };
      }
    };
  }

  exec(sql) {
    return this._executeSync(sql, []);
  }

  pragma(str) {
    // No-op for PostgreSQL
  }
}

const wrapper = new PgDatabaseWrapper();
const dbReady = wrapper.init();

module.exports = wrapper;
module.exports.dbReady = dbReady;
module.exports.initPromise = dbReady;
