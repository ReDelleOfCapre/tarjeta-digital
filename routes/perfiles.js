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
      WHERE slug IN ('cristina', 'cristina-taqueria', 'cristina-teziutlan')
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
    res.status(500).json({ error: 'Error al consultar el perfil' });
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

    const { nombre_perfil, tipo, color, bio, cumpleanos, lugar_estudio, pronombres, tema, foto_base64 } = req.body;

    if (!nombre_perfil || !nombre_perfil.trim()) {
      return res.status(400).json({ error: 'El nombre del perfil es obligatorio.' });
    }

    const slug = generateUniqueSlug(nombre_perfil);
    const foto_url = foto_base64 ? foto_base64 : (req.file ? `/uploads/${req.file.filename}` : null);
    const perfilColor = color || '#007AFF';
    const perfilTema = tema || 'ios';

    const result = await db.prepare(
      `INSERT INTO perfiles (usuario_id, slug, nombre_perfil, tipo, foto_url, color, tema, bio, cumpleanos, lugar_estudio, pronombres)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(req.user.id, slug, nombre_perfil.trim(), tipo || null, foto_url, perfilColor, perfilTema,
          bio || null, cumpleanos || null, lugar_estudio || null, pronombres || null);

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

    const { nombre_perfil, tipo, color, bio, cumpleanos, lugar_estudio, pronombres, tema, foto_base64 } = req.body;
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
           pronombres = ?
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
    const themeCss = `:root { --primary: ${color}; --accent: ${color}; }`;

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
    if (perfil.foto_url) {
      fotoSrc = (perfil.foto_url.startsWith('http') || perfil.foto_url.startsWith('data:image'))
        ? perfil.foto_url
        : (perfil.foto_url.startsWith('/') ? `${BASE_URL}${perfil.foto_url}` : `${BASE_URL}/${perfil.foto_url}`);
      avatar_html = `<div class="avatar-wrapper" style="${wrapperStyle}">
        <div class="avatar">
          <img src="${fotoSrc}" alt="${escapeHtml(perfil.nombre_perfil || '')}" onerror="this.onerror=null;this.src='/img/logo.svg';">
        </div>
      </div>`;
    } else {
      const initials = (perfil.nombre_perfil || 'V').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
      avatar_html = `<div class="avatar-wrapper" style="${wrapperStyle}">
        <div class="avatar" style="background:${color};font-size:2.5rem">${initials}</div>
      </div>`;
    }

    let bio_html = '';
    if (perfil.bio) bio_html = `<p class="bio">${escapeHtml(perfil.bio)}</p>`;

    let tags_parts = [];
    if (perfil.tipo) tags_parts.push(escapeHtml(perfil.tipo));
    if (perfil.pronombres) tags_parts.push(escapeHtml(perfil.pronombres));
    if (perfil.lugar_estudio) tags_parts.push('📚 ' + escapeHtml(perfil.lugar_estudio));
    if (perfil.cumpleanos) tags_parts.push('🎂 ' + escapeHtml(perfil.cumpleanos));
    const tags_html = tags_parts.length > 0
      ? `<div class="tags">${tags_parts.map(t => `<span class="tag">${t}</span>`).join('')}</div>`
      : '';

    const bloques = await db.prepare('SELECT * FROM bloques WHERE perfil_id = ? AND visible = 1 ORDER BY orden ASC').all(perfil.id) || [];

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
          const bentoClass = (blockType === 'whatsapp' || blockType === 'pago' || blockType === 'email_capture' || isLocationBlock || hasRichImage)
            ? ' bento-hero'
            : (blockType === 'pdf' ? ' bento-media' : (isSocialLink ? ' bento-social' : ' bento-hero'));
          let html = `<div class="block-wrapper block-${escapeHtml(blockType)}${hasRichImage}${bentoClass}" data-bloque-id="${bId}">`;

          switch (blockType) {
            case 'link': {
              const url = urlStr;
              const titulo = bContent?.titulo || 'Enlace';
              const subtitulo = bContent?.subtitulo || '';
              if (url.includes('open.spotify.com')) {
                let spotifyPath = url.replace('https://open.spotify.com/', '').replace('http://open.spotify.com/', '');
                if (!spotifyPath.startsWith('embed/')) spotifyPath = 'embed/' + spotifyPath;
                html += `<iframe class="smart-player" src="https://open.spotify.com/${escapeHtml(spotifyPath)}" width="100%" height="152" frameborder="0" allowfullscreen="" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy"></iframe>`;
              } else if (isLocationBlock) {
                const deepLinkUrl = url.includes('http') ? url : `https://maps.google.com/?q=${encodeURIComponent(titulo || 'Ubicación')}`;
                html += `<details class="smart-accordion" open>
                  <summary style="border-left:4px solid #EA4335">
                    <div style="display:flex;align-items:center;gap:10px">
                      <i class="fas fa-map-location-dot" style="color:#EA4335;font-size:1rem"></i>
                      <span style="font-weight:700;font-size:0.95rem;color:#FFF;white-space:normal;line-height:1.4">📍 ${escapeHtml(titulo)}</span>
                    </div>
                  </summary>
                  <div class="smart-accordion-content" style="padding:16px 20px 20px 20px;display:flex;flex-direction:column;gap:12px">
                    ${subtitulo ? `<div style="font-size:0.88rem;color:rgba(255,255,255,0.75);line-height:1.5;white-space:normal;word-break:break-word">${escapeHtml(subtitulo)}</div>` : ''}
                    <a href="${escapeHtml(deepLinkUrl)}" target="_blank" rel="noopener" class="btn btn-secondary btn-block" style="margin-top:6px;padding:12px 16px;font-size:0.85rem;font-weight:600;display:flex;align-items:center;justify-content:center;gap:8px;border-radius:12px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.12);color:#FFF">
                      <i class="fas fa-location-arrow" style="color:#EA4335;font-size:0.9rem"></i>
                      <span>Abrir en Mapas Nativos del Sistema</span>
                      <i class="fas fa-external-link-alt" style="opacity:0.6;font-size:0.75rem;margin-left:auto"></i>
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
                  html += `<a href="${escapeHtml(url)}" target="_blank" rel="noopener" class="bento-rich-card bento-hero-card">
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
                  html += `<a href="${escapeHtml(url)}" target="_blank" rel="noopener" class="block-link bento-social-card" style="border-left: 3px solid ${brandColor};">
                    <div class="bento-social-icon" style="color: ${brandColor}">${icon}</div>
                    <div class="bl-text" style="text-align:center">
                      <div class="bl-title" style="font-size:0.9rem">${escapeHtml(titulo)}</div>
                      <div class="bento-social-handle">@${escapeHtml(domain)}</div>
                    </div>
                  </a>`;
                } else {
                  html += `<a href="${escapeHtml(url)}" target="_blank" rel="noopener" class="block-link bento-hero-card" style="border-left: 4px solid ${brandColor};">
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

              html += `<details class="smart-accordion" open style="border-radius:18px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);margin-bottom:12px;overflow:hidden">
                <summary style="border-left:4px solid #EF6F7C;padding:16px 20px;cursor:pointer">
                  <div style="display:flex;align-items:center;gap:12px">
                    <i class="fas fa-map-marked-alt" style="color:#EF6F7C;font-size:1.2rem"></i>
                    <div>
                      <div style="font-weight:700;font-size:1rem;color:#FFF">${escapeHtml(titulo)}</div>
                      <div style="font-size:0.8rem;color:rgba(255,255,255,0.7)">${escapeHtml(subtitulo)}</div>
                    </div>
                  </div>
                </summary>
                <div class="smart-accordion-content" style="padding:16px 20px 20px 20px;display:flex;flex-direction:column;gap:12px">
                  ${direccion ? `<div style="font-size:0.88rem;color:rgba(255,255,255,0.9)"><i class="fas fa-location-dot" style="color:#EF6F7C;margin-right:6px"></i> <strong>Dirección:</strong> ${escapeHtml(direccion)}</div>` : ''}
                  ${horario ? `<div style="font-size:0.85rem;color:rgba(255,255,255,0.75)"><i class="fas fa-clock" style="color:#F59E0B;margin-right:6px"></i> <strong>Horario:</strong> ${escapeHtml(horario)}</div>` : ''}
                  ${sucursales.length > 0 ? `
                    <div style="display:flex;flex-direction:column;gap:8px;margin-top:8px">
                      ${sucursales.map(s => `
                        <div style="padding:10px 14px;border-radius:12px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);display:flex;align-items:center;justify-content:space-between">
                          <div>
                            <div style="font-size:0.85rem;font-weight:700;color:#FFF">${escapeHtml(s.nombre || 'Sucursal')}</div>
                            <div style="font-size:0.75rem;color:rgba(255,255,255,0.65)">${escapeHtml(s.direccion || '')}</div>
                          </div>
                          ${s.telefono ? `<a href="tel:${escapeHtml(s.telefono)}" class="btn btn-sm btn-ghost" style="padding:4px 10px;font-size:0.75rem">📞 ${escapeHtml(s.telefono)}</a>` : ''}
                        </div>
                      `).join('')}
                    </div>
                  ` : ''}
                  ${mapUrl ? `
                    <a href="${escapeHtml(mapUrl)}" target="_blank" rel="noopener" class="btn btn-secondary btn-block" style="margin-top:8px;padding:12px 16px;font-size:0.85rem;font-weight:600;display:flex;align-items:center;justify-content:center;gap:8px;border-radius:12px;background:rgba(239,111,124,0.15);border:1px solid rgba(239,111,124,0.3);color:#FFF">
                      <i class="fas fa-location-arrow" style="color:#EF6F7C;font-size:0.9rem"></i>
                      <span>Abrir en Mapas Nativos del Sistema (GPS)</span>
                      <i class="fas fa-external-link-alt" style="opacity:0.6;font-size:0.75rem;margin-left:auto"></i>
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
              html += `<div class="block-embed">${bContent?.embed_html || ''}</div>`;
              break;
            case 'texto': {
              const tStyle = bContent?.estilo === 'cita' ? 't-cita' : bContent?.estilo === 'titulo' ? 't-titulo' : 't-normal';
              html += `<div class="block-text ${tStyle}">${escapeHtml(bContent?.texto || '')}</div>`;
              break;
            }
            case 'whatsapp': {
              const waLink = `https://wa.me/${(bContent?.numero || '').replace(/[^0-9]/g, '')}${bContent?.mensaje_default ? `?text=${encodeURIComponent(bContent.mensaje_default)}` : ''}`;
              html += `<a href="${escapeHtml(waLink)}" target="_blank" rel="noopener" class="block-wa bento-hero-card">
                <div class="bl-icon" style="background:#25D366;color:#fff"><i class="fab fa-whatsapp"></i></div>
                <div class="bl-text">
                  <div class="bl-title">${escapeHtml(bContent?.texto || 'WhatsApp Directo')}</div>
                  <div class="bl-sub">Atención e informes instantáneos</div>
                </div>
                <span class="bento-badge">⚡ Responde rápido</span>
              </a>`;
              break;
            }
            case 'social_icons': {
              html += `<div class="block-socials">`;
              const redes = Array.isArray(bContent?.redes) ? bContent.redes : [];
              redes.forEach(red => {
                if (red && red.url) {
                  const icon = getFieldIcon(red.tipo);
                  const color = getFieldColor(red.tipo);
                  const link = getFieldLink({ tipo: red.tipo, valor: red.url });
                  html += `<a href="${escapeHtml(link)}" target="_blank" rel="noopener" class="social-icon" style="background: ${color};" title="${escapeHtml(red.tipo || '')}">
                    ${icon}
                  </a>`;
                }
              });
              html += `</div>`;
              break;
            }
            case 'email_capture':
              html += `<div class="block-email">
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
              html += `<div class="block-gallery">`;
              const imagenes = Array.isArray(bContent?.imagenes) ? bContent.imagenes : [];
              imagenes.forEach(img => {
                if (img && img.url) {
                  html += `<div class="gallery-item">
                    <img src="${escapeHtml(img.url)}" alt="Galería">
                    ${img.caption ? `<div class="gallery-caption">${escapeHtml(img.caption)}</div>` : ''}
                  </div>`;
                }
              });
              html += `</div>`;
              break;
            }
            case 'countdown': {
              const targetDate = bContent?.fecha_fin ? new Date(bContent.fecha_fin).getTime() : Date.now();
              html += `<div class="block-countdown" data-countdown="${targetDate}">
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
              html += `<a href="${escapeHtml(bContent?.url || '#')}" target="_blank" rel="noopener" class="block-link block-pdf bento-media-card">
                <div class="bl-icon" style="background:rgba(239,68,68,0.15);color:#EF4444"><i class="fas fa-file-pdf"></i></div>
                <div class="bl-text">
                  <div class="bl-title">${escapeHtml(bContent?.titulo || 'Documento PDF')}</div>
                  ${bContent?.subtitulo ? `<div class="bl-sub">${escapeHtml(bContent.subtitulo)}</div>` : '<div class="bl-sub">Archivo adjunto descargable</div>'}
                </div>
                <span class="bento-badge">📄 PDF</span>
              </a>`;
              break;
            case 'pago':
              html += `<div class="block-pago">
                <div class="pago-header">
                  <div class="pago-icon"><i class="fas fa-credit-card"></i></div>
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
              html += `<div class="block-nota">
                <i class="fas fa-thumbtack nota-icon"></i>
                <div>${escapeHtml(bContent?.texto || '')}</div>
              </div>`;
              break;
            case 'ubicacion':
            case 'location': {
              const locationQuery = bContent?.direccion || bContent?.url || bContent?.titulo || 'Ubicación';
              html += `<div class="block-ubicacion" style="background:var(--bg-card);border:1px solid var(--border-color);border-radius:18px;padding:14px;margin-bottom:12px">
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
              html += `<div class="block-section-title">${escapeHtml(bContent?.titulo || '')}</div>`;
              break;
            default:
              html += `<div class="block-unsupported">Bloque: ${escapeHtml(blockType)}</div>`;
          }

          html += `</div>`;
          return html;
        } catch (e) {
          console.error('[CRITICAL] Error al renderizar bloque individual:', e);
          return '';
        }
      }).join('\n');
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
            <i class="fas fa-chevron-right contact-arrow"></i>
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
      const icon = (archivo.tipo || '').includes('pdf') ? '<i class="fas fa-file-pdf"></i>' : '<i class="fas fa-file-image"></i>';
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
          <i class="fas fa-arrow-down file-download"></i>
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

    const action_buttons_html = generateActionButtons(perfil, campos);
    const og_image = fotoSrc || `${BASE_URL}/img/og-default.png`;

    let html;
    const templatePath = path.join(process.cwd(), 'views', 'perfil-publico.html');
    try {
      html = fs.readFileSync(templatePath, 'utf-8');
    } catch (e) {
      console.error('Plantilla views/perfil-publico.html no encontrada');
      return res.status(500).send(`<!DOCTYPE html><html lang="es"><body style="background:#0A0A0B;color:#FFF;font-family:sans-serif;padding:40px;text-align:center"><h1>500 - Plantilla no disponible</h1><p>Falta views/perfil-publico.html en el servidor.</p><a href="/" style="color:#7C3AED">Volver al inicio</a></body></html>`);
    }

    const bio_text = perfil.bio ? escapeHtml(perfil.bio) : 'Tarjeta digital de contacto';
    const tema = perfil.tema || 'ios';

    const banner_html = perfil.banner_url
      ? `<div class="hero-banner"><img src="${escapeHtml(perfil.banner_url.startsWith('http') || perfil.banner_url.startsWith('/') ? perfil.banner_url : '/' + perfil.banner_url)}" alt="Portada" onerror="this.onerror=null;this.src='/img/hero-bg.jpg';"></div>`
      : '';

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
    res.status(500).send(`<!DOCTYPE html><html lang="es"><body style="background:#0A0A0B;color:#FFF;font-family:sans-serif;padding:40px;text-align:center"><h1>500 - Error al Renderizar Perfil</h1><p>${escapeHtml(err.message)}</p><a href="/" style="color:#7C3AED">Volver al inicio</a></body></html>`);
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
    whatsapp: '<i class="fab fa-whatsapp"></i>', telefono: '<i class="fas fa-phone"></i>', email: '<i class="fas fa-envelope"></i>', direccion: '<i class="fas fa-map-marker-alt"></i>',
    facebook: '<i class="fab fa-facebook-f"></i>', instagram: '<i class="fab fa-instagram"></i>', tiktok: '<i class="fab fa-tiktok"></i>', linkedin: '<i class="fab fa-linkedin-in"></i>',
    twitter: '<i class="fab fa-x-twitter"></i>', youtube: '<i class="fab fa-youtube"></i>', threads: '<i class="fab fa-threads"></i>', telegram: '<i class="fab fa-telegram-plane"></i>',
    snapchat: '<i class="fab fa-snapchat-ghost"></i>', discord: '<i class="fab fa-discord"></i>', twitch: '<i class="fab fa-twitch"></i>', kick: '<i class="fas fa-play"></i>',
    spotify: '<i class="fab fa-spotify"></i>', apple_music: '<i class="fab fa-apple"></i>', steam: '<i class="fab fa-steam"></i>', xbox: '<i class="fab fa-xbox"></i>', psn: '<i class="fab fa-playstation"></i>',
    amazon_wishlist: '<i class="fab fa-amazon"></i>', pinterest: '<i class="fab fa-pinterest-p"></i>', reddit: '<i class="fab fa-reddit-alien"></i>', bereal: '<i class="fas fa-camera-retro"></i>',
    web: '<i class="fas fa-globe"></i>', github: '<i class="fab fa-github"></i>', behance: '<i class="fab fa-behance"></i>', dribbble: '<i class="fab fa-dribbble"></i>', portafolio: '<i class="fas fa-briefcase"></i>',
    otro: '<i class="fas fa-link"></i>'
  };
  return icons[tipo] || '<i class="fas fa-link"></i>';
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
  const buttons = [];
  const whatsapp = campos.find(c => c.tipo === 'whatsapp');
  if (whatsapp) {
    const waLink = `https://wa.me/${whatsapp.valor.replace(/[^0-9]/g, '')}`;
    buttons.push(`
      <a href="${escapeHtml(waLink)}" class="action-btn action-whatsapp" data-action="click_whatsapp" target="_blank" rel="noopener">
        <i class="fab fa-whatsapp action-icon"></i> WhatsApp
      </a>`);
  }
  const telefono = campos.find(c => c.tipo === 'telefono');
  if (telefono) {
    buttons.push(`
      <a href="tel:${escapeHtml(telefono.valor)}" class="action-btn action-call" data-action="click_llamar">
        <i class="fas fa-phone action-icon"></i> Llamar
      </a>`);
  }
  const email = campos.find(c => c.tipo === 'email');
  if (email) {
    buttons.push(`
      <a href="mailto:${escapeHtml(email.valor)}" class="action-btn action-email" data-action="click_email">
        <i class="fas fa-envelope action-icon"></i> Email
      </a>`);
  }
  return buttons.length > 0 ? `<div class="action-buttons">${buttons.join('\n')}</div>` : '';
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
  if (u.includes('whatsapp') || t.includes('whatsapp')) return '<i class="fab fa-whatsapp"></i>';
  if (u.includes('facebook') || t.includes('facebook')) return '<i class="fab fa-facebook"></i>';
  if (u.includes('instagram') || t.includes('instagram')) return '<i class="fab fa-instagram"></i>';
  if (u.includes('youtube') || t.includes('youtube')) return '<i class="fab fa-youtube"></i>';
  if (u.includes('tiktok') || t.includes('tiktok')) return '<i class="fab fa-tiktok"></i>';
  if (u.includes('spotify') || t.includes('spotify')) return '<i class="fab fa-spotify"></i>';
  if (u.includes('twitter') || u.includes('x.com') || t.includes('twitter')) return '<i class="fab fa-x-twitter"></i>';
  if (u.includes('linkedin') || t.includes('linkedin')) return '<i class="fab fa-linkedin"></i>';
  if (u.includes('github') || t.includes('github')) return '<i class="fab fa-github"></i>';
  if (u.includes('uber') || t.includes('uber')) return '<i class="fas fa-motorcycle"></i>';
  if (u.includes('tel:') || t.includes('llama') || t.includes('telefono')) return '<i class="fas fa-phone"></i>';
  if (u.includes('mailto:') || t.includes('email') || t.includes('correo')) return '<i class="fas fa-envelope"></i>';
  if (u.includes('maps') || t.includes('ubicacion') || t.includes('sucursal')) return '<i class="fas fa-location-dot"></i>';
  if (u.includes('.pdf') || t.includes('pdf') || t.includes('menu')) return '<i class="fas fa-file-pdf"></i>';
  return '<i class="fas fa-link"></i>';
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

module.exports = router;
module.exports.perfilPublicoHandler = perfilPublicoHandler;
module.exports.getSmartIcon = getSmartIcon;
module.exports.getSmartBrandColor = getSmartBrandColor;
