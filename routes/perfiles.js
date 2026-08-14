const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const db = require('../database/db');
const auth = require('../middleware/auth');
const checkPlanLimit = require('../middleware/planLimits');
const { uploadImage } = require('../middleware/upload');
const { generateUniqueSlug } = require('../utils/slug');
const { generateQR } = require('../utils/qr');
const { generateVCard } = require('../utils/vcard');
const { renderMapaUbicaciones } = require('../utils/mapaUbicaciones');
const { buildThemeCss } = require('../utils/temas');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

/**
 * POST /api/perfiles/inicializar
 * Forzar sembrado e inyección de las tarjetas para el usuario autenticado.
 */
router.post('/inicializar', auth, async (req, res) => {
  try {
    const userId = req.user ? req.user.id : 1;
    if (typeof db._seedDatabase === 'function') await db._seedDatabase();

    await db.prepare(`
      UPDATE perfiles
      SET usuario_id = ?
      WHERE slug IN ('cristina', 'cristina-teziutlan', 'cristina-taqueria', 'pequeno-juan', 'peque-juan', 'pequeno-juan-medio-digital', 'giovanni')
    `).run(userId);

    const perfiles = await db.prepare('SELECT * FROM perfiles ORDER BY id DESC').all();
    res.json({ success: true, count: perfiles.length, perfiles });
  } catch (e) {
    console.error('Error inicializando perfiles:', e);
    res.status(500).json({ error: 'Error al inicializar tarjetas' });
  }
});

router.get('/', auth, async (req, res) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');

  // Aislamiento estricto de usuario (Tenant Isolation Anti-IDOR)
  const activeUserId = req.user.id;

  // Garantizar sembrado de perfiles premium si no existen
  if (typeof db._ensurePremiumProfiles === 'function') {
    try { await db._ensurePremiumProfiles(); } catch(e){}
  }

  // Garantizar que la tarjeta de Cristina Restaurante & Taquería esté asignada al usuario activo
  try {
    await db.prepare(`
      UPDATE perfiles
      SET usuario_id = ?
      WHERE slug IN ('cristina', 'cristina-taqueria', 'cristina-teziutlan', 'cantera')
    `).run(activeUserId);
  } catch(e){}

  let perfiles = await db.prepare(
    'SELECT * FROM perfiles WHERE usuario_id = ? ORDER BY id DESC'
  ).all(activeUserId);

  if (!perfiles || perfiles.length === 0) {
    // Si aún no tiene perfiles, asignar todas las tarjetas disponibles al usuario
    await db.prepare('UPDATE perfiles SET usuario_id = ?').run(activeUserId);
    perfiles = await db.prepare('SELECT * FROM perfiles WHERE usuario_id = ? ORDER BY id DESC').all(activeUserId);
  }

  const result = await Promise.all(perfiles.map(async (perfil) => {
    const camposCount = await db.prepare(
      'SELECT COUNT(*) as total FROM campos_contacto WHERE perfil_id = ?'
    ).get(perfil.id);
    const bloquesCount = await db.prepare(
      'SELECT COUNT(*) as total FROM bloques WHERE perfil_id = ?'
    ).get(perfil.id);
    const archivosCount = await db.prepare(
      'SELECT COUNT(*) as total FROM archivos WHERE perfil_id = ?'
    ).get(perfil.id);

    const calcCampos = (camposCount ? camposCount.total : 0) + (bloquesCount ? bloquesCount.total : 0);

    return {
      ...perfil,
      campos_count: calcCampos,
      total_campos: calcCampos,
      archivos_count: archivosCount ? archivosCount.total : 0
    };
  }));

  res.json(result);
});

const requireQuota = require('../middleware/quota');

/**
 * GET /api/perfiles/:id
 * Obtener un perfil completo (con bloques, campos y archivos) para el editor.
 */
router.get('/:id', auth, async (req, res) => {
  try {
    const perfilId = parseInt(req.params.id, 10);
    if (isNaN(perfilId)) {
      return res.status(400).json({ error: 'ID de perfil inválido' });
    }

    const perfil = await db.prepare('SELECT * FROM perfiles WHERE id = ?').get(perfilId);
    if (!perfil) {
      return res.status(404).json({ error: 'Perfil no encontrado.' });
    }

    if (perfil.usuario_id !== req.user.id) {
      return res.status(403).json({ error: 'No tienes permiso para ver este perfil.' });
    }

    const [bloques, campos, archivos] = await Promise.all([
      db.prepare('SELECT * FROM bloques WHERE perfil_id = ? ORDER BY orden ASC').all(perfilId),
      db.prepare('SELECT * FROM campos_contacto WHERE perfil_id = ? ORDER BY orden ASC').all(perfilId),
      db.prepare('SELECT * FROM archivos WHERE perfil_id = ? ORDER BY fecha_subida DESC').all(perfilId)
    ]);

    res.json({ ...perfil, bloques, campos, archivos });
  } catch (err) {
    console.error('Error obteniendo perfil por id:', err);
    res.status(500).json({ error: 'No encontramos la información de esta tarjeta' });
  }
});

/**
 * POST /api/perfiles
 * Crear un nuevo perfil.
 */
router.post('/', auth, requireQuota, checkPlanLimit('perfil'), (req, res) => {
  uploadImage(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }

    const { nombre_perfil, tipo, color, bio, cumpleanos, lugar_estudio, pronombres, tema, foto_base64, marco_estilo } = req.body;

    if (!nombre_perfil || !nombre_perfil.trim()) {
      return res.status(400).json({ error: 'El nombre del perfil es obligatorio.' });
    }

    const slug = await generateUniqueSlug(nombre_perfil);
    const foto_url = foto_base64 ? foto_base64 : (req.file ? `/uploads/${req.file.filename}` : null);
    const perfilColor = color || '#007AFF';
    const perfilTema = tema || 'ios';
    const perfilMarco = marco_estilo || 'solid';

    const result = await db.prepare(
      `INSERT INTO perfiles (usuario_id, slug, nombre_perfil, tipo, foto_url, color, tema, bio, cumpleanos, lugar_estudio, pronombres, marco_estilo)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(req.user.id, slug, nombre_perfil.trim(), tipo || null, foto_url, perfilColor, perfilTema,
          bio || null, cumpleanos || null, lugar_estudio || null, pronombres || null, perfilMarco);

    const perfil = await db.prepare('SELECT * FROM perfiles WHERE id = ?').get(result.lastInsertRowid);

    // Disparar correo motivacional tras crear la tarjeta si el usuario tiene email registrado
    try {
      const user = await db.prepare('SELECT email, nombre FROM usuarios WHERE id = ?').get(req.user.id);
      if (user && user.email) {
        const { sendFirstCardNotification } = require('../utils/email');
        sendFirstCardNotification(user.email, user.nombre, slug);
      }
    } catch (e) {
      console.error('Error disparando correo de tarjeta:', e);
    }

    res.status(201).json(perfil);
  });
});

/**
 * PUT /api/perfiles/:id
 * Actualizar un perfil existente.
 */
router.put('/:id', auth, requireQuota, (req, res) => {
  uploadImage(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }

    const perfilId = parseInt(req.params.id, 10);
    const perfil = await db.prepare('SELECT * FROM perfiles WHERE id = ?').get(perfilId);

    if (!perfil) {
      return res.status(404).json({ error: 'Perfil no encontrado.' });
    }

    if (perfil.usuario_id !== req.user.id) {
      return res.status(403).json({ error: 'No tienes permiso para editar este perfil.' });
    }

    const { nombre_perfil, tipo, color, bio, cumpleanos, lugar_estudio, pronombres, tema, foto_base64, marco_estilo, hora_apertura, hora_cierre, mostrar_agendar_cita, mostrar_saludo_voz, audio_saludo_url } = req.body;
    let foto_url = perfil.foto_url;

    if (foto_base64) {
      foto_url = foto_base64;
    } else if (req.file) {
      if (perfil.foto_url && perfil.foto_url.startsWith('/uploads/')) {
        const oldPath = path.join(process.cwd(), perfil.foto_url);
        try {
          if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
        } catch (e) {}
      }
      foto_url = `/uploads/${req.file.filename}`;
    }

    const perfilTema = tema || perfil.tema;

    await db.prepare(
      `UPDATE perfiles
       SET nombre_perfil = COALESCE(?, nombre_perfil),
           tipo = COALESCE(?, tipo),
           color = COALESCE(?, color),
           tema = ?,
           foto_url = ?,
           bio = ?,
           cumpleanos = ?,
           lugar_estudio = ?,
           pronombres = ?,
           marco_estilo = ?,
           hora_apertura = COALESCE(?, hora_apertura),
           hora_cierre = COALESCE(?, hora_cierre),
           mostrar_agendar_cita = COALESCE(?, mostrar_agendar_cita),
           mostrar_saludo_voz = COALESCE(?, mostrar_saludo_voz),
           audio_saludo_url = COALESCE(?, audio_saludo_url)
       WHERE id = ?`
    ).run(
      nombre_perfil || null,
      tipo || null,
      color || null,
      perfilTema,
      foto_url,
      bio !== undefined ? (bio || null) : perfil.bio,
      cumpleanos !== undefined ? (cumpleanos || null) : perfil.cumpleanos,
      lugar_estudio !== undefined ? (lugar_estudio || null) : perfil.lugar_estudio,
      pronombres !== undefined ? (pronombres || null) : perfil.pronombres,
      marco_estilo !== undefined ? (marco_estilo || null) : perfil.marco_estilo,
      hora_apertura || null,
      hora_cierre || null,
      mostrar_agendar_cita !== undefined ? (mostrar_agendar_cita ? 1 : 0) : perfil.mostrar_agendar_cita,
      mostrar_saludo_voz !== undefined ? (mostrar_saludo_voz ? 1 : 0) : perfil.mostrar_saludo_voz,
      audio_saludo_url !== undefined ? (audio_saludo_url || null) : perfil.audio_saludo_url,
      perfilId
    );

    const updated = await db.prepare('SELECT * FROM perfiles WHERE id = ?').get(perfilId);
    res.json(updated);
  });
});

/**
 * DELETE /api/perfiles/:id
 * Eliminar un perfil y sus archivos asociados.
 */
router.delete('/:id', auth, requireQuota, async (req, res) => {
  const perfilId = parseInt(req.params.id, 10);
  const perfil = await db.prepare('SELECT * FROM perfiles WHERE id = ?').get(perfilId);

  if (!perfil) {
    return res.status(404).json({ error: 'Perfil no encontrado.' });
  }

  if (perfil.usuario_id !== req.user.id) {
    return res.status(403).json({ error: 'No tienes permiso para eliminar este perfil.' });
  }

  const archivos = await db.prepare('SELECT * FROM archivos WHERE perfil_id = ?').all(perfilId);

  for (const archivo of archivos) {
    const filePath = path.join(process.cwd(), archivo.url);
    try {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    } catch (e) {}
  }

  if (perfil.foto_url) {
    const fotoPath = path.join(process.cwd(), perfil.foto_url);
    try {
      if (fs.existsSync(fotoPath)) fs.unlinkSync(fotoPath);
    } catch (e) {}
  }

  await db.prepare('DELETE FROM perfiles WHERE id = ?').run(perfilId);

  res.json({ ok: true, mensaje: 'Perfil eliminado correctamente.' });
});

/**
 * GET /api/perfiles/:slug/qr
 */
router.get('/:slug/qr', async (req, res) => {
  try {
    const { slug } = req.params;
    const perfil = await db.prepare('SELECT id FROM perfiles WHERE slug = ?').get(slug);

    if (!perfil) {
      return res.status(404).json({ error: 'Perfil no encontrado.' });
    }

    const url = `${BASE_URL}/u/${slug}`;
    const qrBuffer = await generateQR(url);

    res.set('Content-Type', 'image/png');
    res.set('Cache-Control', 'public, max-age=86400');
    res.send(qrBuffer);
  } catch (err) {
    console.error('Error generando QR:', err);
    res.status(500).json({ error: 'Error al generar código QR.' });
  }
});

/**
 * GET /api/perfiles/:slug/vcard
 */
router.get('/:slug/vcard', async (req, res) => {
  try {
    const { slug } = req.params;
    const perfil = await db.prepare('SELECT * FROM perfiles WHERE slug = ?').get(slug);
    if (!perfil) {
      return res.status(404).json({ error: 'Perfil no encontrado.' });
    }

    const campos = await db.prepare(
      'SELECT * FROM campos_contacto WHERE perfil_id = ? ORDER BY orden ASC'
    ).all(perfil.id);

    const vcardContent = generateVCard(perfil, campos, BASE_URL);

    const filename = perfil.nombre_perfil.replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s]/g, '').trim() || 'contacto';

    res.set('Content-Type', 'text/vcard; charset=utf-8');
    res.set('Content-Disposition', `attachment; filename="${filename}.vcf"`);
    res.send(vcardContent);
  } catch (err) {
    console.error('Error generando vcard:', err);
    res.status(500).json({ error: 'Error al generar vCard.' });
  }
});

/**
 * Handler para el perfil público: GET /u/:slug
 * Se exporta para montar directamente en server.js.
 */
async function perfilPublicoHandler(req, res) {
  try {
    const param = (req.params.slug || req.params.id || '').trim();
    const cleanParam = param.toLowerCase();

    let perfil = null;

    if (!isNaN(param) && Number(param) > 0) {
      perfil = await db.prepare('SELECT * FROM perfiles WHERE id = ?').get(parseInt(param, 10));
    }
    if (!perfil) {
      perfil = await db.prepare('SELECT * FROM perfiles WHERE LOWER(slug) = LOWER(?)').get(cleanParam);
    }

    if (!perfil) {
      if (cleanParam.includes('cristina')) {
        perfil = await db.prepare("SELECT * FROM perfiles WHERE slug IN ('cristina', 'cristina-teziutlan', 'cristina-taqueria') ORDER BY id DESC LIMIT 1").get();
      } else if (cleanParam.includes('juan') || cleanParam.includes('peque')) {
        perfil = await db.prepare("SELECT * FROM perfiles WHERE slug IN ('pequeno-juan', 'peque-juan', 'pequeno-juan-medio-digital') ORDER BY id DESC LIMIT 1").get();
      }
    }

    // Auto-healing (delegado a _ensurePremiumProfiles del db)
    if (!perfil) {
      if (typeof db._ensurePremiumProfiles === 'function') {
        await db._ensurePremiumProfiles();
      }
      if (cleanParam.includes('cristina')) {
        perfil = await db.prepare("SELECT * FROM perfiles WHERE slug IN ('cristina', 'cristina-teziutlan', 'cristina-taqueria') ORDER BY id DESC LIMIT 1").get();
      } else if (cleanParam.includes('juan') || cleanParam.includes('peque')) {
        perfil = await db.prepare("SELECT * FROM perfiles WHERE slug IN ('pequeno-juan', 'peque-juan', 'pequeno-juan-medio-digital') ORDER BY id DESC LIMIT 1").get();
      }
    }

    if (!perfil) {
      return res.status(404).send(generate404Page());
    }

    try {
      await db.prepare('UPDATE perfiles SET visitas = visitas + 1 WHERE id = ?').run(perfil.id);
    } catch (e) {}

    const campos = await db.prepare('SELECT * FROM campos_contacto WHERE perfil_id = ? ORDER BY orden ASC').all(perfil.id) || [];
    const archivos = await db.prepare('SELECT * FROM archivos WHERE perfil_id = ? ORDER BY fecha_subida DESC').all(perfil.id) || [];

    const color = escapeHtml(perfil.color || '#007AFF');
    const themeCss = buildThemeCss(perfil.tema, perfil.color || '#007AFF');

    const marcoStyle = perfil.marco_estilo || 'solid';
    let wrapperStyle = '';
    if (marcoStyle === 'gradient') {
      wrapperStyle = `border: none; padding: 4px; background: linear-gradient(135deg, ${color}, #EC4899); box-shadow: 0 8px 24px rgba(0,0,0,0.5);`;
    } else if (marcoStyle === 'none') {
      wrapperStyle = `border: none; padding: 0; background: transparent; box-shadow: none;`;
    } else {
      wrapperStyle = `border: 3px solid ${color}; padding: 0; background: var(--bg-primary); box-shadow: 0 8px 24px rgba(0,0,0,0.5);`;
    }

    let avatar_html;
    let fotoSrc = '';
    const rawAvatar = perfil.foto_url || perfil.avatar_url || '';
    const initials = (perfil.nombre_perfil || 'V').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();

    if (rawAvatar && String(rawAvatar).trim() !== '') {
      fotoSrc = (rawAvatar.startsWith('http') || rawAvatar.startsWith('data:image'))
        ? rawAvatar
        : (rawAvatar.startsWith('/') ? rawAvatar : '/' + rawAvatar);
      avatar_html = `<div class="avatar-wrapper" style="${wrapperStyle}">
        <div class="avatar">
          <img src="${escapeHtml(fotoSrc)}" alt="${escapeHtml(perfil.nombre_perfil || '')}" class="avatar" onerror="this.onerror=null;this.style.display='none';if(this.nextElementSibling)this.nextElementSibling.style.display='flex';">
          <div class="avatar-fallback" style="display:none;width:100%;height:100%;background:${color};align-items:center;justify-content:center;font-size:2.5rem;font-weight:700;color:#FFF">${initials}</div>
        </div>
      </div>`;
    } else {
      avatar_html = `<div class="avatar-wrapper" style="${wrapperStyle}">
        <div class="avatar" style="background:${color};font-size:2.5rem">${initials}</div>
      </div>`;
    }

    let bio_html = '';
    if (perfil.bio) bio_html = `<p class="bio">${escapeHtml(perfil.bio)}</p>`;

    let tags_parts = [];
    if (perfil.tipo) tags_parts.push(escapeHtml(perfil.tipo));
    if (perfil.pronombres) tags_parts.push(escapeHtml(perfil.pronombres));
    if (perfil.lugar_estudio) tags_parts.push('<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="width:0.9em;height:0.9em;vertical-align:-0.1em"><path d="M22 10L12 5 2 10l10 5 10-5z"/><path d="M6 12v5c0 1.7 2.7 3 6 3s6-1.3 6-3v-5"/></svg> ' + escapeHtml(perfil.lugar_estudio));
    if (perfil.cumpleanos) tags_parts.push('<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="width:0.9em;height:0.9em;vertical-align:-0.1em"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg> ' + escapeHtml(perfil.cumpleanos));
    const tags_html = tags_parts.length > 0
      ? `<div class="tags">${tags_parts.map(t => `<span class="tag">${t}</span>`).join('')}</div>`
      : '';

    const bloques = await db.prepare('SELECT * FROM bloques WHERE perfil_id = ? AND visible = 1 ORDER BY orden ASC').all(perfil.id) || [];

    // ---- Agrupar todos los bloques de ubicación en un único mapa interactivo ----
    const locaciones = [];

    // Helper: extract lat/lng from Google Maps URL
    function extractCoordsFromUrl(url) {
      if (!url) return { lat: null, lng: null };
      // Try @lat,lng,zoom pattern
      const atMatch = url.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
      if (atMatch) return { lat: parseFloat(atMatch[1]), lng: parseFloat(atMatch[2]) };
      // Try q=lat,lng pattern
      const qMatch = url.match(/[?&]q=(-?\d+\.?\d*),(-?\d+\.?\d*)/);
      if (qMatch) return { lat: parseFloat(qMatch[1]), lng: parseFloat(qMatch[2]) };
      return { lat: null, lng: null };
    }

    // Helper: extract structured data from link-type ubicacion blocks
    function extractLocationData(bContent) {
      const titulo = bContent?.titulo || '';
      const subtitulo = bContent?.subtitulo || '';
      const url = bContent?.url || '';
      
      // Extract clean name: remove emoji prefix, and get the part before — or :
      let nombre = titulo.replace(/^[📍🗺️🏠🏢🏪🚗\s]+/, '').trim();
      let direccion = bContent?.direccion || '';
      
      // If title has " — " or " - ", split into name/address  
      const dashSplit = nombre.match(/^(.+?)\s*[—–\-]\s*(.+)$/);
      if (dashSplit) {
        nombre = dashSplit[1].trim();
        if (!direccion) direccion = dashSplit[2].trim();
      }
      
      // Extract phone from subtitle: "Tel: (231) 312-2032 | ..."
      let telefono = bContent?.telefono || '';
      if (!telefono) {
        const telMatch = subtitulo.match(/Tel[:\.]?\s*([(\d\s\-)+]+)/i);
        if (telMatch) telefono = telMatch[1].trim();
      }
      
      // Extract horario from subtitle: after "Servicio" or after "|"
      let horario = bContent?.horario || '';
      if (!horario) {
        const horMatch = subtitulo.match(/(?:Servicio|Horario|Abierto)[:\s]*(.+)/i);
        if (horMatch) horario = horMatch[1].trim();
        else if (subtitulo.includes('|')) {
          const parts = subtitulo.split('|').map(s => s.trim());
          // Use the part that looks like hours (contains AM/PM or :)
          const hourPart = parts.find(p => /\d{1,2}:\d{2}|AM|PM|am|pm/i.test(p));
          if (hourPart) horario = hourPart.replace(/^(Servicio|Horario)\s*/i, '').trim();
        }
        if (!horario && subtitulo && !subtitulo.match(/Tel/i)) {
          horario = subtitulo;
        }
      }
      
      // If no explicit address, use subtitle (cleaned of phone/hours)
      if (!direccion) {
        direccion = subtitulo.replace(/Tel[:\.]?\s*[(\d\s\-)+]+\s*\|?\s*/i, '').replace(/Servicio\s*.+/i, '').trim();
        if (!direccion) direccion = nombre; // fallback to name
      }
      
      // Extract coords from URL
      const coords = extractCoordsFromUrl(url);
      
      return {
        nombre: nombre || 'Sucursal',
        direccion: direccion,
        horario: horario,
        telefono: telefono,
        lat: bContent?.lat || coords.lat,
        lng: bContent?.lng || coords.lng
      };
    }

    for (const bloque of bloques) {
      let bContent = {};
      try { bContent = typeof bloque.contenido === 'string' ? JSON.parse(bloque.contenido) || {} : (bloque.contenido || {}); } catch (e) { bContent = {}; }
      const blockType = bloque.block_type || bloque.tipo || 'link';
      const urlStr = bContent?.url || '';
      const titStr = bContent?.titulo || '';
      const isLoc = blockType === 'ubicacion' || blockType === 'location' || blockType === 'ubicaciones'
        || urlStr.includes('maps.google.com') || urlStr.includes('google.com/maps')
        || (titStr && (titStr.toLowerCase().includes('ubicacion') || titStr.toLowerCase().includes('mapa') || titStr.toLowerCase().includes('sucursal')));
      if (!isLoc) continue;
      if (blockType === 'ubicaciones' && Array.isArray(bContent?.sucursales)) {
        bContent.sucursales.forEach(s => {
          if (!s) return;
          locaciones.push({
            nombre: s.nombre || s.titulo || 'Sucursal',
            direccion: s.direccion || '',
            horario: s.horario || '',
            telefono: s.telefono || '',
            lat: s.lat,
            lng: s.lng
          });
        });
      } else {
        locaciones.push(extractLocationData(bContent));
      }
    }
    const mapaHtml = renderMapaUbicaciones(locaciones);
    let mapaInyectado = false;

    let bloques_html = '';
    if (bloques.length > 0) {
      bloques_html = bloques.map(bloque => {
        try {
          const bId = bloque.id;
          let bContent = {};
          if (typeof bloque.contenido === 'string') {
            try { bContent = JSON.parse(bloque.contenido) || {}; } catch (e) { bContent = {}; }
          } else if (bloque.contenido && typeof bloque.contenido === 'object') {
            bContent = bloque.contenido;
          }

          const blockType = bloque.block_type || bloque.tipo || 'link';
          const urlStr = bContent?.url || '';
          const titStr = bContent?.titulo || '';
          const isLocationBlock = urlStr.includes('maps.google.com') || urlStr.includes('google.com/maps') || (titStr && (titStr.toLowerCase().includes('ubicacion') || titStr.toLowerCase().includes('mapa') || titStr.toLowerCase().includes('sucursal')));
          const isSocialLink = urlStr.includes('instagram.com') || urlStr.includes('tiktok.com') || urlStr.includes('twitter.com') || urlStr.includes('x.com') || urlStr.includes('facebook.com') || urlStr.includes('youtube.com') || urlStr.includes('linkedin.com');
          const hasRichImage = (bContent?.og_image || bContent?.image || isLocationBlock) ? ' has-bento-rich' : '';
          const bentoClass = (blockType === 'whatsapp' || blockType === 'pago' || blockType === 'email_capture' || blockType === 'ubicaciones' || isLocationBlock || hasRichImage)
            ? ' bento-hero'
            : (blockType === 'pdf' ? ' bento-media' : (isSocialLink ? ' bento-social' : ' bento-hero'));

          const esBloqueUbicacion = blockType === 'ubicacion' || blockType === 'location' || blockType === 'ubicaciones' || isLocationBlock;
          if (esBloqueUbicacion) {
            if (!mapaInyectado && mapaHtml) {
              mapaInyectado = true;
              return mapaHtml;
            }
            return '';
          }

          let inner = '';

          switch (blockType) {
            case 'link': {
              const url = urlStr;
              const titulo = bContent?.titulo || 'Enlace';
              const subtitulo = bContent?.subtitulo || '';
              if (!url && !titulo) return '';
              if (url.includes('open.spotify.com')) {
                let spotifyPath = url.replace('https://open.spotify.com/', '').replace('http://open.spotify.com/', '');
                if (!spotifyPath.startsWith('embed/')) spotifyPath = 'embed/' + spotifyPath;
                inner += `<iframe class="smart-player" src="https://open.spotify.com/${escapeHtml(spotifyPath)}" width="100%" height="152" frameborder="0" allowfullscreen="" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy"></iframe>`;
              } else if (isLocationBlock) {
                const deepLinkUrl = url.includes('http') ? url : `https://maps.google.com/?q=${encodeURIComponent(titulo || 'Ubicación')}`;
                inner += `<details class="smart-accordion" open style="border-radius:20px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);overflow:hidden;box-sizing:border-box">
                  <summary style="padding:16px 18px;cursor:pointer;display:flex;align-items:center;justify-content:space-between;list-style:none">
                    <div style="display:flex;align-items:center;gap:12px">
                      <div class="bl-icon" style="background:rgba(239,111,124,0.15);color:#EF6F7C;width:40px;height:40px;border-radius:12px;display:grid;place-items:center"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="font-size:1.1rem;width:1em;height:1em;vertical-align:-0.125em"><path d="M12 21s7-7.5 7-12a7 7 0 1 0-14 0c0 4.5 7 12 7 12z"/><circle cx="12" cy="9" r="2.4"/></svg></div>
                      <div>
                        <div class="bl-title" style="font-family:'Space Grotesk',sans-serif;font-weight:700;font-size:1.05rem;color:var(--text-primary,#FFF);line-height:1.25">${escapeHtml(titulo)}</div>
                        ${subtitulo ? `<div class="bl-sub" style="font-family:'Inter',sans-serif;font-size:0.85rem;color:var(--text-secondary,#94A3B8);margin-top:3px">${escapeHtml(subtitulo)}</div>` : ''}
                      </div>
                    </div>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="width:0.9em;height:0.9em;vertical-align:-0.15em"><path d="m6 9 6 6 6-6"/></svg>
                  </summary>
                  <div class="smart-accordion-content" style="padding:0 18px 18px 18px;display:flex;flex-direction:column;gap:12px">
                    <a href="${escapeHtml(deepLinkUrl)}" target="_blank" rel="noopener" class="btn btn-secondary btn-block" style="margin-top:4px;padding:12px 18px;font-size:0.88rem;font-weight:600;display:flex;align-items:center;justify-content:center;gap:10px;border-radius:14px;background:rgba(239,111,124,0.15);border:1px solid rgba(239,111,124,0.3);color:#FFF">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="width:0.95em;height:0.95em;vertical-align:-0.15em"><path d="M3 11l19-8-8 19-2-8-9-3z"/></svg>
                      <span>Calcula tu ruta en Mapas (GPS Nactivo)</span>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="width:0.8em;height:0.8em;vertical-align:-0.1em"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><path d="M15 3h6v6M10 14L21 3"/></svg>
                    </a>
                  </div>
                </details>`;
              } else {
                const icon = getSmartIcon(titulo, url);
                const brandColor = getSmartBrandColor(titulo, url) || bContent?.color || 'var(--text-primary)';
                const ogImage = bContent?.og_image || bContent?.image || '';
                const ogDesc = bContent?.og_description || bContent?.subtitulo || '';
                const favicon = bContent?.favicon || '';

                if (ogImage) {
                  inner += `<a href="${escapeHtml(url)}" target="_blank" rel="noopener" class="bento-rich-card bento-hero-card">
                    <img src="${escapeHtml(ogImage)}" alt="${escapeHtml(titulo)}" class="bento-thumb" onerror="this.style.display='none'">
                    <div class="bento-content">
                      <div class="bento-title">${escapeHtml(titulo)}</div>
                      ${ogDesc ? `<div class="bento-desc">${escapeHtml(ogDesc)}</div>` : ''}
                      <div class="bento-footer">
                        ${favicon ? `<img src="${escapeHtml(favicon)}" alt="" class="bento-favicon">` : icon}
                        <span>${escapeHtml(bContent?.domain || 'Enlace')}</span>
                      </div>
                    </div>
                    <span class="bento-badge">↗ Destacado</span>
                  </a>`;
                } else if (isSocialLink) {
                  const domain = bContent?.domain || url.replace(/https?:\/\/(www\.)?/, '').split('/')[0] || 'Social';
                  const isIg = url.includes('instagram.com');
                  const isFb = url.includes('facebook.com');
                  const bgColor = isIg ? 'linear-gradient(135deg, #833AB4, #FD1D1D, #F56040)' : (isFb ? '#1877F2' : brandColor);
                  inner += `<a href="${escapeHtml(url)}" target="_blank" rel="noopener" class="block-link bento-social-card" style="display:flex;align-items:center;gap:14px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:20px;padding:16px 18px;text-decoration:none;color:#fff">
                    <div class="bl-icon" style="background:${bgColor};color:#fff;width:44px;height:44px;border-radius:14px;display:grid;place-items:center;font-size:1.25rem;flex-shrink:0;box-shadow:0 4px 14px rgba(0,0,0,0.3)">${icon}</div>
                    <div class="bl-text" style="flex:1;min-width:0">
                      <div class="bl-title" style="font-weight:700;font-size:0.95rem;color:var(--text-primary,#FFF);font-family:'Space Grotesk',sans-serif">${escapeHtml(titulo)}</div>
                      <div class="bl-sub" style="font-size:0.8rem;color:var(--text-secondary,#94A3B8);margin-top:2px">${escapeHtml(subtitulo || ('@' + domain))}</div>
                    </div>
                    <span class="bento-badge" style="background:rgba(255,255,255,0.08);color:rgba(255,255,255,0.7);border:1px solid rgba(255,255,255,0.12)">↗ Ver perfil</span>
                  </a>`;
                } else {
                  inner += `<a href="${escapeHtml(url)}" target="_blank" rel="noopener" class="block-link bento-hero-card">
                    <div class="bl-icon" style="color: ${brandColor}">${icon}</div>
                    <div class="bl-text">
                      <div class="bl-title">${escapeHtml(titulo)}</div>
                      ${ogDesc ? `<div class="bl-sub">${escapeHtml(ogDesc)}</div>` : ''}
                    </div>
                    <span class="bento-badge">↗ Enlace</span>
                  </a>`;
                }
              }
              break;
            }
            case 'ubicaciones': {
              const titulo = bContent?.titulo || '📍 Mapa & Sucursales';
              const subtitulo = bContent?.subtitulo || 'Ven a visitarnos o calcula tu ruta GPS';
              const direccion = bContent?.direccion || '';
              const horario = bContent?.horario || '';
              const mapUrl = bContent?.url_mapa || (direccion ? `https://maps.google.com/?q=${encodeURIComponent(direccion)}` : '');
              const sucursales = Array.isArray(bContent?.sucursales) ? bContent.sucursales : [];

              inner += `<details class="smart-accordion" open style="border-radius:20px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);overflow:hidden;box-sizing:border-box">
                <summary style="padding:16px 18px;cursor:pointer;display:flex;align-items:center;justify-content:space-between;list-style:none">
                  <div style="display:flex;align-items:center;gap:12px">
                    <div class="bl-icon" style="background:rgba(239,111,124,0.15);color:#EF6F7C;width:40px;height:40px;border-radius:12px;display:grid;place-items:center"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="font-size:1.1rem;width:1em;height:1em;vertical-align:-0.125em"><path d="M12 21s7-7.5 7-12a7 7 0 1 0-14 0c0 4.5 7 12 7 12z"/><circle cx="12" cy="9" r="2.4"/></svg></div>
                    <div>
                      <div class="bl-title" style="font-family:'Space Grotesk',sans-serif;font-weight:700;font-size:1.05rem;color:var(--text-primary,#FFF);line-height:1.25">${escapeHtml(titulo)}</div>
                      <div class="bl-sub" style="font-family:'Inter',sans-serif;font-size:0.85rem;color:var(--text-secondary,#94A3B8);margin-top:3px">${escapeHtml(subtitulo)}</div>
                    </div>
                  </div>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="width:0.9em;height:0.9em;vertical-align:-0.15em"><path d="m6 9 6 6 6-6"/></svg>
                </summary>
                <div class="smart-accordion-content" style="padding:0 18px 18px 18px;display:flex;flex-direction:column;gap:12px">
                  ${direccion ? `<div style="font-size:0.88rem;color:rgba(255,255,255,0.9);line-height:1.4"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="width:0.9em;height:0.9em;vertical-align:-0.15em"><path d="M12 21s7-7.5 7-12a7 7 0 1 0-14 0c0 4.5 7 12 7 12z"/><circle cx="12" cy="9" r="2.4"/></svg> <strong>Dirección:</strong> ${escapeHtml(direccion)}</div>` : ''}
                  ${horario ? `<div style="font-size:0.85rem;color:rgba(255,255,255,0.75);line-height:1.4"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="width:0.9em;height:0.9em;vertical-align:-0.15em"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg> <strong>Horario:</strong> ${escapeHtml(horario)}</div>` : ''}
                  ${sucursales.length > 0 ? `
                    <div style="display:flex;flex-direction:column;gap:10px;margin-top:4px">
                      ${sucursales.map(s => `
                        <div style="padding:12px 16px;border-radius:14px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);display:flex;align-items:center;justify-content:space-between">
                          <div>
                            <div style="font-size:0.9rem;font-weight:700;color:var(--text-primary,#FFF);font-family:'Space Grotesk',sans-serif">${escapeHtml(s.nombre || 'Sucursal')}</div>
                            <div style="font-size:0.8rem;color:var(--text-secondary,#94A3B8);margin-top:2px">${escapeHtml(s.direccion || '')}</div>
                          </div>
                          ${s.telefono ? `<a href="tel:${escapeHtml(s.telefono)}" class="btn btn-sm btn-ghost" style="padding:6px 12px;font-size:0.8rem;border-radius:10px;font-weight:600;color:#38BDF8">📞 ${escapeHtml(s.telefono)}</a>` : ''}
                        </div>
                      `).join('')}
                    </div>
                  ` : ''}
                  ${mapUrl ? `
                    <a href="${escapeHtml(mapUrl)}" target="_blank" rel="noopener" class="btn btn-secondary btn-block" style="margin-top:6px;padding:12px 18px;font-size:0.88rem;font-weight:600;display:flex;align-items:center;justify-content:center;gap:10px;border-radius:14px;background:rgba(239,111,124,0.15);border:1px solid rgba(239,111,124,0.3);color:#FFF">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="width:0.95em;height:0.95em;vertical-align:-0.15em"><path d="M3 11l19-8-8 19-2-8-9-3z"/></svg>
                      <span>Calcula tu ruta en Mapas (GPS Nactivo)</span>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="width:0.8em;height:0.8em;vertical-align:-0.1em"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><path d="M15 3h6v6M10 14L21 3"/></svg>
                    </a>
                  ` : ''}
                </div>
              </details>`;
              break;
            }
            case 'spotify':
            case 'youtube':
            case 'tweet':
            case 'tiktok':
              inner += `<div class="block-embed">${bContent?.embed_html || ''}</div>`;
              break;
            case 'texto': {
              const tStyle = bContent?.estilo === 'cita' ? 't-cita' : bContent?.estilo === 'titulo' ? 't-titulo' : 't-normal';
              inner += `<div class="block-text ${tStyle}">${escapeHtml(bContent?.texto || '')}</div>`;
              break;
            }
            case 'whatsapp': {
              const waNum = (bContent?.numero || bContent?.url || bContent?.telefono || '').replace(/[^0-9]/g, '');
              const waLink = waNum ? `https://wa.me/${waNum}${bContent?.mensaje_default ? `?text=${encodeURIComponent(bContent.mensaje_default)}` : ''}` : '#';
              const waTitle = bContent?.titulo || bContent?.texto || 'WhatsApp Directo';
              const waSub = bContent?.subtitulo || (bContent?.mensaje_default ? `"${bContent.mensaje_default}"` : 'Atención e informes instantáneos');
              inner += `<a href="${escapeHtml(waLink)}" target="_blank" rel="noopener" class="block-wa bento-hero-card" data-action="click_whatsapp">
                <div class="bl-icon" style="background:#25D366;color:#fff;box-shadow:0 4px 16px rgba(37,211,102,0.35)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="width:1.2em;height:1.2em;vertical-align:-0.15em"><path d="M21 12a8 8 0 0 1-8 8H4l3-3a8 8 0 1 1 14-5z"/></svg></div>
                <div class="bl-text">
                  <div class="bl-title" style="font-weight:700;font-size:1.05rem;color:var(--text-primary,#FFF);font-family:'Space Grotesk',sans-serif">${escapeHtml(waTitle)}</div>
                  <div class="bl-sub" style="font-size:0.85rem;color:var(--text-secondary,#94A3B8);margin-top:2px">${escapeHtml(waSub)}</div>
                </div>
                <span class="bento-badge" style="background:rgba(37,211,102,0.18);color:#25D366;border:1px solid rgba(37,211,102,0.3)">⚡ Responde rápido</span>
              </a>`;
              break;
            }
            case 'social_icons': {
              const redes = Array.isArray(bContent?.redes) ? bContent.redes : [];
              if (redes.length === 0) break;
              inner += `<div class="block-socials-wrapper" style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:20px;padding:18px;display:flex;flex-direction:column;align-items:center;gap:12px;width:100%;box-sizing:border-box">
                <div style="font-family:'Space Grotesk',sans-serif;font-size:0.8rem;font-weight:700;color:var(--text-secondary,#94A3B8);text-transform:uppercase;letter-spacing:0.08em">Redes Oficiales</div>
                <div class="block-socials" style="display:flex;justify-content:center;align-items:center;gap:14px;flex-wrap:wrap;width:100%">`;
              redes.forEach(red => {
                if (red && red.url) {
                  const icon = getFieldIcon(red.tipo);
                  let color = getFieldColor(red.tipo);
                  if (red.tipo === 'instagram') color = 'linear-gradient(135deg, #833AB4, #FD1D1D, #F56040)';
                  const link = getFieldLink({ tipo: red.tipo, valor: red.url });
                  inner += `<a href="${escapeHtml(link)}" target="_blank" rel="noopener" class="social-icon" style="background: ${color};color:#fff;width:46px;height:46px;border-radius:14px;display:inline-flex;align-items:center;justify-content:center;font-size:1.25rem;box-shadow:0 4px 14px rgba(0,0,0,0.25);text-decoration:none;transition:transform 0.2s ease" title="${escapeHtml(red.tipo || '')}">
                    ${icon}
                  </a>`;
                }
              });
              inner += `</div></div>`;
              break;
            }
            case 'email_capture':
              inner += `<div class="block-email">
                <form data-perfil="${perfil.id}">
                  ${bContent?.titulo ? `<h3>${escapeHtml(bContent.titulo)}</h3>` : ''}
                  <div class="email-form-group">
                    <input type="email" name="email" placeholder="${escapeHtml(bContent?.placeholder || 'Tu email')}" required>
                    <button type="submit">${escapeHtml(bContent?.boton_texto || 'Suscribirse')}</button>
                  </div>
                </form>
              </div>`;
              break;
            case 'galeria': {
              inner += `<div class="block-gallery">`;
              const imagenes = Array.isArray(bContent?.imagenes) ? bContent.imagenes : [];
              imagenes.forEach(img => {
                if (img && img.url) {
                  inner += `<div class="gallery-item">
                    <img src="${escapeHtml(img.url)}" alt="Galería">
                    ${img.caption ? `<div class="gallery-caption">${escapeHtml(img.caption)}</div>` : ''}
                  </div>`;
                }
              });
              inner += `</div>`;
              break;
            }
            case 'countdown': {
              const targetDate = bContent?.fecha_fin ? new Date(bContent.fecha_fin).getTime() : Date.now();
              inner += `<div class="block-countdown" data-countdown="${targetDate}">
                ${bContent?.titulo ? `<h3>${escapeHtml(bContent.titulo)}</h3>` : ''}
                <div class="cd-digits">
                  <div class="cd-unit"><div class="cd-num days">00</div><div class="cd-lbl">Días</div></div>
                  <div class="cd-unit"><div class="cd-num hours">00</div><div class="cd-lbl">Hrs</div></div>
                  <div class="cd-unit"><div class="cd-num minutes">00</div><div class="cd-lbl">Min</div></div>
                  <div class="cd-unit"><div class="cd-num seconds">00</div><div class="cd-lbl">Seg</div></div>
                </div>
              </div>`;
              break;
            }
            case 'pdf':
              inner += `<a href="${escapeHtml(bContent?.url || '#')}" target="_blank" rel="noopener" class="block-link block-pdf bento-media-card">
                <div class="bl-icon" style="background:rgba(239,68,68,0.15);color:#EF4444"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="width:1.2em;height:1.2em;vertical-align:-0.15em"><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9l-6-6z"/><path d="M14 3v6h6M9 13h6M9 17h4"/></svg></div>
                <div class="bl-text">
                  <div class="bl-title">${escapeHtml(bContent?.titulo || 'Documento PDF')}</div>
                  ${bContent?.subtitulo ? `<div class="bl-sub">${escapeHtml(bContent.subtitulo)}</div>` : '<div class="bl-sub">Archivo adjunto descargable</div>'}
                </div>
                <span class="bento-badge">📄 PDF</span>
              </a>`;
              break;
            case 'pago':
              inner += `<div class="block-pago">
                <div class="pago-header">
                  <div class="pago-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="width:1.2em;height:1.2em;vertical-align:-0.15em"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/><path d="M6 15h4"/></svg></div>
                  <div>
                    <div class="pago-title">${escapeHtml(bContent?.banco || 'Datos de Transferencia')}</div>
                    ${bContent?.beneficiario ? `<div class="pago-sub">Titular: ${escapeHtml(bContent.beneficiario)}</div>` : ''}
                  </div>
                </div>
                ${bContent?.clabe ? `
                  <div class="pago-clabe-box">
                    <span class="clabe-num">${escapeHtml(bContent.clabe)}</span>
                    <button type="button" class="btn-copy-clabe" onclick="navigator.clipboard.writeText('${escapeHtml(bContent.clabe)}');this.textContent='¡Copiado! ✓';setTimeout(()=>this.textContent='Copiar CLABE',2000)">Copiar CLABE</button>
                  </div>` : ''}
              </div>`;
              break;
            case 'nota':
              inner += `<div class="block-nota">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="width:1em;height:1em;vertical-align:-0.15em"><path d="M12 2v9l4.5 4.5a1 1 0 0 1-.7 1.7H8.2a1 1 0 0 1-.7-1.7L12 11V2"/><path d="M8 21h8"/></svg>
                <div>${escapeHtml(bContent?.texto || '')}</div>
              </div>`;
              break;
            case 'ubicacion':
            case 'location': {
              const locationQuery = bContent?.direccion || bContent?.url || bContent?.titulo || 'Ubicación';
              inner += `<div class="block-ubicacion" style="background:var(--bg-card);border:1px solid var(--border-color);border-radius:18px;padding:14px;margin-bottom:12px">
                <div style="font-weight:700;font-size:0.95rem;margin-bottom:8px;display:flex;align-items:center;gap:8px">📍 <span>${escapeHtml(bContent?.titulo || 'Nuestra Ubicación')}</span></div>
                <iframe width="100%" height="160" style="border:0;border-radius:12px;margin-bottom:10px" loading="lazy" src="https://maps.google.com/maps?q=${encodeURIComponent(locationQuery)}&output=embed"></iframe>
                <div style="display:flex;gap:8px">
                  <a href="https://maps.google.com/?q=${encodeURIComponent(locationQuery)}" target="_blank" rel="noopener" class="btn btn-sm" style="flex:1;background:#EA4335;color:#fff;text-align:center;border-radius:10px;padding:10px;font-weight:700;font-size:0.82rem;text-decoration:none;display:inline-block">🗺️ Abrir en Google Maps</a>
                  <a href="https://maps.apple.com/?q=${encodeURIComponent(locationQuery)}" target="_blank" rel="noopener" class="btn btn-sm" style="flex:1;background:#007AFF;color:#fff;text-align:center;border-radius:10px;padding:10px;font-weight:700;font-size:0.82rem;text-decoration:none;display:inline-block">🍎 Abrir en Apple Maps</a>
                </div>
              </div>`;
              break;
            }
            case 'seccion':
              inner += `<div class="block-section-title">${escapeHtml(bContent?.titulo || '')}</div>`;
              break;
            case 'horario': {
              const diasSemana = ["Lunes", "Martes", "Miercoles", "Jueves", "Viernes", "Sabado", "Domingo"];
              const hoyIdx = new Date().getDay(); // 0=Dom ... 6=Sab
              const semana = Array.isArray(bContent?.dias) ? bContent.dias : [];
              const filas = diasSemana.map(function (dia, i) {
                const entrada = semana.find(function (d) { return (d.dia || "").toLowerCase() === dia.toLowerCase(); }) || {};
                const horario = entrada.horario || '';
                const esHoy = i === hoyIdx;
                const label = esHoy ? '<span style="font-size:0.62em;font-weight:800;text-transform:uppercase;letter-spacing:0.08em;color:#38BDF8;border:1px solid rgba(56,189,248,0.4);border-radius:999px;padding:2px 8px;margin-left:8px;vertical-align:1px">Hoy</span>' : '';
                return `<div style="display:flex;align-items:center;justify-content:space-between;padding:9px 14px;border-radius:12px;background:${esHoy ? 'rgba(56,189,248,0.10)' : 'rgba(255,255,255,0.03)'};border:1px solid ${esHoy ? 'rgba(56,189,248,0.25)' : 'rgba(255,255,255,0.06)'}">
                  <span style="font-size:0.85rem;font-weight:${esHoy ? '700' : '500'};color:var(--text-primary,#FFF);font-family:'Space Grotesk',sans-serif">${escapeHtml(dia)}${label}</span>
                  <span style="font-size:0.82rem;color:${horario ? 'var(--text-secondary,#94A3B8)' : '#F87171'};font-family:'Inter',sans-serif">${horario ? escapeHtml(horario) : 'Cerrado'}</span>
                </div>`;
              }).join('');
              inner += `<div class="block-schedule" style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:20px;padding:16px;display:flex;flex-direction:column;gap:8px;width:100%;box-sizing:border-box">
                <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px">
                  <div class="bl-icon" style="background:rgba(56,189,248,0.15);color:#38BDF8;width:40px;height:40px;border-radius:12px;display:grid;place-items:center"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="width:1.1em;height:1.1em;vertical-align:-0.15em"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg></div>
                  <div class="bl-title" style="font-family:'Space Grotesk',sans-serif;font-weight:700;font-size:1rem;color:var(--text-primary,#FFF)">${escapeHtml(bContent?.titulo || 'Horario de Atencion')}</div>
                </div>
                ${filas}
              </div>`;
              break;
            }
            default:
              inner += `<div class="block-unsupported">Bloque: ${escapeHtml(blockType)}</div>`;
          }

          if (!inner || !inner.trim()) return '';
          return `<div class="block-wrapper block-${escapeHtml(blockType)}${hasRichImage}${bentoClass}" data-bloque-id="${bId}">${inner}</div>`;
        } catch (e) {
          console.error('[CRITICAL] Error al renderizar bloque individual:', e);
          return '';
        }
      }).filter(Boolean).join('\n');
    } else {
      const campos_html = campos.map(campo => {
        const icon = getFieldIcon(campo.tipo);
        const iconColor = getFieldColor(campo.tipo);
        const link = getFieldLink(campo);
        const label = campo.etiqueta || getFieldLabel(campo.tipo);
        const eventType = campo.tipo === 'whatsapp' ? 'click_whatsapp'
          : campo.tipo === 'telefono' ? 'click_llamar'
          : campo.tipo === 'email' ? 'click_email'
          : campo.tipo === 'direccion' ? 'click_mapa'
          : 'click_red_social';

        return `
          <a href="${escapeHtml(link)}" class="contact-item" target="_blank" rel="noopener" data-action="${eventType}">
            <div class="contact-icon" style="background:${iconColor};">${icon}</div>
            <div class="contact-info">
              <span class="contact-label">${escapeHtml(label)}</span>
              <span class="contact-value">${escapeHtml(campo.valor)}</span>
            </div>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="width:0.8em;height:0.8em;vertical-align:-0.1em"><path d="m9 18 6-6-6-6"/></svg>
          </a>`;
      }).join('\n');

      bloques_html = campos.length > 0
        ? `<div class="section contact-section">
            <h2 class="section-title">Contacto</h2>
            <div class="contact-list">
              ${campos_html}
            </div>
           </div>`
        : '';
    }

    const archivos_html = archivos.map(archivo => {
      const icon = (archivo.tipo || '').includes('pdf') ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="width:1.2em;height:1.2em;vertical-align:-0.15em"><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9l-6-6z"/><path d="M14 3v6h6M9 13h6M9 17h4"/></svg>' : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="width:1.2em;height:1.2em;vertical-align:-0.15em"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21"/></svg>';
      const displayName = (archivo.nombre || '').length > 35
        ? (archivo.nombre || '').substring(0, 32) + '...'
        : (archivo.nombre || '');

      return `
        <a href="${escapeHtml(archivo.url)}" class="file-item" target="_blank" rel="noopener" data-action="ver_archivo">
          <div class="file-icon">${icon}</div>
          <div class="file-info">
            <span class="file-label">Archivo</span>
            <span class="file-name">${escapeHtml(displayName)}</span>
          </div>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="width:0.8em;height:0.8em;vertical-align:-0.1em"><path d="M12 5v14M5 12l7 7 7-7"/></svg>
        </a>`;
    }).join('\n');

    const archivos_section_html = archivos.length > 0
      ? `<div class="section files-section">
          <h2 class="section-title">Archivos</h2>
          <div class="file-list">
            ${archivos_html}
          </div>
         </div>`
      : '';

    // 1. Horario de atención inteligente
    const hApertura = perfil.hora_apertura || '09:00';
    const hCierre = perfil.hora_cierre || '20:00';
    const now = new Date();
    const currentMins = now.getHours() * 60 + now.getMinutes();
    const [aH, aM] = hApertura.split(':').map(Number);
    const [cH, cM] = hCierre.split(':').map(Number);
    const openMins = (aH || 9) * 60 + (aM || 0);
    const closeMins = (cH || 20) * 60 + (cM || 0);
    const isOpen = currentMins >= openMins && currentMins < closeMins;

    const horario_badge_html = isOpen
      ? `<div style="display:inline-flex;align-items:center;gap:6px;padding:4px 12px;border-radius:100px;background:rgba(16,185,129,0.12);border:1px solid rgba(16,185,129,0.3);color:#10B981;font-size:0.75rem;font-weight:600;margin-top:4px">
          <span style="width:6px;height:6px;border-radius:50%;background:#10B981;box-shadow:0 0 8px #10B981"></span>
          <span>Abierto ahora · (${escapeHtml(hApertura)} - ${escapeHtml(hCierre)})</span>
        </div>`
      : `<div style="display:inline-flex;align-items:center;gap:6px;padding:4px 12px;border-radius:100px;background:rgba(239,68,68,0.12);border:1px solid rgba(239,68,68,0.3);color:#EF4444;font-size:0.75rem;font-weight:600;margin-top:4px">
          <span style="width:6px;height:6px;border-radius:50%;background:#EF4444;box-shadow:0 0 8px #EF4444"></span>
          <span>Fuera de horario · Atendemos a partir de las ${escapeHtml(hApertura)}</span>
        </div>`;

    // 2. Saludo de voz / Audio promo opcional
    const mostrarVoicePill = perfil.mostrar_saludo_voz !== false && perfil.mostrar_saludo_voz !== 0 && perfil.mostrar_saludo_voz !== 'false';
    const saludo_voz_html = mostrarVoicePill
      ? `<div class="voice-greeting-pill" onclick="playVoiceGreeting()">
          <div class="sound-wave">
            <span></span><span></span><span></span><span></span>
          </div>
          <span>Escuchar saludo de voz <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="width:0.95em;height:0.95em;vertical-align:-0.15em"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0 0 14 0"/><path d="M12 17v5"/></svg></span>
        </div>`
      : '';

    // 3. Botón de Agendar Cita opcional
    const mostrarBookingBtn = perfil.mostrar_agendar_cita !== false && perfil.mostrar_agendar_cita !== 0 && perfil.mostrar_agendar_cita !== 'false';
    const action_buttons_html = mostrarBookingBtn ? generateActionButtons(perfil, campos) : '';
    const og_image = fotoSrc || `${BASE_URL}/img/og-default.png`;

    let html;
    const templatePath = path.join(process.cwd(), 'views', 'perfil-publico.html');
    try {
      html = fs.readFileSync(templatePath, 'utf-8');
    } catch (e) {
      console.error('Plantilla views/perfil-publico.html no encontrada');
      return res.status(500).send(`<!DOCTYPE html><html lang="es"><body style="background:#0A0A0B;color:#FFF;font-family:sans-serif;padding:40px;text-align:center"><h1>500 - Plantilla no disponible</h1><p>Falta views/perfil-publico.html en el servidor.</p><a href="/" style="color:#7FAEE8">Volver al inicio</a></body></html>`);
    }

    const bio_text = perfil.bio ? escapeHtml(perfil.bio) : 'Tarjeta digital de contacto';
    const tema = perfil.tema || 'ios';

    const banner_html = perfil.banner_url
      ? `<div class="hero-banner"><img src="${escapeHtml(perfil.banner_url.startsWith('http') || perfil.banner_url.startsWith('/') ? perfil.banner_url : '/' + perfil.banner_url)}" alt="Portada" onerror="this.onerror=null;this.style.display='none';if(this.parentElement)this.parentElement.style.display='none';"></div>`
      : '';

    const audioUrlEscaped = escapeHtml(perfil.audio_saludo_url || '');

    html = html
      .replace(/\{\{tema_css\}\}/g, themeCss)
      .replace(/\{\{tema\}\}/g, tema)
      .replace(/\{\{bio_text\}\}/g, bio_text)
      .replace(/\{\{nombre_perfil\}\}/g, escapeHtml(perfil.nombre_perfil || ''))
      .replace(/\{\{tipo\}\}/g, escapeHtml(perfil.tipo || ''))
      .replace(/\{\{slug\}\}/g, escapeHtml(perfil.slug || ''))
      .replace(/\{\{color\}\}/g, color)
      .replace(/\{\{og_image\}\}/g, og_image)
      .replace(/\{\{base_url\}\}/g, BASE_URL)
      .replace(/\{\{visitas\}\}/g, String((perfil.visitas || 0) + 1))
      .replace(/\{\{banner_html\}\}/g, banner_html)
      .replace(/\{\{avatar_html\}\}/g, avatar_html)
      .replace(/\{\{foto_url\}\}/g, fotoSrc)
      .replace(/\{\{bio_html\}\}/g, bio_html)
      .replace(/\{\{tags_html\}\}/g, tags_html)
      .replace(/\{\{horario_badge_html\}\}/g, horario_badge_html)
      .replace(/\{\{saludo_voz_html\}\}/g, saludo_voz_html)
      .replace(/\{\{audio_saludo_url\}\}/g, audioUrlEscaped)
      .replace(/\{\{bloques_html\}\}/g, bloques_html)
      .replace(/\{\{campos_section_html\}\}/g, '')
      .replace(/\{\{archivos_section_html\}\}/g, archivos_section_html)
      .replace(/\{\{action_buttons_html\}\}/g, action_buttons_html)
      .replace(/\{\{perfil_id\}\}/g, String(perfil.id))
      .replace(/\{\{api_base\}\}/g, BASE_URL);

    res.set('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (err) {
    console.error('[CRITICAL] Error renderizando perfil:', err);
    res.status(500).send(`<!DOCTYPE html><html lang="es"><body style="background:#0A0A0B;color:#FFF;font-family:sans-serif;padding:40px;text-align:center"><h1>500 - Error al Renderizar Perfil</h1><p>${escapeHtml(err.message)}</p><a href="/" style="color:#7FAEE8">Volver al inicio</a></body></html>`);
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

function getFieldIcon(tipo) {
  const icons = {
    whatsapp: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="width:1em;height:1em;vertical-align:-0.125em"><path d="M21 12a8 8 0 0 1-8 8H4l3-3a8 8 0 1 1 14-5z"/></svg>',
    telefono: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="width:1em;height:1em;vertical-align:-0.125em"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.13.96.36 1.9.7 2.8a2 2 0 0 1-.45 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.27a2 2 0 0 1 2.1-.45c.9.34 1.84.57 2.8.7A2 2 0 0 1 22 16.9z"/></svg>',
    email: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="width:1em;height:1em;vertical-align:-0.125em"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m4 7 8 6 8-6"/></svg>',
    direccion: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="width:1em;height:1em;vertical-align:-0.125em"><path d="M12 21s7-7.5 7-12a7 7 0 1 0-14 0c0 4.5 7 12 7 12z"/><circle cx="12" cy="9" r="2.4"/></svg>',
    facebook: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="width:1em;height:1em;vertical-align:-0.125em"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>',
    instagram: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="width:1em;height:1em;vertical-align:-0.125em"><rect x="3" y="6" width="18" height="14" rx="2"/><circle cx="12" cy="13" r="4"/><path d="M8.5 6l1-2h5l1 2"/></svg>',
    tiktok: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="width:1em;height:1em;vertical-align:-0.125em"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>',
    linkedin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="width:1em;height:1em;vertical-align:-0.125em"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4V9h4v1.5a6 6 0 0 1 2-1.5z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></svg>',
    twitter: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="width:1em;height:1em;vertical-align:-0.125em"><path d="M4 4l16 16M20 4L4 20"/></svg>',
    youtube: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="width:1em;height:1em;vertical-align:-0.125em"><path d="M6 4l14 8-14 8V4z"/></svg>',
    threads: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="width:1em;height:1em;vertical-align:-0.125em"><circle cx="12" cy="12" r="2.5"/><path d="M12 2c4 0 6.5 2 6.5 5.5 0 2-1.2 3.2-2 3.7.8.5 2 1.7 2 3.7C18.5 18.5 16 20.5 12 20.5S5.5 18.5 5.5 15c0-1.4.5-2.5 1.3-3.5"/></svg>',
    telegram: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="width:1em;height:1em;vertical-align:-0.125em"><path d="m22 2-7 20-4-9-9-4z"/><path d="M22 2 11 13"/></svg>',
    snapchat: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="width:1em;height:1em;vertical-align:-0.125em"><path d="M12 2c2 0 3.5 1.6 4 4 .2 1 .6 1.6 1.3 2.2.5.4 1.2.5 1.8.4.4-.1.8.2.9.6.1.3-.1.6-.3.8-.7.7-2 .9-2.9 1.4-.4.2-.5.5-.4.9 0 .4.4.7 1 .9.9.4 2 .7 2.4 1.1.3.3.3.7 0 1-.3.3-1 .4-2 .4-.5 0-1 .1-1.4.3-.5.3-.6 1.1-1.7 1.1s-1.2-.8-1.7-1.1c-.4-.2-.9-.3-1.4-.3-1 0-1.7-.1-2-.4-.3-.3-.3-.7 0-1 .4-.4 1.5-.7 2.4-1.1.6-.2 1-.5 1-.9-.1-.4 0-.7-.4-.9-.9-.5-2.2-.7-2.9-1.4-.2-.2-.4-.5-.3-.8.1-.4.5-.7.9-.6.6.1 1.3 0 1.8-.4.7-.6 1.1-1.2 1.3-2.2.5-2.4 2-4 4-4z"/></svg>',
    discord: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="width:1em;height:1em;vertical-align:-0.125em"><path d="M18 7c-1.2-.6-2.5-1-3.8-1.1l-.5 1a11 11 0 0 0-3.4 0l-.5-1C8.5 6 7.2 6.4 6 7a17 17 0 0 0-2.7 13.4 13 13 0 0 0 4 2l.9-1.5c-.9-.3-1.8-.7-2.5-1.2l.6-.5a10 10 0 0 0 9.4 0l.6.5c-.7.5-1.6.9-2.5 1.2l.9 1.5a13 13 0 0 0 4-2A17 17 0 0 0 18 7z"/><path d="M9.5 12.5a1.2 1.2 0 1 0 0 2.4 1.2 1.2 0 0 0 0-2.4zM14.5 12.5a1.2 1.2 0 1 0 0 2.4 1.2 1.2 0 0 0 0-2.4z"/></svg>',
    twitch: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="width:1em;height:1em;vertical-align:-0.125em"><path d="M4 3h16v12l-4 4H11l-3 3v-3H4z"/><path d="M9 8v5M15 8v5"/></svg>',
    spotify: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="width:1em;height:1em;vertical-align:-0.125em"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>',
    apple_music: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="width:1em;height:1em;vertical-align:-0.125em"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>',
    web: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="width:1em;height:1em;vertical-align:-0.125em"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>',
    github: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="width:1em;height:1em;vertical-align:-0.125em"><path d="M9 9V5a3 3 0 1 0-3 3h4z"/><path d="M15 9V5a3 3 0 1 1 3 3h-4z"/><path d="M15 15v4a3 3 0 1 1-3-3h3z"/><path d="M9 15v4a3 3 0 1 0 3-3H9z"/></svg>',
    portafolio: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="width:1em;height:1em;vertical-align:-0.125em"><rect x="3" y="7" width="18" height="14" rx="2"/><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/></svg>',
    otro: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="width:1em;height:1em;vertical-align:-0.125em"><path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/></svg>'
  };
  return icons[tipo] || icons.otro;
}

function getFieldColor(tipo) {
  const colors = {
    whatsapp: '#25D366', telefono: '#34C759', email: '#FF9500', direccion: '#FF3B30',
    facebook: '#1877F2', instagram: '#E4405F', tiktok: '#000000', linkedin: '#0A66C2',
    twitter: '#1DA1F2', youtube: '#FF0000', threads: '#000000', telegram: '#26A5E4',
    snapchat: '#FFFC00', discord: '#5865F2', twitch: '#9146FF', kick: '#53FC18',
    spotify: '#1DB954', apple_music: '#FC3C44', steam: '#1B2838', xbox: '#107C10', psn: '#003087',
    amazon_wishlist: '#FF9900', pinterest: '#E60023', reddit: '#FF4500', bereal: '#000000',
    web: '#007AFF', github: '#333333', behance: '#1769FF', dribbble: '#EA4C89', portafolio: '#AF52DE',
    otro: '#8E8E93'
  };
  return colors[tipo] || '#8E8E93';
}

function getFieldLabel(tipo) {
  const labels = {
    whatsapp: 'WhatsApp', telefono: 'Teléfono', email: 'Email', direccion: 'Dirección',
    facebook: 'Facebook', instagram: 'Instagram', tiktok: 'TikTok', linkedin: 'LinkedIn',
    twitter: 'X (Twitter)', youtube: 'YouTube', threads: 'Threads', telegram: 'Telegram',
    snapchat: 'Snapchat', discord: 'Discord', twitch: 'Twitch', kick: 'Kick',
    spotify: 'Spotify', apple_music: 'Apple Music', steam: 'Steam', xbox: 'Xbox', psn: 'PlayStation',
    amazon_wishlist: 'Amazon Wishlist', pinterest: 'Pinterest', reddit: 'Reddit', bereal: 'BeReal',
    web: 'Sitio web', github: 'GitHub', behance: 'Behance', dribbble: 'Dribbble', portafolio: 'Portafolio',
    otro: 'Otro'
  };
  return labels[tipo] || tipo;
}

function getFieldLink(campo) {
  const v = campo.valor;
  const isUrl = v.startsWith('http');
  switch (campo.tipo) {
    case 'whatsapp': return `https://wa.me/${v.replace(/[^0-9]/g, '')}`;
    case 'telefono': return `tel:${v}`;
    case 'email': return `mailto:${v}`;
    case 'direccion': return `https://maps.google.com/?q=${encodeURIComponent(v)}`;
    case 'facebook': return isUrl ? v : `https://facebook.com/${v}`;
    case 'instagram': return isUrl ? v : `https://instagram.com/${v}`;
    case 'tiktok': return isUrl ? v : `https://tiktok.com/@${v}`;
    case 'linkedin': return isUrl ? v : `https://linkedin.com/in/${v}`;
    case 'twitter': return isUrl ? v : `https://x.com/${v}`;
    case 'youtube': return isUrl ? v : `https://youtube.com/@${v}`;
    case 'threads': return isUrl ? v : `https://threads.net/@${v}`;
    case 'telegram': return isUrl ? v : `https://t.me/${v}`;
    case 'snapchat': return isUrl ? v : `https://snapchat.com/add/${v}`;
    case 'discord': return isUrl ? v : `https://discord.gg/${v}`;
    case 'twitch': return isUrl ? v : `https://twitch.tv/${v}`;
    case 'kick': return isUrl ? v : `https://kick.com/${v}`;
    case 'spotify': return isUrl ? v : `https://open.spotify.com/user/${v}`;
    case 'apple_music': return isUrl ? v : v;
    case 'steam': return isUrl ? v : `https://steamcommunity.com/id/${v}`;
    case 'xbox': return isUrl ? v : `https://www.xbox.com/play/user/${v}`;
    case 'psn': return isUrl ? v : v;
    case 'amazon_wishlist': return isUrl ? v : v;
    case 'pinterest': return isUrl ? v : `https://pinterest.com/${v}`;
    case 'reddit': return isUrl ? v : `https://reddit.com/user/${v}`;
    case 'bereal': return isUrl ? v : v;
    case 'web': return isUrl ? v : `https://${v}`;
    case 'github': return isUrl ? v : `https://github.com/${v}`;
    case 'behance': return isUrl ? v : `https://behance.net/${v}`;
    case 'dribbble': return isUrl ? v : `https://dribbble.com/${v}`;
    case 'portafolio': return isUrl ? v : `https://${v}`;
    default: return isUrl ? v : '#';
  }
}

function generateActionButtons(perfil, campos) {
  return `<div class="action-buttons" style="display:flex;justify-content:center;margin:8px 0 12px">
    <button type="button" onclick="openBookingModal()" class="action-btn action-booking" style="background:linear-gradient(135deg,var(--accent-deep,#0F2C4E),var(--primary,#7FAEE8));border:none;color:#fff;cursor:pointer;padding:12px 24px;border-radius:100px;font-weight:700;font-size:0.95rem;box-shadow:0 8px 24px var(--accent-glow,rgba(127,174,232,0.3));display:inline-flex;align-items:center;gap:10px">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="width:1em;height:1em;vertical-align:-0.15em"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/><path d="m9 16 2 2 4-4"/></svg> Agendar Cita
    </button>
  </div>`;
}

function generate404Page() {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Perfil no encontrado - TarjetaDigital</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Inter', -apple-system, sans-serif;
      background: #0f0f23;
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      text-align: center;
    }
    .container { padding: 2rem; }
    h1 { font-size: 4rem; margin-bottom: 1rem; opacity: 0.3; }
    p { font-size: 1.2rem; color: #a0a0b0; margin-bottom: 2rem; }
    a {
      display: inline-block;
      padding: 0.75rem 2rem;
      background: #6C63FF;
      color: #fff;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>404</h1>
    <p>Este perfil no existe o ha sido eliminado.</p>
    <a href="/">Ir al inicio</a>
  </div>
</body>
</html>`;
}

function getSmartIcon(titulo, url) {
  const t = (titulo || '').toLowerCase();
  const u = (url || '').toLowerCase();
  if (u.includes('whatsapp') || t.includes('whatsapp')) return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="width:1em;height:1em;vertical-align:-0.125em"><path d="M21 12a8 8 0 0 1-8 8H4l3-3a8 8 0 1 1 14-5z"/></svg>';
  if (u.includes('facebook') || t.includes('facebook')) return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="width:1em;height:1em;vertical-align:-0.125em"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>';
  if (u.includes('instagram') || t.includes('instagram')) return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="width:1em;height:1em;vertical-align:-0.125em"><rect x="3" y="6" width="18" height="14" rx="2"/><circle cx="12" cy="13" r="4"/><path d="M8.5 6l1-2h5l1 2"/></svg>';
  if (u.includes('youtube') || t.includes('youtube')) return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="width:1em;height:1em;vertical-align:-0.125em"><path d="M6 4l14 8-14 8V4z"/></svg>';
  if (u.includes('tiktok') || t.includes('tiktok')) return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="width:1em;height:1em;vertical-align:-0.125em"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>';
  if (u.includes('spotify') || t.includes('spotify')) return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="width:1em;height:1em;vertical-align:-0.125em"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>';
  if (u.includes('twitter') || u.includes('x.com') || t.includes('twitter')) return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="width:1em;height:1em;vertical-align:-0.125em"><path d="M4 4l16 16M20 4L4 20"/></svg>';
  if (u.includes('linkedin') || t.includes('linkedin')) return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="width:1em;height:1em;vertical-align:-0.125em"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4V9h4v1.5a6 6 0 0 1 2-1.5z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></svg>';
  if (u.includes('github') || t.includes('github')) return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="width:1em;height:1em;vertical-align:-0.125em"><path d="M9 9V5a3 3 0 1 0-3 3h4z"/><path d="M15 9V5a3 3 0 1 1 3 3h-4z"/><path d="M15 15v4a3 3 0 1 1-3-3h3z"/><path d="M9 15v4a3 3 0 1 0 3-3H9z"/></svg>';
  if (u.includes('tel:') || t.includes('llama') || t.includes('telefono')) return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="width:1em;height:1em;vertical-align:-0.125em"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.13.96.36 1.9.7 2.8a2 2 0 0 1-.45 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.27a2 2 0 0 1 2.1-.45c.9.34 1.84.57 2.8.7A2 2 0 0 1 22 16.9z"/></svg>';
  if (u.includes('mailto:') || t.includes('email') || t.includes('correo')) return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="width:1em;height:1em;vertical-align:-0.125em"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m4 7 8 6 8-6"/></svg>';
  if (u.includes('maps') || t.includes('ubicacion') || t.includes('sucursal')) return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="width:1em;height:1em;vertical-align:-0.125em"><path d="M12 21s7-7.5 7-12a7 7 0 1 0-14 0c0 4.5 7 12 7 12z"/><circle cx="12" cy="9" r="2.4"/></svg>';
  if (u.includes('.pdf') || t.includes('pdf') || t.includes('menu')) return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="width:1em;height:1em;vertical-align:-0.125em"><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9l-6-6z"/><path d="M14 3v6h6M9 13h6M9 17h4"/></svg>';
  return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="width:1em;height:1em;vertical-align:-0.125em"><path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/></svg>';
}

function getSmartBrandColor(titulo, url) {
  const t = (titulo || '').toLowerCase();
  const u = (url || '').toLowerCase();
  if (u.includes('whatsapp') || t.includes('whatsapp')) return '#25D366';
  if (u.includes('facebook') || t.includes('facebook')) return '#1877F2';
  if (u.includes('instagram') || t.includes('instagram')) return '#E4405F';
  if (u.includes('youtube') || t.includes('youtube')) return '#FF0000';
  if (u.includes('tiktok') || t.includes('tiktok')) return '#00F2FE';
  if (u.includes('spotify') || t.includes('spotify')) return '#1DB954';
  if (u.includes('twitter') || u.includes('x.com')) return '#1DA1F2';
  if (u.includes('linkedin')) return '#0A66C2';
  if (u.includes('github')) return '#181717';
  if (u.includes('uber')) return '#10B981';
  if (u.includes('tel:')) return '#0284C7';
  if (u.includes('.pdf') || t.includes('pdf')) return '#EF4444';
  return null;
}

// =============================================
// POST /api/perfiles/:id/agendar-cita
// Agendamiento de citas con Google Calendar URL & envío de emails VYNK
// =============================================
router.post('/:id/agendar-cita', async (req, res) => {
  try {
    const perfilId = req.params.id;
    const { nombre, email, telefono, fecha, servicio, duracion_minutos, lugar, notas } = req.body;

    if (!nombre || !email || !fecha) {
      return res.status(400).json({ error: 'Nombre, email y fecha son obligatorios' });
    }

    const perfil = await db.prepare(
      "SELECT p.*, u.email as owner_email, u.nombre as owner_nombre FROM perfiles p JOIN usuarios u ON p.usuario_id = u.id WHERE p.id = $1 OR p.slug = $1 LIMIT 1"
    ).get(perfilId);

    if (!perfil) {
      return res.status(404).json({ error: 'Perfil no encontrado' });
    }

    const fechaCita = new Date(fecha);
    const duracion = parseInt(duracion_minutos || 30);
    const fechaFin = new Date(fechaCita.getTime() + duracion * 60000);

    const result = await db.prepare(`
      INSERT INTO citas (perfil_id, cliente_nombre, cliente_email, cliente_telefono, servicio, fecha_cita, duracion_minutos, lugar, notas, estado)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'confirmado')
      RETURNING id
    `).run(
      perfil.id,
      nombre,
      email,
      telefono || '',
      servicio || 'Servicio VYNK',
      fechaCita.toISOString(),
      duracion,
      lugar || 'Sucursal principal',
      notas || ''
    );

    // Formateo de fechas para enlace directo de Google Calendar TEMPLATE URL
    const formatGCalDate = (d) => d.toISOString().replace(/-|:|\.\d\d\d/g, '');
    const gCalDates = `${formatGCalDate(fechaCita)}/${formatGCalDate(fechaFin)}`;
    const eventTitle = `${servicio || 'Cita'} - ${perfil.nombre_perfil}`;
    const eventDetails = `Cliente: ${nombre}\nCorreo: ${email}\nTeléfono: ${telefono || 'N/A'}\nNotas: ${notas || 'Ninguna'}`;
    const googleCalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(eventTitle)}&dates=${gCalDates}&details=${encodeURIComponent(eventDetails)}&location=${encodeURIComponent(lugar || 'Sucursal')}`;

    // Envío silencioso/asíncrono de correos de notificación VYNK HTML
    const emailUtils = require('../utils/email');
    const dateStr = fechaCita.toLocaleString('es-MX', { dateStyle: 'full', timeStyle: 'short' });

    emailUtils.sendOwnerAppointmentNotification({
      ownerEmail: perfil.owner_email,
      ownerName: perfil.owner_nombre || perfil.nombre_perfil,
      clientName: nombre,
      clientEmail: email,
      clientPhone: telefono,
      dateStr,
      serviceName: servicio || 'Servicio VYNK',
      location: lugar || 'Sucursal principal',
      notes,
      googleCalUrl
    }).catch(e => console.error('Error enviando email al dueño:', e));

    emailUtils.sendClientAppointmentConfirmation({
      clientEmail: email,
      clientName: nombre,
      ownerName: perfil.nombre_perfil,
      dateStr,
      serviceName: servicio || 'Servicio VYNK',
      location: lugar || 'Sucursal principal',
      googleCalUrl
    }).catch(e => console.error('Error enviando email al cliente:', e));

    res.json({
      ok: true,
      cita_id: result.lastInsertRowid,
      message: '✅ Cita agendada con éxito',
      googleCalUrl,
      dateStr
    });
  } catch (err) {
    console.error('Error agendando cita:', err);
    res.status(500).json({ error: 'Error al registrar la cita' });
  }
});

// GET /api/perfiles/:id/citas (Consulta de Leads & Citas para el propietario)
router.get('/:id/citas', auth, async (req, res) => {
  try {
    const perfilId = req.params.id;
    const citas = await db.prepare(
      "SELECT * FROM citas WHERE perfil_id = $1 ORDER BY fecha_cita DESC"
    ).all(perfilId);
    res.json({ ok: true, citas });
  } catch (err) {
    console.error('Error obteniendo citas:', err);
    res.status(500).json({ error: 'Error obteniendo citas' });
  }
});

module.exports = router;
module.exports.perfilPublicoHandler = perfilPublicoHandler;
module.exports.getSmartIcon = getSmartIcon;
module.exports.getSmartBrandColor = getSmartBrandColor;
