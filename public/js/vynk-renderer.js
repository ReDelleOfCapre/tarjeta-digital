/**
 * VYNK — Renderer del lienzo público (cliente).
 * Fuente única de render para la vista previa del editor y para cualquier
 * hidratación client-side. Usa los MISMO componentes CSS que el servidor
 * (vynk-cards.css). Cero emoji: los iconos son SVG (sistema único Lucide).
 *
 * Uso:
 *   renderVynkProfile(data, 'vynk-preview', { accent: '#7C3AED' })
 *
 * data normalizado:
 *   {
 *     nombre, bio, tipo, pronombres, lugar_estudio, cumpleanos,
 *     hora_apertura, hora_cierre, marco,
 *     foto_url | avatar,
 *     blocks: [ { type, content } ]   // content = contenido del bloque
 *   }
 */

(function () {
  const S = 'stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"';
  const A = 'viewBox="0 0 24 24" fill="none"';

  const ICONS = {
    whatsapp: '<svg ' + A + ' ' + S + ' width="1em" height="1em"><path d="M21 12a8 8 0 0 1-8 8H4l3-3a8 8 0 1 1 14-5z"/></svg>',
    phone: '<svg ' + A + ' ' + S + ' width="1em" height="1em"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.13.96.36 1.9.7 2.8a2 2 0 0 1-.45 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.27a2 2 0 0 1 2.1-.45c.9.34 1.84.57 2.8.7A2 2 0 0 1 22 16.9z"/></svg>',
    mail: '<svg ' + A + ' ' + S + ' width="1em" height="1em"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m4 7 8 6 8-6"/></svg>',
    mapPin: '<svg ' + A + ' ' + S + ' width="1em" height="1em"><path d="M12 21s7-7.5 7-12a7 7 0 1 0-14 0c0 4.5 7 12 7 12z"/><circle cx="12" cy="9" r="2.4"/></svg>',
    navigation: '<svg ' + A + ' ' + S + ' width="1em" height="1em"><path d="M3 11l19-8-8 19-2-8-9-3z"/></svg>',
    link: '<svg ' + A + ' ' + S + ' width="1em" height="1em"><path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/></svg>',
    pdf: '<svg ' + A + ' ' + S + ' width="1em" height="1em"><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9l-6-6z"/><path d="M14 3v6h6M9 13h6M9 17h4"/></svg>',
    clock: '<svg ' + A + ' ' + S + ' width="1em" height="1em"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>',
    zap: '<svg ' + A + ' ' + S + ' width="1em" height="1em"><path d="M13 2 4 14h6l-1 8 9-12h-6l1-8z"/></svg>',
    calendar: '<svg ' + A + ' ' + S + ' width="1em" height="1em"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>',
    school: '<svg ' + A + ' ' + S + ' width="1em" height="1em"><path d="M22 10 12 5 2 10l10 5 10-5z"/><path d="M6 12v5c0 1.7 2.7 3 6 3s6-1.3 6-3v-5"/></svg>',
    gift: '<svg ' + A + ' ' + S + ' width="1em" height="1em"><rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13M5 12v9h14v-9M7 8a3 3 0 1 1 5 2 3 3 0 1 1 5-2"/></svg>',
    image: '<svg ' + A + ' ' + S + ' width="1em" height="1em"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21"/></svg>',
    card: '<svg ' + A + ' ' + S + ' width="1em" height="1em"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/><path d="M6 15h4"/></svg>',
    note: '<svg ' + A + ' ' + S + ' width="1em" height="1em"><path d="M12 2v9l4.5 4.5a1 1 0 0 1-.7 1.7H8.2a1 1 0 0 1-.7-1.7L12 11V2"/><path d="M8 21h8"/></svg>',
    tag: '<svg ' + A + ' ' + S + ' width="1em" height="1em"><path d="M20.6 13.4 12 22 2 12V2h10l8.6 8.6a2 2 0 0 1 0 2.8z"/><circle cx="7.5" cy="7.5" r="1.5"/></svg>',
    play: '<svg ' + A + ' ' + S + ' width="1em" height="1em"><path d="M6 3.5v17l14-8.5z"/></svg>',
    star: '<svg ' + A + ' ' + S + ' width="1em" height="1em"><path d="m12 3 2.9 5.9 6.1.9-4.5 4.3 1.1 6.1L12 17.8 6.4 20.2l1.1-6.1L3 9.8l6.1-.9z"/></svg>',
    heart: '<svg ' + A + ' ' + S + ' width="1em" height="1em"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z"/></svg>',
    bank: '<svg ' + A + ' ' + S + ' width="1em" height="1em"><path d="M3 21h18"/><path d="M3 10h18"/><path d="M5 10V7h14v3M7 7V4h10v3"/><path d="M3 17h18"/></svg>',
    send: '<svg ' + A + ' ' + S + ' width="1em" height="1em"><path d="M22 2 11 13"/><path d="M22 2 15 22l-4-9-9-4z"/></svg>',
    eye: '<svg ' + A + ' ' + S + ' width="1em" height="1em"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg>',
    shoppingBag: '<svg ' + A + ' ' + S + ' width="1em" height="1em"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>',
    // Redes sociales
    instagram: '<svg ' + A + ' ' + S + ' width="1em" height="1em"><rect x="3" y="6" width="18" height="14" rx="2"/><circle cx="12" cy="13" r="4"/><path d="M8.5 6l1-2h5l1 2"/></svg>',
    tiktok: '<svg ' + A + ' ' + S + ' width="1em" height="1em"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>',
    twitter: '<svg ' + A + ' ' + S + ' width="1em" height="1em"><path d="M4 4l16 16M20 4L4 20"/></svg>',
    youtube: '<svg ' + A + ' ' + S + ' width="1em" height="1em"><path d="M6 4l14 8-14 8V4z"/></svg>',
    facebook: '<svg ' + A + ' ' + S + ' width="1em" height="1em"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>',
    linkedin: '<svg ' + A + ' ' + S + ' width="1em" height="1em"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4V9h4v1.5a6 6 0 0 1 2-1.5z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></svg>',
    spotify: '<svg ' + A + ' ' + S + ' width="1em" height="1em"><circle cx="12" cy="12" r="10"/><path d="M7 9.5c3.6-1 7.3-.6 10 1.2M7.5 13.2c2.8-.8 5.7-.4 7.9 1M8.5 16.5c2-.5 4-.2 5.6 1"/></svg>',
    github: '<svg ' + A + ' ' + S + ' width="1em" height="1em"><path d="M9 9V5a3 3 0 1 0-3 3h4z"/><path d="M15 9V5a3 3 0 1 1 3 3h-4z"/><path d="M15 15v4a3 3 0 1 1-3-3h3z"/><path d="M9 15v4a3 3 0 1 0 3-3H9z"/></svg>',
    globe: '<svg ' + A + ' ' + S + ' width="1em" height="1em"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>',
    threads: '<svg ' + A + ' ' + S + ' width="1em" height="1em"><circle cx="12" cy="12" r="2.5"/><path d="M12 2c4 0 6.5 2 6.5 5.5 0 2-1.2 3.2-2 3.7.8.5 2 1.7 2 3.7C18.5 18.5 16 20.5 12 20.5S5.5 18.5 5.5 15c0-1.4.5-2.5 1.3-3.5"/></svg>',
    telegram: '<svg ' + A + ' ' + S + ' width="1em" height="1em"><path d="m22 2-7 20-4-9-9-4z"/><path d="M22 2 11 13"/></svg>',
    snapchat: '<svg ' + A + ' ' + S + ' width="1em" height="1em"><path d="M12 2c2 0 3.5 1.6 4 4 .2 1 .6 1.6 1.3 2.2.5.4 1.2.5 1.8.4.4-.1.8.2.9.6.1.3-.1.6-.3.8-.7.7-2 .9-2.9 1.4-.4.2-.5.5-.4.9 0 .4.4.7 1 .9.9.4 2 .7 2.4 1.1.3.3.3.7 0 1-.3.3-1 .4-2 .4-.5 0-1 .1-1.4.3-.5.3-.6 1.1-1.7 1.1s-1.2-.8-1.7-1.1c-.4-.2-.9-.3-1.4-.3-1 0-1.7-.1-2-.4-.3-.3-.3-.7 0-1 .4-.4 1.5-.7 2.4-1.1.6-.2 1-.5 1-.9-.1-.4 0-.7-.4-.9-.9-.5-2.2-.7-2.9-1.4-.2-.2-.4-.5-.3-.8.1-.4.5-.7.9-.6.6.1 1.3 0 1.8-.4.7-.6 1.1-1.2 1.3-2.2.5-2.4 2-4 4-4z"/></svg>',
    discord: '<svg ' + A + ' ' + S + ' width="1em" height="1em"><path d="M18 7c-1.2-.6-2.5-1-3.8-1.1l-.5 1a11 11 0 0 0-3.4 0l-.5-1C8.5 6 7.2 6.4 6 7a17 17 0 0 0-2.7 13.4 13 13 0 0 0 4 2l.9-1.5c-.9-.3-1.8-.7-2.5-1.2l.6-.5a10 10 0 0 0 9.4 0l.6.5c-.7.5-1.6.9-2.5 1.2l.9 1.5a13 13 0 0 0 4-2A17 17 0 0 0 18 7z"/><path d="M9.5 12.5a1.2 1.2 0 1 0 0 2.4 1.2 1.2 0 0 0 0-2.4zM14.5 12.5a1.2 1.2 0 1 0 0 2.4 1.2 1.2 0 0 0 0-2.4z"/></svg>',
    twitch: '<svg ' + A + ' ' + S + ' width="1em" height="1em"><path d="M4 3h16v12l-4 4H11l-3 3v-3H4z"/><path d="M9 8v5M15 8v5"/></svg>',
    appleMusic: '<svg ' + A + ' ' + S + ' width="1em" height="1em"><path d="M9 18V6l12-2v12"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>',
    steam: '<svg ' + A + ' ' + S + ' width="1em" height="1em"><circle cx="12" cy="12" r="9"/><path d="M5.5 15.5 3 18"/><path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/><circle cx="15.5" cy="9.5" r="1"/></svg>',
    pinterest: '<svg ' + A + ' ' + S + ' width="1em" height="1em"><circle cx="12" cy="12" r="10"/><path d="M12 8c-2 0-3.5 1.5-3.5 3.5 0 1.2.7 2.3 1.8 2.7"/><path d="M12 16l-1.5 4"/></svg>',
    reddit: '<svg ' + A + ' ' + S + ' width="1em" height="1em"><circle cx="12" cy="12" r="10"/><circle cx="9.5" cy="10.5" r="1.5"/><circle cx="14.5" cy="10.5" r="1.5"/><path d="M12 14c2 0 3 1.5 3 1.5s-1 1.5-3 1.5-3-1.5-3-1.5 1-1.5 3-1.5z"/></svg>',
    behance: '<svg ' + A + ' ' + S + ' width="1em" height="1em"><path d="M3 6h7M3 12h8M3 18h5"/><circle cx="15" cy="9" r="2"/><path d="M13 9h6M16 9v7c2 0 4-1 4-3 0-1.5-1.5-2.5-3-2.5"/></svg>',
    dribbble: '<svg ' + A + ' ' + S + ' width="1em" height="1em"><circle cx="12" cy="12" r="10"/><path d="M8 3.5a20 20 0 0 0 0 17"/><path d="M16 3a20 20 0 0 1 0 18"/><path d="M2.5 12h19"/></svg>',
    briefcase: '<svg ' + A + ' ' + S + ' width="1em" height="1em"><rect x="3" y="7" width="18" height="14" rx="2"/><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/></svg>',
    utensils: '<svg ' + A + ' ' + S + ' width="1em" height="1em"><path d="M3 2v7a2 2 0 0 0 4 0V2"/><path d="M5 2v20"/><path d="M16 2c-1.5 1-2 4-2 6s.5 4 2 5v9"/><path d="M16 2c1.5 1 2 4 2 6s-.5 4-2 5"/></svg>'
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
    if (u.includes('instagram') || t.includes('instagram')) return 'instagram';
    if (u.includes('tiktok') || t.includes('tiktok')) return 'tiktok';
    if (u.includes('youtube') || t.includes('youtube')) return 'youtube';
    if (u.includes('facebook') || t.includes('facebook')) return 'facebook';
    if (u.includes('linkedin') || t.includes('linkedin')) return 'linkedin';
    if (u.includes('x.com') || u.includes('twitter')) return 'twitter';
    if (u.includes('spotify')) return 'spotify';
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

  function scheduleHtml(c) {
    const dias = ['Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado', 'Domingo'];
    const hoyIdx = new Date().getDay();
    const semana = Array.isArray(c.dias) ? c.dias : [];
    const filas = dias.map(function (dia, i) {
      const entrada = semana.find(function (d) { return (d && (d.dia || '').toLowerCase()) === dia.toLowerCase(); }) || {};
      const horario = entrada.horario || '';
      const esHoy = i === hoyIdx;
      const label = esHoy ? '<span class="today-pill">Hoy</span>' : '';
      return '<div class="schedule-row' + (esHoy ? ' is-today' : '') + '">'
        + '<span class="s-day">' + esc(stripEmoji(dia)) + label + '</span>'
        + '<span class="s-time' + (horario ? '' : ' is-closed') + '">' + (horario ? esc(stripEmoji(horario)) : 'Cerrado') + '</span>'
        + '</div>';
    }).join('');
    return '<div class="block-schedule">'
      + '<div class="schedule-head"><div class="row-icon">' + ICONS.clock + '</div><div class="bl-title">' + esc(stripEmoji(c.titulo || 'Horario')) + '</div></div>'
      + filas
      + '</div>';
  }

  function renderBlock(block) {
    if (!block) return '';
    const type = block.type || block.block_type || 'link';
    const c = block.content || block.data || {};
    const url = c.url || '';
    const title = c.titulo || c.title || '';
    const sub = c.subtitulo || c.subtitle || c.descripcion || '';

    switch (type) {
      case 'whatsapp': {
        const waNum = String(c.numero || c.telefono || url || '').replace(/[^0-9]/g, '');
        const waLink = waNum ? 'https://wa.me/' + waNum + (c.mensaje_default ? '?text=' + encodeURIComponent(c.mensaje_default) : '') : '#';
        return rowHtml('whatsapp', c.titulo || c.texto || 'WhatsApp Directo', c.subtitulo || (c.mensaje_default ? '"' + c.mensaje_default + '"' : 'Atención e informes instantáneos'), waLink, true, 'Responde rápido');
      }
      case 'link':
        if (url.includes('open.spotify.com')) {
          let spotifyPath = url.replace('https://open.spotify.com/', '').replace('http://open.spotify.com/', '');
          if (!spotifyPath.startsWith('embed/')) spotifyPath = 'embed/' + spotifyPath;
          return '<div class="block-wrapper"><div class="block-embed"><iframe src="https://open.spotify.com/' + esc(spotifyPath) + '" width="100%" height="152" frameborder="0" allowfullscreen="" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy"></iframe></div></div>';
        }
        return rowHtml(iconFor(url, title), title || 'Enlace', sub, url, true, 'Ver enlace');
      case 'spotify':
      case 'youtube':
      case 'tweet':
      case 'tiktok':
        return c.embed_html
          ? '<div class="block-wrapper"><div class="block-embed">' + c.embed_html + '</div></div>'
          : rowHtml(iconFor(url, type), title || type, sub, url, true, type);
      case 'social_icons': {
        const redes = Array.isArray(c.redes) ? c.redes : [];
        if (!redes.length) return '';
        const items = redes.map(function (r) {
          const tipo = r.tipo || '';
          return '<a href="' + esc(r.url || '#') + '" target="_blank" rel="noopener" class="social-icon" style="background:' + esc(r.color || '#8E8E93') + '" title="' + esc(tipo) + '">'
            + (ICONS[tipo] || ICONS.link) + '</a>';
        }).join('');
        return '<div class="block-wrapper"><div class="block-socials-wrapper"><div class="socials-label">Redes Oficiales</div><div class="block-socials">' + items + '</div></div></div>';
      }
      case 'ubicacion':
      case 'location': {
        const q = c.direccion || c.titulo || c.url || '';
        return '<div class="block-wrapper"><div class="block-ubicacion">'
          + '<div class="ubic-head">' + ICONS.mapPin + '<span>' + esc(stripEmoji(c.titulo || 'Nuestra Ubicación')) + '</span></div>'
          + '<iframe width="100%" height="160" style="border:0;border-radius:12px" loading="lazy" src="https://maps.google.com/maps?q=' + encodeURIComponent(q) + '&output=embed"></iframe>'
          + '<div class="ubic-net">'
          + '<a class="ubic-btn is-google" href="https://maps.google.com/?q=' + encodeURIComponent(q) + '" target="_blank" rel="noopener">' + ICONS.navigation + ' Google Maps</a>'
          + '<a class="ubic-btn is-apple" href="https://maps.apple.com/?q=' + encodeURIComponent(q) + '" target="_blank" rel="noopener">' + ICONS.mapPin + ' Apple Maps</a>'
          + '</div></div></div>';
      }
      case 'ubicaciones': {
        const q = c.direccion || c.titulo || '';
        const sucursales = Array.isArray(c.sucursales) ? c.sucursales : [];
        const rows = sucursales.map(function (s) {
          return '<div class="schedule-row">'
            + '<span class="s-day">' + esc(stripEmoji(s.nombre || 'Sucursal')) + '</span>'
            + '<span class="s-time">' + esc(stripEmoji(s.horario || s.direccion || '')) + '</span>'
            + '</div>';
        }).join('');
        return '<div class="block-wrapper"><div class="block-ubicacion">'
          + '<div class="ubic-head">' + ICONS.mapPin + '<span>' + esc(stripEmoji(c.titulo || 'Mapa & Sucursales')) + '</span></div>'
          + '<div class="block-schedule">' + rows + '</div>'
          + '<div class="ubic-net">'
          + '<a class="ubic-btn is-google" href="https://maps.google.com/?q=' + encodeURIComponent(q) + '" target="_blank" rel="noopener">' + ICONS.navigation + ' Google Maps</a>'
          + '<a class="ubic-btn is-apple" href="https://maps.apple.com/?q=' + encodeURIComponent(q) + '" target="_blank" rel="noopener">' + ICONS.mapPin + ' Apple Maps</a>'
          + '</div></div></div>';
      }
      case 'pdf':
        return rowHtml('pdf', c.titulo || 'Documento PDF', c.subtitulo || 'Archivo adjunto descargable', url, true, 'PDF');
      case 'texto': {
        const tStyle = c.estilo === 'cita' ? ' t-cita' : (c.estilo === 'titulo' ? ' t-titulo' : '');
        return '<div class="block-wrapper"><div class="block-text' + tStyle + '">' + esc(stripEmoji(c.texto || '')) + '</div></div>';
      }
      case 'seccion':
        return '<div class="block-wrapper"><div class="block-section-title">' + esc(stripEmoji(c.titulo || '')) + '</div></div>';
      case 'nota':
        return '<div class="block-wrapper"><div class="block-nota">' + ICONS.note + '<div>' + esc(stripEmoji(c.texto || '')) + '</div></div></div>';
      case 'horario':
        return '<div class="block-wrapper">' + scheduleHtml(c) + '</div>';
      case 'pago':
        return '<div class="block-wrapper"><div class="block-pago">'
          + '<div class="pago-header"><div class="pago-icon">' + ICONS.card + '</div>'
          + '<div><div class="pago-title">' + esc(stripEmoji(c.banco || 'Datos de Transferencia')) + '</div>'
          + (c.beneficiario ? '<div class="pago-sub">Titular: ' + esc(stripEmoji(c.beneficiario)) + '</div>' : '')
          + '</div></div>'
          + (c.clabe ? '<div class="clabe-box"><span>' + esc(c.clabe) + '</span><button type="button" class="btn-copy-clabe" onclick="navigator.clipboard&&navigator.clipboard.writeText(this.parentElement.firstElementChild.textContent);this.textContent=\'Copiado\';setTimeout(function(){this.textContent=\'Copiar CLABE\'}.bind(this),1600)">Copiar CLABE</button></div>' : '')
          + '</div></div>';
      case 'email_capture':
        return '<div class="block-wrapper"><div class="block-email">'
          + (c.titulo ? '<h3>' + esc(stripEmoji(c.titulo)) + '</h3>' : '')
          + '<div class="email-form-group"><input type="email" placeholder="' + esc(c.placeholder || 'Tu email') + '"><button type="button">' + esc(stripEmoji(c.boton_texto || 'Suscribirse')) + '</button></div>'
          + '</div></div>';
      case 'galeria': {
        const imagenes = Array.isArray(c.imagenes) ? c.imagenes : [];
        if (!imagenes.length) return '';
        const items = imagenes.filter(function (img) { return img && img.url; }).map(function (img) {
          return '<div class="gallery-item"><img src="' + esc(img.url) + '" alt="Galería" loading="lazy" onerror="this.style.display=\'none\'">'
            + (img.caption ? '<div class="gallery-caption">' + esc(stripEmoji(img.caption)) + '</div>' : '')
            + '</div>';
        }).join('');
        return '<div class="block-wrapper"><div class="block-gallery">' + items + '</div></div>';
      }
      case 'countdown': {
        const target = c.fecha_fin ? new Date(c.fecha_fin).getTime() : Date.now();
        return '<div class="block-wrapper"><div class="block-countdown" data-countdown="' + target + '">'
          + (c.titulo ? '<h3>' + esc(stripEmoji(c.titulo)) + '</h3>' : '')
          + '<div class="cd-digits">'
          + '<div class="cd-unit"><div class="cd-num days">00</div><div class="cd-lbl">Días</div></div>'
          + '<div class="cd-unit"><div class="cd-num hours">00</div><div class="cd-lbl">Hrs</div></div>'
          + '<div class="cd-unit"><div class="cd-num minutes">00</div><div class="cd-lbl">Min</div></div>'
          + '<div class="cd-unit"><div class="cd-num seconds">00</div><div class="cd-lbl">Seg</div></div>'
          + '</div></div></div>';
      }
      case 'wishlist':
        return rowHtml('gift', title || 'Wishlist', sub, url, true, 'Wishlist');
      default:
        return '';
    }
  }

  function horarioBadgeHtml(data) {
    const a = data.hora_apertura || '09:00';
    const c = data.hora_cierre || '20:00';
    const now = new Date();
    const currentMins = now.getHours() * 60 + now.getMinutes();
    const aParts = String(a).split(':').map(Number);
    const cParts = String(c).split(':').map(Number);
    const openMins = (aParts[0] || 9) * 60 + (aParts[1] || 0);
    const closeMins = (cParts[0] || 20) * 60 + (cParts[1] || 0);
    const isOpen = currentMins >= openMins && currentMins < closeMins;
    return isOpen
      ? '<span class="horario-badge is-open"><span class="dot" aria-hidden="true"></span><span>Abierto ahora &middot; (' + esc(a) + ' - ' + esc(c) + ')</span></span>'
      : '<span class="horario-badge is-closed"><span class="dot" aria-hidden="true"></span><span>Fuera de horario &middot; Atendemos a partir de las ' + esc(a) + '</span></span>';
  }

  function renderHeader(data, accent) {
    const name = data.nombre || data.name || 'Tu nombre';
    const bio = data.bio || '';
    const avatar = data.foto_url || data.avatar || '';
    const initials = String(name).split(' ').map(function (w) { return w && w[0]; }).slice(0, 2).join('').toUpperCase() || 'V';
    const marco = data.marco || data.marco_estilo || 'gradient';

    let wrapperStyle = '';
    if (marco === 'gradient') {
      wrapperStyle = 'border:none;padding:4px;background:linear-gradient(135deg,' + esc(accent) + ',#EC4899);box-shadow:0 8px 24px rgba(0,0,0,0.5);';
    } else if (marco === 'none') {
      wrapperStyle = 'border:none;padding:0;background:transparent;box-shadow:none;';
    } else {
      wrapperStyle = 'border:3px solid ' + esc(accent) + ';padding:0;background:var(--bg-primary,#141318);box-shadow:0 8px 24px rgba(0,0,0,0.5);';
    }

    let avatarHtml;
    if (avatar) {
      avatarHtml = '<div class="avatar-wrapper" style="' + wrapperStyle + '"><div class="avatar">'
        + '<img src="' + esc(avatar) + '" alt="' + esc(name) + '" onerror="this.onerror=null;this.style.display=\'none\';if(this.nextElementSibling)this.nextElementSibling.style.display=\'flex\';">'
        + '<div class="avatar-fallback" style="display:none;background:' + esc(accent) + '">' + esc(initials) + '</div>'
        + '</div></div>';
    } else {
      avatarHtml = '<div class="avatar-wrapper" style="' + wrapperStyle + '"><div class="avatar" style="background:' + esc(accent) + '">' + esc(initials) + '</div></div>';
    }

    const tags = [];
    if (data.tipo) tags.push('<span class="tag">' + esc(stripEmoji(data.tipo)) + '</span>');
    if (data.pronombres) tags.push('<span class="tag">' + esc(stripEmoji(data.pronombres)) + '</span>');
    if (data.lugar_estudio) tags.push('<span class="tag">' + ICONS.school + esc(stripEmoji(data.lugar_estudio)) + '</span>');
    if (data.cumpleanos) tags.push('<span class="tag">' + ICONS.calendar + esc(stripEmoji(data.cumpleanos)) + '</span>');
    const tagsHtml = tags.length ? '<div class="tags">' + tags.join('') + '</div>' : '';

    return '<section class="pass-hero"><div class="vp-head">'
      + avatarHtml
      + '<h1 class="name">' + esc(stripEmoji(name)) + '</h1>'
      + (bio ? '<p class="bio">' + esc(stripEmoji(bio)) + '</p>' : '')
      + tagsHtml
      + (data.hora_apertura ? horarioBadgeHtml(data) : '')
      + '</div></section>';
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
    const accent = opts.accent || data.theme && data.theme.primaryColor || data.color || '#E8A33D';
    container.innerHTML = '';

    if (data.theme && data.theme.primaryColor) {
      document.documentElement.style.setProperty('--primary-color', data.theme.primaryColor);
    }

    container.appendChild(renderElement(renderHeader(data, accent)));

    const blocks = Array.isArray(data.blocks) ? data.blocks : [];
    if (!blocks.length) {
      container.appendChild(renderElement('<div class="block-wrapper"><div class="block-text">Aún no hay contenido en esta tarjeta.</div></div>'));
      return;
    }
    blocks.forEach(function (b) {
      const html = renderBlock(b);
      if (html) container.appendChild(renderElement(html));
    });
    initCountdowns(container);
  }

  /**
   * Arranca el ticker de los bloques countdown dentro de un contenedor.
   * Auto-limpiable: si el nodo sale del DOM se detiene su intervalo (evita
   * fugas en el preview del editor, que se re-renderiza constantemente).
   */
  function initCountdowns(scope) {
    scope.querySelectorAll('.block-countdown[data-countdown]').forEach(function (box) {
      const target = Number(box.getAttribute('data-countdown')) || 0;
      function tick() {
        if (!box.isConnected) { clearInterval(box.__cdTimer); return; }
        const diff = Math.max(0, target - Date.now());
        const d = Math.floor(diff / 86400000);
        const h = Math.floor((diff % 86400000) / 3600000);
        const m = Math.floor((diff % 3600000) / 60000);
        const s = Math.floor((diff % 60000) / 1000);
        const pad = function (n) { return String(n).padStart(2, '0'); };
        const days = box.querySelector('.days');
        const hours = box.querySelector('.hours');
        const minutes = box.querySelector('.minutes');
        const seconds = box.querySelector('.seconds');
        if (days) days.textContent = pad(d);
        if (hours) hours.textContent = pad(h);
        if (minutes) minutes.textContent = pad(m);
        if (seconds) seconds.textContent = pad(s);
      }
      tick();
      box.__cdTimer = setInterval(tick, 1000);
    });
  }

  function renderElement(html) {
    const tpl = document.createElement('template');
    tpl.innerHTML = html.trim();
    return tpl.content.firstChild;
  }

  window.renderVynkProfile = renderVynkProfile;
  try {
    if (!window.VYNK_ICONS || Object.keys(window.VYNK_ICONS).length < Object.keys(ICONS).length) {
      window.VYNK_ICONS = ICONS;
    }
  } catch (e) { /* noop */ }
})();
