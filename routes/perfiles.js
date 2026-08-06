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
 * GET /api/perfiles
 * Listar perfiles del usuario autenticado.
 */
router.get('/', auth, (req, res) => {
  const perfiles = db.prepare(
    'SELECT * FROM perfiles WHERE usuario_id = ? ORDER BY fecha_creacion DESC'
  ).all(req.user.id);

  const result = perfiles.map(perfil => {
    const camposCount = db.prepare(
      'SELECT COUNT(*) as total FROM campos_contacto WHERE perfil_id = ?'
    ).get(perfil.id);
    const archivosCount = db.prepare(
      'SELECT COUNT(*) as total FROM archivos WHERE perfil_id = ?'
    ).get(perfil.id);

    return {
      ...perfil,
      campos_count: camposCount.total,
      archivos_count: archivosCount.total
    };
  });

  res.json(result);
});

const requireQuota = require('../middleware/quota');

/**
 * POST /api/perfiles
 * Crear un nuevo perfil.
 */
router.post('/', auth, requireQuota, checkPlanLimit('perfil'), (req, res) => {
  // Wrapper para manejar multer como promise-like
  uploadImage(req, res, (err) => {
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

    const result = db.prepare(
      `INSERT INTO perfiles (usuario_id, slug, nombre_perfil, tipo, foto_url, color, tema, bio, cumpleanos, lugar_estudio, pronombres)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(req.user.id, slug, nombre_perfil.trim(), tipo || null, foto_url, perfilColor, perfilTema,
          bio || null, cumpleanos || null, lugar_estudio || null, pronombres || null);

    const perfil = db.prepare('SELECT * FROM perfiles WHERE id = ?').get(result.lastInsertRowid);

    res.status(201).json(perfil);
  });
});

/**
 * PUT /api/perfiles/:id
 * Actualizar un perfil existente.
 */
router.put('/:id', auth, requireQuota, (req, res) => {
  uploadImage(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }

    const perfilId = parseInt(req.params.id, 10);
    const perfil = db.prepare('SELECT * FROM perfiles WHERE id = ?').get(perfilId);

    if (!perfil) {
      return res.status(404).json({ error: 'Perfil no encontrado.' });
    }

    if (perfil.usuario_id !== req.user.id) {
      return res.status(403).json({ error: 'No tienes permiso para editar este perfil.' });
    }

    const { nombre_perfil, tipo, color, bio, cumpleanos, lugar_estudio, pronombres, tema, foto_base64 } = req.body;
    let foto_url = perfil.foto_url;

    // Si se sube una nueva foto, actualizar
    if (foto_base64) {
      foto_url = foto_base64;
    } else if (req.file) {
      if (perfil.foto_url && perfil.foto_url.startsWith('/uploads/')) {
        const oldPath = path.join(process.cwd(), perfil.foto_url);
        try {
          if (fs.existsSync(oldPath)) {
            fs.unlinkSync(oldPath);
          }
        } catch (e) {
          // Ignorar errores al eliminar archivo antiguo
        }
      }
      foto_url = `/uploads/${req.file.filename}`;
    }
    
    const perfilTema = tema || perfil.tema;

    db.prepare(
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

    const updated = db.prepare('SELECT * FROM perfiles WHERE id = ?').get(perfilId);
    res.json(updated);
  });
});

/**
 * DELETE /api/perfiles/:id
 * Eliminar un perfil y sus archivos asociados.
 */
router.delete('/:id', auth, requireQuota, (req, res) => {
  const perfilId = parseInt(req.params.id, 10);
  const perfil = db.prepare('SELECT * FROM perfiles WHERE id = ?').get(perfilId);

  if (!perfil) {
    return res.status(404).json({ error: 'Perfil no encontrado.' });
  }

  if (perfil.usuario_id !== req.user.id) {
    return res.status(403).json({ error: 'No tienes permiso para eliminar este perfil.' });
  }

  // Obtener todos los archivos para eliminarlos del disco
  const archivos = db.prepare('SELECT * FROM archivos WHERE perfil_id = ?').all(perfilId);

  for (const archivo of archivos) {
    const filePath = path.join(process.cwd(), archivo.url);
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (e) {
      // Ignorar errores al eliminar archivos
    }
  }

  // Eliminar foto de perfil del disco
  if (perfil.foto_url) {
    const fotoPath = path.join(process.cwd(), perfil.foto_url);
    try {
      if (fs.existsSync(fotoPath)) {
        fs.unlinkSync(fotoPath);
      }
    } catch (e) {
      // Ignorar errores
    }
  }

  // CASCADE se encarga de eliminar campos_contacto, archivos y estadísticas
  db.prepare('DELETE FROM perfiles WHERE id = ?').run(perfilId);

  res.json({ ok: true, mensaje: 'Perfil eliminado correctamente.' });
});

/**
 * GET /api/perfiles/:slug/qr
 * Generar código QR para un perfil.
 */
router.get('/:slug/qr', async (req, res) => {
  try {
    const { slug } = req.params;
    const perfil = db.prepare('SELECT id FROM perfiles WHERE slug = ?').get(slug);

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
 * Descargar vCard del perfil.
 */
router.get('/:slug/vcard', (req, res) => {
  const { slug } = req.params;

  const perfil = db.prepare('SELECT * FROM perfiles WHERE slug = ?').get(slug);
  if (!perfil) {
    return res.status(404).json({ error: 'Perfil no encontrado.' });
  }

  const campos = db.prepare(
    'SELECT * FROM campos_contacto WHERE perfil_id = ? ORDER BY orden ASC'
  ).all(perfil.id);

  const vcardContent = generateVCard(perfil, campos, BASE_URL);

  const filename = perfil.nombre_perfil.replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s]/g, '').trim() || 'contacto';

  res.set('Content-Type', 'text/vcard; charset=utf-8');
  res.set('Content-Disposition', `attachment; filename="${filename}.vcf"`);
  res.send(vcardContent);
});

/**
 * Handler para el perfil público: GET /u/:slug
 * Se exporta para montar directamente en server.js.
 */
function perfilPublicoHandler(req, res) {
  const { slug } = req.params;

  const perfil = db.prepare('SELECT * FROM perfiles WHERE slug = ?').get(slug);
  if (!perfil) {
    return res.status(404).send(generate404Page());
  }

  // Incrementar visitas
  db.prepare('UPDATE perfiles SET visitas = visitas + 1 WHERE id = ?').run(perfil.id);

  const campos = db.prepare(
    'SELECT * FROM campos_contacto WHERE perfil_id = ? ORDER BY orden ASC'
  ).all(perfil.id);

  const archivos = db.prepare(
    'SELECT * FROM archivos WHERE perfil_id = ? ORDER BY fecha_subida DESC'
  ).all(perfil.id);

  const color = escapeHtml(perfil.color || '#007AFF');
  const themeCss = `
    :root {
      --primary: ${color};
      --accent: ${color};
    }
  `;

  // --- Avatar HTML ---
  let avatar_html;
  let fotoSrc = '';
  if (perfil.foto_url) {
    fotoSrc = perfil.foto_url.startsWith('data:image') ? perfil.foto_url : `${BASE_URL}${perfil.foto_url}`;
    avatar_html = `<div class="avatar" style="width:110px;height:110px;border:3px solid ${color}">
      <img src="${fotoSrc}" alt="${escapeHtml(perfil.nombre_perfil)}">
    </div>`;
  } else {
    const initials = perfil.nombre_perfil
      .split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
    avatar_html = `<div class="avatar" style="width:110px;height:110px;background:${color};font-size:2.5rem">${initials}</div>`;
  }

  // --- Bio HTML ---
  let bio_html = '';
  if (perfil.bio) {
    bio_html = `<p class="bio">${escapeHtml(perfil.bio)}</p>`;
  }

  // --- Tags HTML ---
  let tags_parts = [];
  if (perfil.tipo) tags_parts.push(escapeHtml(perfil.tipo));
  if (perfil.pronombres) tags_parts.push(escapeHtml(perfil.pronombres));
  if (perfil.lugar_estudio) tags_parts.push('📚 ' + escapeHtml(perfil.lugar_estudio));
  if (perfil.cumpleanos) tags_parts.push('🎂 ' + escapeHtml(perfil.cumpleanos));

  const tags_html = tags_parts.length > 0
    ? `<div class="tags">${tags_parts.map(t => `<span class="tag">${t}</span>`).join('')}</div>`
    : '';

  // --- Bloques & Campos de contacto HTML ---
  const bloques = db.prepare('SELECT * FROM bloques WHERE perfil_id = ? AND visible = 1 ORDER BY orden ASC').all(perfil.id);
  
  let bloques_html = '';
  
  if (bloques.length > 0) {
    bloques_html = bloques.map(bloque => {
      const bId = bloque.id;
      const bContent = typeof bloque.contenido === 'string' ? JSON.parse(bloque.contenido) : bloque.contenido;
      let html = `<div class="block-wrapper block-${bloque.tipo}" data-bloque-id="${bId}">`;
      
      switch (bloque.tipo) {
        case 'link':
          html += `<a href="${escapeHtml(bContent.url)}" target="_blank" rel="noopener" class="block-link">
            ${bContent.icono ? `<div class="bl-icon" style="color: ${escapeHtml(bContent.color || 'var(--text-primary)')}">${escapeHtml(bContent.icono)}</div>` : ''}
            <div class="bl-text">
              <div class="bl-title">${escapeHtml(bContent.titulo)}</div>
              ${bContent.subtitulo ? `<div class="bl-sub">${escapeHtml(bContent.subtitulo)}</div>` : ''}
            </div>
            <i class="fas fa-chevron-right bl-arrow"></i>
          </a>`;
          break;
        case 'spotify':
        case 'youtube':
        case 'tweet':
        case 'tiktok':
          html += `<div class="block-embed">${bContent.embed_html || ''}</div>`;
          break;
        case 'texto':
          const tStyle = bContent.estilo === 'cita' ? 't-cita' : bContent.estilo === 'titulo' ? 't-titulo' : 't-normal';
          html += `<div class="block-text ${tStyle}">${escapeHtml(bContent.texto)}</div>`;
          break;
        case 'whatsapp':
          const waLink = `https://wa.me/${(bContent.numero || '').replace(/[^0-9]/g, '')}${bContent.mensaje_default ? `?text=${encodeURIComponent(bContent.mensaje_default)}` : ''}`;
          html += `<a href="${escapeHtml(waLink)}" target="_blank" rel="noopener" class="block-wa">
            <i class="fab fa-whatsapp"></i> ${escapeHtml(bContent.texto || 'WhatsApp')}
          </a>`;
          break;
        case 'social_icons':
          html += `<div class="block-socials">`;
          (bContent.redes || []).forEach(red => {
            const icon = getFieldIcon(red.tipo);
            const color = getFieldColor(red.tipo);
            const link = getFieldLink({ tipo: red.tipo, valor: red.url });
            html += `<a href="${escapeHtml(link)}" target="_blank" rel="noopener" class="social-icon" style="background: ${color};" title="${escapeHtml(red.tipo)}">
              ${icon}
            </a>`;
          });
          html += `</div>`;
          break;
        case 'email_capture':
          html += `<div class="block-email">
            <form data-perfil="${perfil.id}">
              ${bContent.titulo ? `<h3>${escapeHtml(bContent.titulo)}</h3>` : ''}
              <div class="email-form-group">
                <input type="email" name="email" placeholder="${escapeHtml(bContent.placeholder || 'Tu email')}" required>
                <button type="submit">${escapeHtml(bContent.boton_texto || 'Suscribirse')}</button>
              </div>
            </form>
          </div>`;
          break;
        case 'galeria':
          html += `<div class="block-gallery">`;
          (bContent.imagenes || []).forEach(img => {
            html += `<div class="gallery-item">
              <img src="${escapeHtml(img.url)}" alt="Galería">
              ${img.caption ? `<div class="gallery-caption">${escapeHtml(img.caption)}</div>` : ''}
            </div>`;
          });
          html += `</div>`;
          break;
        case 'countdown':
          const targetDate = new Date(bContent.fecha_fin).getTime();
          html += `<div class="block-countdown" data-countdown="${targetDate}">
            ${bContent.titulo ? `<h3>${escapeHtml(bContent.titulo)}</h3>` : ''}
            <div class="cd-digits">
              <div class="cd-unit"><div class="cd-num days">00</div><div class="cd-lbl">Días</div></div>
              <div class="cd-unit"><div class="cd-num hours">00</div><div class="cd-lbl">Hrs</div></div>
              <div class="cd-unit"><div class="cd-num minutes">00</div><div class="cd-lbl">Min</div></div>
              <div class="cd-unit"><div class="cd-num seconds">00</div><div class="cd-lbl">Seg</div></div>
            </div>
          </div>`;
          break;
        default:
          html += `<div class="block-unsupported">Bloque no soportado: ${escapeHtml(bloque.tipo)}</div>`;
      }
      
      html += `</div>`;
      return html;
    }).join('\n');
  } else {
    // Fallback to campos_contacto if no blocks
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

  // --- Archivos HTML ---
  const archivos_html = archivos.map(archivo => {
    const icon = archivo.tipo.includes('pdf') ? '<i class="fas fa-file-pdf"></i>' : '<i class="fas fa-file-image"></i>';
    const displayName = archivo.nombre.length > 35
      ? archivo.nombre.substring(0, 32) + '...'
      : archivo.nombre;
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

  // --- Archivos section ---
  const archivos_section_html = archivos.length > 0
    ? `<div class="section files-section">
        <h2 class="section-title">Archivos</h2>
        <div class="file-list">
          ${archivos_html}
        </div>
       </div>`
    : '';

  // --- Action buttons ---
  const action_buttons_html = generateActionButtons(perfil, campos);

  // --- OG image ---
  const og_image = fotoSrc || `${BASE_URL}/img/og-default.png`;

  // --- Read template ---
  let html;
  const templatePath = path.join(process.cwd(), 'views', 'perfil-publico.html');
  try {
    html = fs.readFileSync(templatePath, 'utf-8');
  } catch (e) {
    html = generateFallbackHTML();
  }

  // --- Replace ALL placeholders ---
  const bio_text = perfil.bio ? escapeHtml(perfil.bio) : 'Tarjeta digital de contacto';
  const tema = perfil.tema || 'ios';

  html = html
    .replace(/\{\{tema_css\}\}/g, themeCss)
    .replace(/\{\{tema\}\}/g, tema)
    .replace(/\{\{bio_text\}\}/g, bio_text)
    .replace(/\{\{nombre_perfil\}\}/g, escapeHtml(perfil.nombre_perfil))
    .replace(/\{\{tipo\}\}/g, escapeHtml(perfil.tipo || ''))
    .replace(/\{\{slug\}\}/g, escapeHtml(perfil.slug))
    .replace(/\{\{color\}\}/g, color)
    .replace(/\{\{og_image\}\}/g, og_image)
    .replace(/\{\{base_url\}\}/g, BASE_URL)
    .replace(/\{\{visitas\}\}/g, String(perfil.visitas + 1))
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
}

// =============================================
// Funciones auxiliares
// =============================================

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

  // Botón de WhatsApp (si tiene campo whatsapp)
  const whatsapp = campos.find(c => c.tipo === 'whatsapp');
  if (whatsapp) {
    const waLink = `https://wa.me/${whatsapp.valor.replace(/[^0-9]/g, '')}`;
    buttons.push(`
      <a href="${escapeHtml(waLink)}" class="action-btn action-whatsapp" data-action="click_whatsapp" target="_blank" rel="noopener">
        <i class="fab fa-whatsapp action-icon"></i> WhatsApp
      </a>`);
  }

  // Botón de llamar (si tiene teléfono)
  const telefono = campos.find(c => c.tipo === 'telefono');
  if (telefono) {
    buttons.push(`
      <a href="tel:${escapeHtml(telefono.valor)}" class="action-btn action-call" data-action="click_llamar">
        <i class="fas fa-phone action-icon"></i> Llamar
      </a>`);
  }

  // Botón de email (si tiene email)
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

function generateFallbackHTML() {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{nombre_perfil}} - TarjetaDigital</title>
  <meta name="description" content="Tarjeta digital de {{nombre_perfil}}">
  <meta property="og:title" content="{{nombre_perfil}} - TarjetaDigital">
  <meta property="og:description" content="Tarjeta digital de contacto">
  <meta property="og:image" content="{{og_image}}">
  <meta property="og:url" content="{{base_url}}/u/{{slug}}">
  <meta property="og:type" content="profile">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Inter', -apple-system, sans-serif;
      background: #0f0f23;
      color: #e0e0e0;
      min-height: 100vh;
    }
    {{tema_css}}
    .card-header {
      background: linear-gradient(135deg, {{color}}, {{color}}99);
      padding: 3rem 1.5rem 4rem;
      text-align: center;
      position: relative;
    }
    .avatar {
      width: 100px;
      height: 100px;
      border-radius: 50%;
      border: 4px solid rgba(255,255,255,0.3);
      object-fit: cover;
      margin-bottom: 1rem;
    }
    .profile-name { font-size: 1.5rem; font-weight: 700; color: #fff; }
    .profile-type { font-size: 0.9rem; color: rgba(255,255,255,0.8); margin-top: 0.25rem; }
    .card-body {
      max-width: 480px;
      margin: -2rem auto 0;
      padding: 0 1rem 2rem;
      position: relative;
      z-index: 1;
    }
    .section { background: #1a1a2e; border-radius: 12px; padding: 1rem; margin-bottom: 1rem; }
    .section-title { font-size: 0.75rem; text-transform: uppercase; color: #888; margin-bottom: 0.75rem; letter-spacing: 1px; }
    .action-buttons { display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.5rem; margin-bottom: 1rem; }
    .action-btn {
      display: flex; align-items: center; justify-content: center; gap: 0.5rem;
      padding: 0.75rem; border-radius: 10px; text-decoration: none; color: #fff;
      font-weight: 600; font-size: 0.85rem; transition: transform 0.2s, opacity 0.2s;
    }
    .action-btn:hover { transform: scale(1.03); opacity: 0.9; }
    .action-whatsapp { background: #25D366; }
    .action-call { background: #4A90D9; }
    .action-email { background: #EA4335; }
    .action-save { background: {{color}}; grid-column: 1 / -1; }
    .contact-item {
      display: flex; align-items: center; padding: 0.75rem; border-radius: 8px;
      text-decoration: none; color: #e0e0e0; transition: background 0.2s;
      margin-bottom: 0.25rem;
    }
    .contact-item:hover { background: rgba(255,255,255,0.05); }
    .contact-icon { font-size: 1.3rem; margin-right: 0.75rem; width: 32px; text-align: center; }
    .contact-info { flex: 1; }
    .contact-label { display: block; font-size: 0.7rem; color: #888; text-transform: uppercase; letter-spacing: 0.5px; }
    .contact-value { display: block; font-size: 0.9rem; margin-top: 0.15rem; }
    .contact-arrow { color: #555; font-size: 1.2rem; }
    .file-item {
      display: flex; align-items: center; gap: 0.75rem; padding: 0.75rem;
      border-radius: 8px; text-decoration: none; color: #e0e0e0; transition: background 0.2s;
    }
    .file-item:hover { background: rgba(255,255,255,0.05); }
    .file-icon { font-size: 1.3rem; }
    .file-name { flex: 1; font-size: 0.9rem; }
    .file-download { color: {{color}}; }
    .footer {
      text-align: center; padding: 2rem 1rem; font-size: 0.75rem; color: #555;
    }
    .footer a { color: {{color}}; text-decoration: none; }
  </style>
</head>
<body>
  <div class="card-header">
    <img src="{{foto_url}}" alt="{{nombre_perfil}}" class="avatar"
         onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><rect fill=%22%236C63FF%22 width=%22100%22 height=%22100%22/><text x=%2250%22 y=%2255%22 text-anchor=%22middle%22 fill=%22white%22 font-size=%2240%22>👤</text></svg>'">
    <div class="profile-name">{{nombre_perfil}}</div>
    <div class="profile-type">{{tipo}}</div>
  </div>

  <div class="card-body">
    <div class="action-buttons">
      {{action_buttons_html}}
    </div>

    <div class="section">
      {{bloques_html}}
    </div>

    <div class="section" id="archivos-section" style="{{archivos_html}}display:none">
      <div class="section-title">Archivos</div>
      {{archivos_html}}
    </div>

    <div class="footer">
      <p>Creado con <a href="{{base_url}}">TarjetaDigital</a></p>
    </div>
  </div>

  <script>
    // Mostrar sección de archivos solo si hay archivos
    (function() {
      var section = document.getElementById('archivos-section');
      if (section && section.querySelectorAll('.file-item').length > 0) {
        section.style.display = 'block';
      }
    })();

    function trackEvent(perfilId, evento) {
      fetch('{{api_base}}/api/estadisticas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ perfil_id: perfilId, evento: evento })
      }).catch(function() {});
    }

    // Registrar visita
    trackEvent({{perfil_id}}, 'visita');
  </script>
</body>
</html>`;
}

module.exports = router;
module.exports.perfilPublicoHandler = perfilPublicoHandler;
