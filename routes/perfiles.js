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

/**
 * POST /api/perfiles
 * Crear un nuevo perfil.
 */
router.post('/', auth, checkPlanLimit('perfil'), (req, res) => {
  // Wrapper para manejar multer como promise-like
  uploadImage(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }

    const { nombre_perfil, tipo, color } = req.body;

    if (!nombre_perfil || !nombre_perfil.trim()) {
      return res.status(400).json({ error: 'El nombre del perfil es obligatorio.' });
    }

    const slug = generateUniqueSlug(nombre_perfil);
    const foto_url = req.file ? `/uploads/${req.file.filename}` : null;
    const perfilColor = color || '#6C63FF';

    const result = db.prepare(
      `INSERT INTO perfiles (usuario_id, slug, nombre_perfil, tipo, foto_url, color)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(req.user.id, slug, nombre_perfil.trim(), tipo || null, foto_url, perfilColor);

    const perfil = db.prepare('SELECT * FROM perfiles WHERE id = ?').get(result.lastInsertRowid);

    res.status(201).json(perfil);
  });
});

/**
 * PUT /api/perfiles/:id
 * Actualizar un perfil existente.
 */
router.put('/:id', auth, (req, res) => {
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

    const { nombre_perfil, tipo, color } = req.body;
    let foto_url = perfil.foto_url;

    // Si se sube una nueva foto, eliminar la anterior
    if (req.file) {
      if (perfil.foto_url) {
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

    db.prepare(
      `UPDATE perfiles
       SET nombre_perfil = COALESCE(?, nombre_perfil),
           tipo = COALESCE(?, tipo),
           color = COALESCE(?, color),
           foto_url = ?
       WHERE id = ?`
    ).run(
      nombre_perfil || null,
      tipo || null,
      color || null,
      foto_url,
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
router.delete('/:id', auth, (req, res) => {
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

  const color = escapeHtml(perfil.color || '#6C63FF');

  // --- Avatar HTML (server-side conditional) ---
  let avatar_html;
  if (perfil.foto_url) {
    avatar_html = `<div class="avatar avatar-xl profile-foto">
      <img src="${BASE_URL}${perfil.foto_url}" alt="${escapeHtml(perfil.nombre_perfil)}">
    </div>`;
  } else {
    const initials = perfil.nombre_perfil
      .split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
    avatar_html = `<div class="avatar avatar-xl profile-foto profile-initials" style="background:${color}">
      ${initials}
    </div>`;
  }

  // --- Campos de contacto HTML ---
  const campos_html = campos.map(campo => {
    const icon = getFieldIcon(campo.tipo);
    const link = getFieldLink(campo);
    const label = campo.etiqueta || getFieldLabel(campo.tipo);

    return `
      <a href="${escapeHtml(link)}" class="contact-item" target="_blank" rel="noopener">
        <span class="contact-icon">${icon}</span>
        <div class="contact-info">
          <span class="contact-label">${escapeHtml(label)}</span>
          <span class="contact-value">${escapeHtml(campo.valor)}</span>
        </div>
        <span class="contact-arrow">›</span>
      </a>`;
  }).join('\n');

  // --- Campos section (only if there are campos) ---
  const campos_section_html = campos.length > 0
    ? `<div class="section">
        <h2 class="section-title">Contacto</h2>
        ${campos_html}
       </div>`
    : '';

  // --- Archivos HTML ---
  const archivos_html = archivos.map(archivo => {
    const icon = archivo.tipo.includes('pdf') ? '📄' : '🖼️';
    const displayName = archivo.nombre.length > 35
      ? archivo.nombre.substring(0, 32) + '...'
      : archivo.nombre;
    return `
      <a href="${escapeHtml(archivo.url)}" class="file-item" target="_blank" rel="noopener">
        <span class="file-icon">${icon}</span>
        <span class="file-name">${escapeHtml(displayName)}</span>
        <span class="file-download" style="color:${color}">Ver ↗</span>
      </a>`;
  }).join('\n');

  // --- Archivos section (only if there are archivos) ---
  const archivos_section_html = archivos.length > 0
    ? `<div class="section">
        <h2 class="section-title">Archivos</h2>
        ${archivos_html}
       </div>`
    : '';

  // --- Action buttons ---
  const action_buttons_html = generateActionButtons(perfil, campos);

  // --- OG image ---
  const og_image = perfil.foto_url
    ? `${BASE_URL}${perfil.foto_url}`
    : `${BASE_URL}/img/og-default.png`;

  // --- Read template ---
  let html;
  const templatePath = path.join(process.cwd(), 'views', 'perfil-publico.html');
  try {
    html = fs.readFileSync(templatePath, 'utf-8');
  } catch (e) {
    html = generateFallbackHTML();
  }

  // --- Replace ALL placeholders ---
  html = html
    .replace(/\{\{nombre_perfil\}\}/g, escapeHtml(perfil.nombre_perfil))
    .replace(/\{\{tipo\}\}/g, escapeHtml(perfil.tipo || ''))
    .replace(/\{\{slug\}\}/g, escapeHtml(perfil.slug))
    .replace(/\{\{color\}\}/g, color)
    .replace(/\{\{og_image\}\}/g, og_image)
    .replace(/\{\{base_url\}\}/g, BASE_URL)
    .replace(/\{\{visitas\}\}/g, String(perfil.visitas + 1))
    .replace(/\{\{avatar_html\}\}/g, avatar_html)
    .replace(/\{\{campos_section_html\}\}/g, campos_section_html)
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
    whatsapp: '💬',
    telefono: '📞',
    email: '✉️',
    direccion: '📍',
    facebook: '👤',
    instagram: '📷',
    tiktok: '🎵',
    linkedin: '💼',
    twitter: '🐦',
    web: '🌐',
    otro: '📌'
  };
  return icons[tipo] || '📌';
}

function getFieldLabel(tipo) {
  const labels = {
    whatsapp: 'WhatsApp',
    telefono: 'Teléfono',
    email: 'Correo electrónico',
    direccion: 'Dirección',
    facebook: 'Facebook',
    instagram: 'Instagram',
    tiktok: 'TikTok',
    linkedin: 'LinkedIn',
    twitter: 'Twitter / X',
    web: 'Sitio web',
    otro: 'Otro'
  };
  return labels[tipo] || tipo;
}

function getFieldLink(campo) {
  switch (campo.tipo) {
    case 'whatsapp':
      return `https://wa.me/${campo.valor.replace(/[^0-9]/g, '')}`;
    case 'telefono':
      return `tel:${campo.valor}`;
    case 'email':
      return `mailto:${campo.valor}`;
    case 'direccion':
      return `https://maps.google.com/?q=${encodeURIComponent(campo.valor)}`;
    case 'facebook':
      return campo.valor.startsWith('http') ? campo.valor : `https://facebook.com/${campo.valor}`;
    case 'instagram':
      return campo.valor.startsWith('http') ? campo.valor : `https://instagram.com/${campo.valor}`;
    case 'tiktok':
      return campo.valor.startsWith('http') ? campo.valor : `https://tiktok.com/@${campo.valor}`;
    case 'linkedin':
      return campo.valor.startsWith('http') ? campo.valor : `https://linkedin.com/in/${campo.valor}`;
    case 'twitter':
      return campo.valor.startsWith('http') ? campo.valor : `https://twitter.com/${campo.valor}`;
    case 'web':
      return campo.valor.startsWith('http') ? campo.valor : `https://${campo.valor}`;
    default:
      return '#';
  }
}

function getEventType(tipo) {
  const events = {
    whatsapp: 'click_whatsapp',
    telefono: 'click_llamar',
    email: 'click_email',
    direccion: 'click_mapa',
    facebook: 'click_red_social',
    instagram: 'click_red_social',
    tiktok: 'click_red_social',
    linkedin: 'click_red_social',
    twitter: 'click_red_social',
    web: 'click_red_social'
  };
  return events[tipo] || 'click_red_social';
}

function generateActionButtons(perfil, campos) {
  const buttons = [];

  // Botón de WhatsApp (si tiene campo whatsapp)
  const whatsapp = campos.find(c => c.tipo === 'whatsapp');
  if (whatsapp) {
    const waLink = `https://wa.me/${whatsapp.valor.replace(/[^0-9]/g, '')}`;
    buttons.push(`
      <a href="${escapeHtml(waLink)}" class="action-btn whatsapp" data-action="click_whatsapp" target="_blank" rel="noopener">
        <span class="action-icon">💬</span> WhatsApp
      </a>`);
  }

  // Botón de llamar (si tiene teléfono)
  const telefono = campos.find(c => c.tipo === 'telefono');
  if (telefono) {
    buttons.push(`
      <a href="tel:${escapeHtml(telefono.valor)}" class="action-btn call" data-action="click_llamar">
        <span class="action-icon">📞</span> Llamar
      </a>`);
  }

  // Botón de email (si tiene email)
  const email = campos.find(c => c.tipo === 'email');
  if (email) {
    buttons.push(`
      <a href="mailto:${escapeHtml(email.valor)}" class="action-btn email" data-action="click_email">
        <span class="action-icon">✉️</span> Email
      </a>`);
  }

  // Botón guardar contacto
  buttons.push(`
    <a href="/api/perfiles/${escapeHtml(perfil.slug)}/vcard" class="action-btn" data-action="descarga_vcard">
      <span class="action-icon">📥</span> Guardar
    </a>`);

  return buttons.join('\n');
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
      <div class="section-title">Contacto</div>
      {{campos_html}}
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
