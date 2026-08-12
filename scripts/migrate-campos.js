#!/usr/bin/env node
/**
 * VYNK — Migración: campos_contacto → bloques
 * 
 * Para cada perfil que tenga campos_contacto pero NO tenga bloques,
 * convierte los campos en bloques del nuevo sistema JSON-driven.
 * 
 * Mapeo:
 *   - whatsapp/telefono → bloque 'whatsapp' o 'link'
 *   - instagram/tiktok/facebook/twitter/linkedin → agrupados en 'social_icons'
 *   - email → bloque 'link' con mailto:
 *   - web/otro → bloque 'link'
 *   - direccion → bloque 'link' con Google Maps
 * 
 * Uso: node scripts/migrate-campos.js
 *      node scripts/migrate-campos.js --dry-run
 */

require('dotenv').config();
const { dbReady } = require('../database/db');

const SOCIAL_TYPES = new Set(['instagram', 'tiktok', 'facebook', 'twitter', 'linkedin', 'youtube', 'spotify', 'pinterest', 'snapchat', 'twitch', 'kick', 'threads']);

const SOCIAL_URLS = {
  instagram: 'https://instagram.com/',
  tiktok: 'https://tiktok.com/@',
  facebook: 'https://facebook.com/',
  twitter: 'https://x.com/',
  linkedin: 'https://linkedin.com/in/',
  youtube: 'https://youtube.com/@',
  spotify: 'https://open.spotify.com/user/',
  pinterest: 'https://pinterest.com/',
  snapchat: 'https://snapchat.com/add/',
  twitch: 'https://twitch.tv/',
  kick: 'https://kick.com/',
  threads: 'https://threads.net/@',
};

async function migrate() {
  const dryRun = process.argv.includes('--dry-run');
  if (dryRun) console.log('🔍 DRY RUN — no se escribirá nada en la base de datos\n');

  const db = await dbReady;
  
  // Encontrar perfiles con campos pero sin bloques
  const perfiles = await db.prepare(`
    SELECT p.id, p.nombre_perfil, p.slug
    FROM perfiles p
    WHERE EXISTS (SELECT 1 FROM campos_contacto cc WHERE cc.perfil_id = p.id)
      AND NOT EXISTS (SELECT 1 FROM bloques b WHERE b.perfil_id = p.id)
  `).all();

  if (perfiles.length === 0) {
    console.log('✅ No hay perfiles que migrar (todos ya tienen bloques o no tienen campos).');
    process.exit(0);
  }

  console.log(`📋 ${perfiles.length} perfil(es) a migrar:\n`);

  let totalMigrated = 0;
  let totalBlocks = 0;

  for (const perfil of perfiles) {
    console.log(`--- Perfil #${perfil.id}: "${perfil.nombre_perfil}" (/${perfil.slug}) ---`);

    const campos = await db.prepare(
      'SELECT * FROM campos_contacto WHERE perfil_id = ? ORDER BY orden ASC, id ASC'
    ).all(perfil.id);

    if (campos.length === 0) {
      console.log('  (sin campos, saltando)');
      continue;
    }

    const socialCampos = campos.filter(c => SOCIAL_TYPES.has(c.tipo));
    const nonSocialCampos = campos.filter(c => !SOCIAL_TYPES.has(c.tipo));
    const bloques = [];
    let orden = 0;

    // 1. WhatsApp primero (si existe)
    const whatsappCampo = nonSocialCampos.find(c => c.tipo === 'whatsapp');
    if (whatsappCampo) {
      const numero = whatsappCampo.valor.replace(/[^0-9+]/g, '');
      bloques.push({
        tipo: 'whatsapp',
        contenido: JSON.stringify({ numero, mensaje_default: 'Hola, vi tu perfil en VYNK' }),
        orden: orden++
      });
      console.log(`  + WhatsApp: ${numero}`);
    }

    // 2. Social icons agrupados
    if (socialCampos.length > 0) {
      const redes = socialCampos.map(c => {
        let url = c.valor;
        // Si el valor no es una URL completa, construirla
        if (!url.startsWith('http')) {
          const base = SOCIAL_URLS[c.tipo] || '';
          url = base + url.replace(/^@/, '');
        }
        return { tipo: c.tipo, url };
      });
      bloques.push({
        tipo: 'social_icons',
        contenido: JSON.stringify({ redes }),
        orden: orden++
      });
      console.log(`  + Social icons: ${redes.map(r => r.tipo).join(', ')}`);
    }

    // 3. Resto de campos como bloques individuales
    for (const campo of nonSocialCampos) {
      if (campo.tipo === 'whatsapp') continue; // ya procesado

      let bloque;
      switch (campo.tipo) {
        case 'telefono':
          bloque = {
            tipo: 'link',
            contenido: JSON.stringify({
              url: `tel:${campo.valor}`,
              titulo: campo.etiqueta || 'Llamar',
              subtitulo: campo.valor,
              icono: 'phone'
            })
          };
          console.log(`  + Link (tel): ${campo.valor}`);
          break;

        case 'email':
          bloque = {
            tipo: 'link',
            contenido: JSON.stringify({
              url: `mailto:${campo.valor}`,
              titulo: campo.etiqueta || 'Email',
              subtitulo: campo.valor,
              icono: 'mail'
            })
          };
          console.log(`  + Link (email): ${campo.valor}`);
          break;

        case 'direccion':
          bloque = {
            tipo: 'link',
            contenido: JSON.stringify({
              url: `https://maps.google.com/?q=${encodeURIComponent(campo.valor)}`,
              titulo: campo.etiqueta || 'Ubicación',
              subtitulo: campo.valor,
              icono: 'map-pin'
            })
          };
          console.log(`  + Link (mapa): ${campo.valor}`);
          break;

        case 'web':
          bloque = {
            tipo: 'link',
            contenido: JSON.stringify({
              url: campo.valor.startsWith('http') ? campo.valor : `https://${campo.valor}`,
              titulo: campo.etiqueta || 'Sitio web',
              subtitulo: campo.valor,
              icono: 'globe'
            })
          };
          console.log(`  + Link (web): ${campo.valor}`);
          break;

        default:
          bloque = {
            tipo: 'link',
            contenido: JSON.stringify({
              url: campo.valor.startsWith('http') ? campo.valor : '#',
              titulo: campo.etiqueta || campo.tipo,
              subtitulo: campo.valor,
              icono: 'link'
            })
          };
          console.log(`  + Link (${campo.tipo}): ${campo.valor}`);
      }

      bloque.orden = orden++;
      bloques.push(bloque);
    }

    // Insertar bloques
    if (!dryRun) {
      for (const b of bloques) {
        await db.prepare(
          'INSERT INTO bloques (perfil_id, tipo, contenido, orden, visible) VALUES (?, ?, ?, ?, 1)'
        ).run(perfil.id, b.tipo, b.contenido, b.orden);
      }
    }

    totalMigrated++;
    totalBlocks += bloques.length;
    console.log(`  = ${bloques.length} bloques creados\n`);
  }

  console.log('========================================');
  console.log(`✅ Migración ${dryRun ? '(DRY RUN) ' : ''}completada:`);
  console.log(`   ${totalMigrated} perfiles migrados`);
  console.log(`   ${totalBlocks} bloques creados`);
  console.log('========================================');

  process.exit(0);
}

migrate().catch(err => {
  console.error('❌ Error en migración:', err);
  process.exit(1);
});
