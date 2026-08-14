/**
 * VYNK — Renderer del lienzo público (cliente).
 * Usado por la vista previa del editor y por la tarjeta pública si se
 * hidrata desde JSON. Usa los MISMO componentes CSS que el servidor
 * (vynk-cards.css). Cero emoji: los iconos son SVG (sistema único).
 *
 * Uso:
 *   renderVynkProfile(data, 'vynk-preview', { accent: '#7C3AED' })
 */

(function () {
  const ICONS = {
    whatsapp: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" width="1em" height="1em"><path d="M21 12a8 8 0 0 1-8 8H4l3-3a8 8 0 1 1 14-5z"/></svg>',
    phone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" width="1em" height="1em"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.13.96.36 1.9.7 2.8a2 2 0 0 1-.45 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.27a2 2 0 0 1 2.1-.45c.9.34 1.84.57 2.8.7A2 2 0 0 1 22 16.9z"/></svg>',
    mail: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" width="1em" height="1em"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m4 7 8 6 8-6"/></svg>',
    mapPin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" width="1em" height="1em"><path d="M12 21s7-7.5 7-12a7 7 0 1 0-14 0c0 4.5 7 12 7 12z"/><circle cx="12" cy="9" r="2.4"/></svg>',
    navigation: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" width="1em" height="1em"><path d="M3 11l19-8-8 19-2-8-9-3z"/></svg>',
    link: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" width="1em" height="1em"><path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/></svg>',
    pdf: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" width="1em" height="1em"><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9l-6-6z"/><path d="M14 3v6h6M9 13h6M9 17h4"/></svg>',
    clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" width="1em" height="1em"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>',
    zap: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" width="1em" height="1em"><path d="M13 2 4 14h6l-1 8 9-12h-6l1-8z"/></svg>'
  };

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function stripEmoji(s) {
    return String(s == null ? '' : s)
      .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}\u{200D}\u{1F1E6}-\u{1F1FF}]/gu, '')
      .replace(/\s{2,}/g, ' ')
      .trim();
  }

  function iconFor(url, title) {
    const u = String(url || '').toLowerCase();
    const t = String(title || '').toLowerCase();
    if (u.includes('whatsapp') || t.includes('whatsapp')) return 'whatsapp';
    if (u.includes('tel:') || t.includes('telefono') || t.includes('llama')) return 'phone';
    if (u.includes('mailto:') || t.includes('email')) return 'mail';
    if (u.includes('maps') || u.includes('mapa') || t.includes('ubicacion') || t.includes('sucursal')) return 'mapPin';
    if (u.includes('.pdf') || t.includes('pdf')) return 'pdf';
    if (t.includes('horario')) return 'clock';
    return 'link';
  }

  function rowHtml(iconName, title, sub, url, target, badge) {
    return '<a href="' + esc(url || '#') + '"' + (target ? ' target="_blank" rel="noopener"' : '') + ' class="row-item">'
      + '<div class="row-icon">' + (ICONS[iconName] || ICONS.link) + '</div>'
      + '<div class="row-text"><div class="row-title">' + esc(stripEmoji(title)) + '</div>'
      + (sub ? '<div class="row-sub">' + esc(stripEmoji(sub)) + '</div>' : '')
      + '</div>'
      + (badge ? '<span class="row-badge">' + esc(badge) + '</span>' : '')
      + '<span class="row-arrow">' + ICONS.link + '</span>'
      + '</a>';
  }

  function renderHeader(data, accent) {
    const name = data.header?.name || data.nombre_perfil || data.name || '';
    const bio = data.header?.bio || data.bio || '';
    const avatar = data.header?.avatar || data.header?.avatar_url || data.foto_url || data.avatar_url || '';
    const initials = name.split(' ').map(function (w) { return w[0]; }).slice(0, 2).join('').toUpperCase() || 'V';

    let avatarHtml;
    if (avatar) {
      avatarHtml = '<div class="avatar-wrapper"><div class="avatar">'
        + '<img src="' + esc(avatar) + '" alt="' + esc(name) + '" onerror="this.onerror=null;this.style.display=\'none\';if(this.nextElementSibling)this.nextElementSibling.style.display=\'flex\';">'
        + '<div class="avatar-fallback" style="display:none;background:' + esc(accent) + '">' + esc(initials) + '</div>'
        + '</div></div>';
    } else {
      avatarHtml = '<div class="avatar-wrapper"><div class="avatar" style="background:' + esc(accent) + '">' + esc(initials) + '</div></div>';
    }

    return '<section class="pass-hero"><div class="vp-head">'
      + avatarHtml
      + '<h1 class="name">' + esc(stripEmoji(name)) + '</h1>'
      + (bio ? '<p class="bio">' + esc(stripEmoji(bio)) + '</p>' : '')
      + '</div></section>';
  }

  function renderBlock(block) {
    if (!block) return '';
    const type = block.type || block.block_type || 'link';
    const c = block.content || block.data || {};
    const url = c.url || '';
    const title = c.titulo || c.title || '';
    const sub = c.subtitulo || c.subtitle || c.descripcion || '';

    switch (type) {
      case 'whatsapp':
        return rowHtml('whatsapp', c.titulo || c.texto || 'WhatsApp Directo', c.subtitulo || 'Atención e informes instantáneos', url, true, 'Responde rápido');
      case 'link':
        if (url.includes('open.spotify.com')) {
          return '<div class="block-wrapper"><div class="block-embed">' + (c.embed_html || '') + '</div></div>';
        }
        return rowHtml(iconFor(url, title), title || 'Enlace', sub, url, true, 'Ver enlace');
      case 'social_icons': {
        const redes = Array.isArray(c.redes) ? c.redes : [];
        if (!redes.length) return '';
        const items = redes.map(function (r) {
          return '<a href="' + esc(r.url || '#') + '" target="_blank" rel="noopener" class="social-icon" style="background:' + esc(r.color || '#8E8E93') + '" title="' + esc(r.tipo || '') + '">'
            + (ICONS[r.tipo] || ICONS.link) + '</a>';
        }).join('');
        return '<div class="block-wrapper"><div class="block-socials-wrapper"><div class="socials-label">Redes</div><div class="block-socials">' + items + '</div></div></div>';
      }
      case 'ubicacion':
      case 'location':
        return '<div class="block-wrapper"><div class="block-ubicacion">'
          + '<div class="ubic-head">' + ICONS.mapPin + '<span>' + esc(stripEmoji(c.titulo || 'Ubicación')) + '</span></div>'
          + '<iframe width="100%" height="160" style="border:0;border-radius:12px" loading="lazy" src="https://maps.google.com/maps?q=' + encodeURIComponent(c.direccion || c.titulo || '') + '&output=embed"></iframe>'
          + '<div class="ubic-net">'
          + '<a class="ubic-btn is-google" href="https://maps.google.com/?q=' + encodeURIComponent(c.direccion || c.titulo || '') + '" target="_blank" rel="noopener">' + ICONS.navigation + ' Google Maps</a>'
          + '<a class="ubic-btn is-apple" href="https://maps.apple.com/?q=' + encodeURIComponent(c.direccion || c.titulo || '') + '" target="_blank" rel="noopener">' + ICONS.mapPin + ' Apple Maps</a>'
          + '</div></div></div>';
      case 'pdf':
        return rowHtml('pdf', c.titulo || 'Documento PDF', c.subtitulo || 'Archivo adjunto descargable', url, true, 'PDF');
      case 'texto':
        return '<div class="block-wrapper"><div class="block-text">' + esc(stripEmoji(c.texto || '')) + '</div></div>';
      case 'seccion':
        return '<div class="block-wrapper"><div class="block-section-title">' + esc(stripEmoji(c.titulo || '')) + '</div></div>';
      case 'horario':
        return '<div class="block-wrapper"><div class="block-schedule"><div class="schedule-head">' + ICONS.clock + '<div class="bl-title">' + esc(stripEmoji(c.titulo || 'Horario')) + '</div></div></div></div>';
      default:
        return '';
    }
  }

  /**
   * Renderiza un perfil dentro de un contenedor.
   * @param {Object} data - perfil normalizado
   * @param {string|Element} containerId - id o elemento destino
   * @param {Object} opts - { accent, fallbackUrl }
   */
  function renderVynkProfile(data, containerId, opts) {
    const container = typeof containerId === 'string' ? document.getElementById(containerId) : containerId;
    if (!container) return;
    opts = opts || {};
    const accent = opts.accent || data.theme?.primaryColor || data.color || '#7C3AED';
    container.innerHTML = '';

    if (data.theme && data.theme.primaryColor) {
      document.documentElement.style.setProperty('--primary-color', data.theme.primaryColor);
    }

    const header = renderHeader(data, accent);
    container.appendChild(renderElement(header));

    const blocks = Array.isArray(data.blocks) ? data.blocks : [];
    if (!blocks.length) {
      container.appendChild(renderElement('<div class="block-wrapper"><div class="block-text">Aún no hay contenido en esta tarjeta.</div></div>'));
      return;
    }
    blocks.forEach(function (b) {
      const html = renderBlock(b);
      if (html) container.appendChild(renderElement(html));
    });
  }

  function renderElement(html) {
    const tpl = document.createElement('template');
    tpl.innerHTML = html.trim();
    return tpl.content.firstChild;
  }

  window.renderVynkProfile = renderVynkProfile;
  window.VYNK_ICONS = ICONS;
})();
