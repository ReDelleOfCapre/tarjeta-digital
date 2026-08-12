const { Pool } = require('pg');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

require('dotenv').config();

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_peRwZf4D5XsK@ep-crimson-tooth-axo8ifo4.c-4.us-east-2.aws.neon.tech/neondb?sslmode=require';

/**
 * Async/await wrapper around a single pg.Pool.
 * Mantiene una API compatible tipo better-sqlite3:
 *   db.prepare(sql).get(...params)
 *   db.prepare(sql).all(...params)
 *   db.prepare(sql).run(...params)
 *   db.exec(sql)
 *   db.query(sql, params)  -> { rows, rowCount, lastInsertRowid }
 *   db.get(sql, params)
 *   db.all(sql, params)
 *   db.run(sql, params)
 */
class PgDatabaseWrapper {
  constructor() {
    this.connectionString = DATABASE_URL;
    this.pool = new Pool({
      connectionString: this.connectionString,
      ssl: { rejectUnauthorized: false },
      max: 20,
      idleTimeoutMillis: 30000
    });

    this.pool.on('error', (err) => {
      console.error('❌ Error inesperado en pg.Pool:', err);
    });
  }

  _normalizeSql(sql) {
    let normalized = sql;
    let hasConflictClause = /ON\s+CONFLICT/i.test(normalized);

    let paramIndex = 0;
    normalized = normalized.replace(/\$\d+/g, () => {
      return `?`;
    });
    normalized = normalized.replace(/\?/g, () => {
      paramIndex++;
      return `$${paramIndex}`;
    });

    return normalized;
  }

  async query(sql, params = []) {
    const finalSql = this._normalizeSql(sql);
    const res = await this.pool.query(finalSql, params);
    return {
      rows: res.rows || [],
      rowCount: res.rowCount || 0,
      lastInsertRowid: res.rows && res.rows[0] && res.rows[0].id ? res.rows[0].id : 0
    };
  }

  async get(sql, params = []) {
    const res = await this.query(sql, params);
    return res.rows && res.rows.length > 0 ? res.rows[0] : undefined;
  }

  async all(sql, params = []) {
    const res = await this.query(sql, params);
    return res.rows || [];
  }

  async run(sql, params = []) {
    const res = await this.query(sql, params);
    return {
      changes: res.rowCount || 0,
      lastInsertRowid: res.lastInsertRowid || 0
    };
  }

  async exec(sql) {
    await this.pool.query(sql);
    return { rows: [], rowCount: 0, lastInsertRowid: 0 };
  }

  /**
   * Adapter tipo better-sqlite3 — devuelve un objeto con get/all/run
   * que internamente son async. Esto permite que los routes migren
   * gradualmente de .get() síncrono a await.
   *
   * IMPORTANTE: los call-sites deben usar `await`. Si los routes
   * olvidan el `await`, devolverán Promises. Migración 1:1 obligatoria.
   */
  prepare(sql) {
    const self = this;
    const normalizedSql = this._normalizeSql(sql);

    return {
      async get(...params) {
        return self.get(normalizedSql, params);
      },
      async all(...params) {
        return self.all(normalizedSql, params);
      },
      async run(...params) {
        return self.run(normalizedSql, params);
      }
    };
  }

  pragma() {
    // No-op para PostgreSQL
  }

  async init() {
    try {
      const schemaPath = path.join(__dirname, 'schema.sql');
      const schemaSql = fs.readFileSync(schemaPath, 'utf-8');
      await this.pool.query(schemaSql);
      await this._runMigrations();
      console.log('✅ Base de datos Neon PostgreSQL (Cloud) conectada e inicializada con esquema');

      await this._seedDatabase();
      await this._ensureDemoAccount();
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
      await this.pool.query("ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS is_first_login BOOLEAN DEFAULT TRUE");
      await this.pool.query("ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS is_pro BOOLEAN DEFAULT FALSE");
      await this.pool.query("ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255)");
      await this.pool.query("ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS hardware_orders JSONB DEFAULT '[]'::jsonb");
    } catch (e) {
      console.error('Error corriendo migraciones PG:', e);
    }
  }

  async _seedDatabase() {
    try {
      const defaultPassHash = bcrypt.hashSync('admin1234', 10);

      const adminRes = await this.pool.query(
        "SELECT id FROM usuarios WHERE telefono = $1 OR email = $2 LIMIT 1",
        ['2311556138', 'gpprzrom@gmail.com']
      );
      let adminId = adminRes.rows[0] ? adminRes.rows[0].id : null;

      if (!adminId) {
        const insAdmin = await this.pool.query(
          `INSERT INTO usuarios (telefono, nombre, password_hash, email, plan, role, acciones_restantes)
           VALUES ($1, $2, $3, $4, 'paid', 'admin', 10)
           RETURNING id`,
          ['2311556138', 'Giovanni Paolo', defaultPassHash, 'gpprzrom@gmail.com']
        );
        adminId = insAdmin.rows[0].id;
      } else {
        await this.pool.query(
          "UPDATE usuarios SET role = 'admin', plan = 'paid', email = $1, nombre = 'Giovanni Paolo' WHERE id = $2",
          ['gpprzrom@gmail.com', adminId]
        );
      }

      const giovanniRes = await this.pool.query("SELECT id FROM perfiles WHERE slug = 'giovanni'");
      if (giovanniRes.rows.length === 0) {
        const insG = await this.pool.query(
          `INSERT INTO perfiles (usuario_id, slug, nombre_perfil, tipo, color, tema, bio)
           VALUES ($1, 'giovanni', 'Giovanni Paolo — VYNK Director', 'personal', '#7C3AED', 'neon', 'Fundador de VYNK. Creando la mejor plataforma de identidad digital.')
           RETURNING id`,
          [adminId]
        );
        const gId = insG.rows[0].id;
        await this.pool.query(
          "INSERT INTO bloques (perfil_id, tipo, contenido, orden) VALUES ($1, 'whatsapp', $2, 0)",
          [gId, JSON.stringify({ numero: '522311556138', mensaje_default: 'Hola Giovanni!' })]
        );
        await this.pool.query(
          "INSERT INTO bloques (perfil_id, tipo, contenido, orden) VALUES ($1, 'social_icons', $2, 1)",
          [gId, JSON.stringify({ redes: [{ tipo: 'instagram', url: 'https://instagram.com' }, { tipo: 'linkedin', url: 'https://linkedin.com' }] })]
        );
      }

      console.log('✅ Admin seed aplicado');
    } catch (e) {
      console.error('Error en _seedDatabase PG:', e);
    }
  }

  async _ensureDemoAccount() {
    try {
      const demoEmail = 'demo@VYNK.app';
      const demoPass = 'demo1234';
      const demoHash = bcrypt.hashSync(demoPass, 10);

      const existing = await this.pool.query(
        "SELECT id FROM usuarios WHERE email = $1 LIMIT 1",
        [demoEmail]
      );

      if (existing.rows.length === 0) {
        await this.pool.query(
          `INSERT INTO usuarios (telefono, nombre, password_hash, email, plan, role, acciones_restantes, terms_accepted)
           VALUES ($1, $2, $3, $4, 'paid', 'user', 999, TRUE)`,
          ['+525555555555', 'Cuenta Demo VYNK', demoHash, demoEmail]
        );
        console.log('✅ Cuenta demo@VYNK.app creada (password: demo1234)');
      } else {
        await this.pool.query(
          "UPDATE usuarios SET plan = 'paid', role = 'user', nombre = 'Cuenta Demo VYNK', password_hash = $1 WHERE email = $2",
          [demoHash, demoEmail]
        );
        console.log('✅ Cuenta demo@VYNK.app actualizada');
      }
    } catch (e) {
      console.error('Error en _ensureDemoAccount:', e);
    }
  }

  async _ensurePremiumProfiles() {
    try {
      // Los perfiles demo asignan a la cuenta demo, no al admin
      const demoRes = await this.pool.query(
        "SELECT id FROM usuarios WHERE email = $1 LIMIT 1",
        ['demo@VYNK.app']
      );

      if (demoRes.rows.length === 0) {
        console.error('⚠️ No existe la cuenta demo, saltando _ensurePremiumProfiles');
        return;
      }

      const userId = demoRes.rows[0].id;

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
        await this.pool.query(
          "UPDATE perfiles SET usuario_id = $1, nombre_perfil = 'Cristina Restaurante & Taquería', tipo = 'negocio', color = '#E53E3E', tema = 'food', bio = $2 WHERE id = $3",
          [userId, cBio, cId]
        );
      } else {
        const insC = await this.pool.query(
          `INSERT INTO perfiles (usuario_id, slug, nombre_perfil, tipo, color, tema, bio, foto_url, banner_url)
           VALUES ($1, 'cristina', 'Cristina Restaurante & Taquería', 'negocio', '#E53E3E', 'food', $2, 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=300', 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1000')
           RETURNING id`,
          [userId, cBio]
        );
        cId = insC.rows[0].id;
      }

      if (cId) {
        await this.pool.query("DELETE FROM bloques WHERE perfil_id = $1", [cId]);

        await this.pool.query(
          "INSERT INTO bloques (perfil_id, tipo, contenido, orden) VALUES ($1, 'whatsapp', $2, 0)",
          [cId, JSON.stringify({ titulo: 'WhatsApp', url: 'https://wa.me/522311556138', numero: '522311556138', texto: 'WhatsApp' })]
        );
        await this.pool.query(
          "INSERT INTO bloques (perfil_id, tipo, contenido, orden) VALUES ($1, 'link', $2, 1)",
          [cId, JSON.stringify({ titulo: '📖 Menú Digital & Carta Completa', subtitulo: 'Tacos al pastor, desayunos buffet, cortes y antojitos típicos', url: 'https://www.ubereats.com/mx/store/cristina-restaurante-%26-taqueria-suc-centro/Yd6UdKQ7WiSBAcOFDE-wOA', icono: '📖', color: '#E53E3E' })]
        );
        await this.pool.query(
          "INSERT INTO bloques (perfil_id, tipo, contenido, orden) VALUES ($1, 'social_icons', $2, 2)",
          [cId, JSON.stringify({ redes: [{ tipo: 'facebook', url: 'https://www.facebook.com/CristinaRestauranteOficial/' }, { tipo: 'instagram', url: 'https://instagram.com/cristinarestaurante' }] })]
        );
        await this.pool.query(
          "INSERT INTO bloques (perfil_id, tipo, contenido, orden) VALUES ($1, 'link', $2, 3)",
          [cId, JSON.stringify({ titulo: '📍 Sucursal 1: Centro — Allende #603', subtitulo: 'Tel: (231) 312-2032 | Servicio 9:00 AM - 11:00 PM', url: 'https://maps.google.com/?q=Cristina+Restaurante+&+Taquería+Allende+603+Teziutlan', icono: '📍', color: '#D97706' })]
        );
        await this.pool.query(
          "INSERT INTO bloques (perfil_id, tipo, contenido, orden) VALUES ($1, 'link', $2, 4)",
          [cId, JSON.stringify({ titulo: '📍 Sucursal 2: La Maquinita — Av. Hidalgo #1718', subtitulo: 'Tel: (231) 688-4065 | El Pinal, Teziutlán', url: 'https://maps.google.com/?q=Av.+Miguel+Hidalgo+1718+Teziutlan', icono: '🚗', color: '#D97706' })]
        );
        await this.pool.query(
          "INSERT INTO bloques (perfil_id, tipo, contenido, orden) VALUES ($1, 'link', $2, 5)",
          [cId, JSON.stringify({ titulo: '📍 Sucursal 3: Mercado Victoria — Calle Mercado #51', subtitulo: 'Sabor tradicional en el corazón comercial de la ciudad', url: 'https://maps.google.com/?q=Mercado+Victoria+Teziutlan', icono: '🏪', color: '#D97706' })]
        );
        await this.pool.query(
          "INSERT INTO bloques (perfil_id, tipo, contenido, orden) VALUES ($1, 'link', $2, 6)",
          [cId, JSON.stringify({ titulo: '🛵 Pedir a Domicilio por Uber Eats', subtitulo: 'Entregas rápidas directo a tu casa u oficina', url: 'https://www.ubereats.com/mx/store/cristina-restaurante-%26-taqueria-suc-centro/Yd6UdKQ7WiSBAcOFDE-wOA', icono: '🛵', color: '#10B981' })]
        );
        await this.pool.query(
          "INSERT INTO bloques (perfil_id, tipo, contenido, orden) VALUES ($1, 'link', $2, 7)",
          [cId, JSON.stringify({ titulo: '⭐ Reseñas & Calificación TripAdvisor', subtitulo: 'Uno de los restaurantes más recomendados de Teziutlán', url: 'https://www.tripadvisor.com/Search?q=Cristina+Restaurante+Teziutlan', icono: '⭐', color: '#F59E0B' })]
        );
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
        await this.pool.query(
          "UPDATE perfiles SET usuario_id = $1, nombre_perfil = 'Pequeño Juan | Medio Digital Líder', tipo = 'negocio', color = '#3182CE', tema = 'neon', bio = $2 WHERE id = $3",
          [userId, jBio, jId]
        );
      } else {
        const insJ = await this.pool.query(
          `INSERT INTO perfiles (usuario_id, slug, nombre_perfil, tipo, color, tema, bio, foto_url, banner_url)
           VALUES ($1, 'pequeno-juan', 'Pequeño Juan | Medio Digital Líder', 'negocio', '#3182CE', 'neon', $2, 'https://images.unsplash.com/photo-1598899134739-24c46f58b8c0?w=300', 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=1000')
           RETURNING id`,
          [userId, jBio]
        );
        jId = insJ.rows[0].id;
      }

      if (jId) {
        await this.pool.query("DELETE FROM bloques WHERE perfil_id = $1", [jId]);

        await this.pool.query(
          "INSERT INTO bloques (perfil_id, tipo, contenido, orden) VALUES ($1, 'whatsapp', $2, 0)",
          [jId, JSON.stringify({ titulo: 'Cotizar Publicidad y Coberturas', url: 'https://wa.me/522311120932', numero: '522311120932', texto: 'Cotizar Publicidad y Coberturas' })]
        );
        await this.pool.query(
          "INSERT INTO bloques (perfil_id, tipo, contenido, orden) VALUES ($1, 'link', $2, 1)",
          [jId, JSON.stringify({ titulo: '📘 Página Oficial de Facebook', subtitulo: 'Únete a nuestros más de 226,000 seguidores', url: 'https://www.facebook.com/Pequeño-Juan-Teziutlán-Centro', icono: '📘', color: '#1877F2' })]
        );
        await this.pool.query(
          "INSERT INTO bloques (perfil_id, tipo, contenido, orden) VALUES ($1, 'link', $2, 2)",
          [jId, JSON.stringify({ titulo: '📞 Llamar a Redacción', subtitulo: 'Atención y coberturas 24/7 (231 112 0932)', url: 'tel:2311120932', icono: '📞', color: '#3182CE' })]
        );
        await this.pool.query(
          "INSERT INTO bloques (perfil_id, tipo, contenido, orden) VALUES ($1, 'link', $2, 3)",
          [jId, JSON.stringify({ titulo: '📍 Oficinas Centrales', subtitulo: 'Av. Benito Juárez 1510-A, Centro, Teziutlán', url: 'https://maps.google.com/?q=Av.+Benito+Juárez+1510-A+Teziutlan', icono: '📍', color: '#3182CE' })]
        );
      }

      console.log('✅ Tarjetas premium garantizadas en Neon PostgreSQL (cuenta demo)');
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

  async close() {
    await this.pool.end();
  }
}

const wrapper = new PgDatabaseWrapper();
const dbReady = wrapper.init();

module.exports = wrapper;
module.exports.dbReady = dbReady;
module.exports.initPromise = dbReady;
