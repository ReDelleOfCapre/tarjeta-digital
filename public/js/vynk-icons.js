/**
 * VYNK — Sistema de iconos unificado (vynk-icons.js)
 * Única fuente de iconos SVG para todas las páginas (Dashboard, Editor,
 * Analytics, Compartir, etc.). Trazo consistente 1.8, viewBox 24, escala 1em.
 *
 * API:
 *   VYNK.path(name)             -> string de <path>/shapes (sin <svg>)
 *   vynkIcon(name, size)        -> string <svg> completo
 *   vynkIcon(name, {size:.})    -> forma objeto
 *
 * Regla: NUNCA definir iconos SVG fuera de este archivo.
 */

(function () {
  /* ------------------------------------------------------------------
     Registro canónico: name -> shapes (theme-safe, stroke 1.8, 24x24)
     ------------------------------------------------------------------ */
  var P = {
    /* Acciones */
    edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/>',
    eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/>',
    chart: '<path d="M4 20V10"/><path d="M10 20V4"/><path d="M16 20v-7"/><path d="M22 20H2"/>',
    share: '<circle cx="6" cy="12" r="2.1"/><circle cx="18" cy="6" r="2.1"/><circle cx="18" cy="18" r="2.1"/><path d="M8 10.8l8-4.6M8 13.2l8 4.6"/>',
    bolt: '<path d="M13 2L4 14h6l-1 8 9-12h-6l1-8z"/>',
    zap: '<path d="M13 2 4 14h6l-1 8 9-12h-6l1-8z"/>',
    close: '<path d="M6 6l12 12M18 6L6 18"/>',
    check: '<path d="M5 13l4 4L19 7"/>',
    alert: '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    chev: '<path d="M9 5l7 7-7 7"/>',
    chevronLeft: '<path d="M15 6l-6 6 6 6"/>',
    chevronRight: '<path d="M9 6l6 6-6 6"/>',
    arrowRight: '<path d="M5 12h14M13 5l7 7-7 7"/>',
    download: '<path d="M12 3v12"/><path d="M7 10l5 5 5-5"/><path d="M3 21h18"/>',
    trash: '<path d="M4 7h16"/><path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/><path d="M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13"/>',
    copy: '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/>',
    trash: '<path d="M4 7h16"/><path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/><path d="M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13"/>',
    qr: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3h-3z"/><path d="M21 14v3M14 21h4M18 18v3"/>',
    nfc: '<path d="M7 6a7 7 0 0 1 0 12"/><path d="M17 6a7 7 0 0 1 0 12"/><path d="M10.5 8.5a4.5 4.5 0 0 1 0 7"/><path d="M13.5 8.5a4.5 4.5 0 0 1 0 7"/>',
    wallet: '<rect x="2" y="6" width="20" height="14" rx="3"/><path d="M16 12h6"/><path d="M17 12a1.5 1.5 0 0 1 0 3h-1"/>',
    shareIos: '<path d="M12 4v11"/><path d="M8 8l4-4 4 4"/><path d="M4 13v5a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.01a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h.01a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.01a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',

    /* Comunicación */
    phone: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.13.96.36 1.9.7 2.8a2 2 0 0 1-.45 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.27a2 2 0 0 1 2.1-.45c.9.34 1.84.57 2.8.7A2 2 0 0 1 22 16.9z"/>',
    whatsapp: '<path d="M21 12a8 8 0 0 1-8 8H4l3-3a8 8 0 1 1 14-5z"/>',
    message: '<path d="M21 12a9 9 0 0 1-9 9H4l3-3a9 9 0 1 1 14-6z"/><path d="M8 9h8M8 13h5"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m4 7 8 6 8-6"/>',
    email: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m4 7 8 6 8-6"/>',
    send: '<path d="M22 2 11 13"/><path d="M22 2 15 22l-4-9-9-4z"/>',
    bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
    chat: '<path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>',

    /* Ubicación / tiempo */
    mapPin: '<path d="M12 21s7-7.5 7-12a7 7 0 1 0-14 0c0 4.5 7 12 7 12z"/><circle cx="12" cy="9" r="2.4"/>',
    navigation: '<path d="M3 11l19-8-8 19-2-8-9-3z"/>',
    clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
    calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
    gift: '<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13M5 12v9h14v-9M7 8a3 3 0 1 1 5 2 3 3 0 1 1 5-2"/>',
    school: '<path d="M22 10 12 5 2 10l10 5 10-5z"/><path d="M6 12v5c0 1.7 2.7 3 6 3s6-1.3 6-3v-5"/>',

    /* Contenido */
    link: '<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>',
    pdf: '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9l-6-6z"/><path d="M14 3v6h6M9 13h6M9 17h4"/>',
    image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21"/>',
    card: '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/><path d="M6 15h4"/>',
    note: '<path d="M12 2v9l4.5 4.5a1 1 0 0 1-.7 1.7H8.2a1 1 0 0 1-.7-1.7L12 11V2"/><path d="M8 21h8"/>',
    tag: '<path d="M20.6 13.4 12 22 2 12V2h10l8.6 8.6a2 2 0 0 1 0 2.8z"/><circle cx="7.5" cy="7.5" r="1.5"/>',
    play: '<path d="M6 3.5v17l14-8.5z"/>',
    star: '<path d="m12 3 2.9 5.9 6.1.9-4.5 4.3 1.1 6.1L12 17.8 6.4 20.2l1.1-6.1L3 9.8l6.1-.9z"/>',
    heart: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z"/>',
    bank: '<path d="M3 21h18"/><path d="M3 10h18"/><path d="M5 10V7h14v3M7 7V4h10v3"/><path d="M3 17h18"/>',
    shoppingBag: '<path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/>',
    book: '<path d="M2 5c2-1 5-1 7 0v14c-2-1-5-1-7 0V5z"/><path d="M22 5c-2-1-5-1-7 0v14c2-1 5-1 7 0V5z"/>',
    truck: '<rect x="1" y="7" width="13" height="9" rx="1"/><path d="M14 10h4l3 3v3h-7z"/><circle cx="5" cy="18" r="1.6"/><circle cx="17" cy="18" r="1.6"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4.5 5-6.5 8-6.5s6.5 2 8 6.5"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    briefcase: '<rect x="3" y="7" width="18" height="14" rx="2"/><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/>',
    utensils: '<path d="M3 2v7a2 2 0 0 0 4 0V2"/><path d="M5 2v20"/><path d="M16 2c-1.5 1-2 4-2 6s.5 4 2 5v9"/><path d="M16 2c1.5 1 2 4 2 6s-.5 4-2 5"/>',
    music: '<path d="M9 18V6l12-2v12"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
    film: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 4v16M17 4v16M3 9h4M3 15h4M17 9h4M17 15h4"/>',

    /* Redes sociales */
    instagram: '<rect x="3" y="6" width="18" height="14" rx="2"/><circle cx="12" cy="13" r="4"/><path d="M8.5 6l1-2h5l1 2"/>',
    tiktok: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
    twitter: '<path d="M4 4l16 16M20 4L4 20"/>',
    youtube: '<path d="M6 4l14 8-14 8V4z"/>',
    facebook: '<path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>',
    linkedin: '<path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4V9h4v1.5a6 6 0 0 1 2-1.5z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/>',
    spotify: '<circle cx="12" cy="12" r="10"/><path d="M7 9.5c3.6-1 7.3-.6 10 1.2M7.5 13.2c2.8-.8 5.7-.4 7.9 1M8.5 16.5c2-.5 4-.2 5.6 1"/>',
    github: '<path d="M9 9V5a3 3 0 1 0-3 3h4z"/><path d="M15 9V5a3 3 0 1 1 3 3h-4z"/><path d="M15 15v4a3 3 0 1 1-3-3h3z"/><path d="M9 15v4a3 3 0 1 0 3-3H9z"/>',
    globe: '<circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>',
    web: '<circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>',
    threads: '<circle cx="12" cy="12" r="2.5"/><path d="M12 2c4 0 6.5 2 6.5 5.5 0 2-1.2 3.2-2 3.7.8.5 2 1.7 2 3.7C18.5 18.5 16 20.5 12 20.5S5.5 18.5 5.5 15c0-1.4.5-2.5 1.3-3.5"/>',
    telegram: '<path d="m22 2-7 20-4-9-9-4z"/><path d="M22 2 11 13"/>',
    snapchat: '<path d="M12 2c2 0 3.5 1.6 4 4 .2 1 .6 1.6 1.3 2.2.5.4 1.2.5 1.8.4.4-.1.8.2.9.6.1.3-.1.6-.3.8-.7.7-2 .9-2.9 1.4-.4.2-.5.5-.4.9 0 .4.4.7 1 .9.9.4 2 .7 2.4 1.1.3.3.3.7 0 1-.3.3-1 .4-2 .4-.5 0-1 .1-1.4.3-.5.3-.6 1.1-1.7 1.1s-1.2-.8-1.7-1.1c-.4-.2-.9-.3-1.4-.3-1 0-1.7-.1-2-.4-.3-.3-.3-.7 0-1 .4-.4 1.5-.7 2.4-1.1.6-.2 1-.5 1-.9-.1-.4 0-.7-.4-.9-.9-.5-2.2-.7-2.9-1.4-.2-.2-.4-.5-.3-.8.1-.4.5-.7.9-.6.6.1 1.3 0 1.8-.4.7-.6 1.1-1.2 1.3-2.2.5-2.4 2-4 4-4z"/>',
    discord: '<path d="M18 7c-1.2-.6-2.5-1-3.8-1.1l-.5 1a11 11 0 0 0-3.4 0l-.5-1C8.5 6 7.2 6.4 6 7a17 17 0 0 0-2.7 13.4 13 13 0 0 0 4 2l.9-1.5c-.9-.3-1.8-.7-2.5-1.2l.6-.5a10 10 0 0 0 9.4 0l.6.5c-.7.5-1.6.9-2.5 1.2l.9 1.5a13 13 0 0 0 4-2A17 17 0 0 0 18 7z"/><path d="M9.5 12.5a1.2 1.2 0 1 0 0 2.4 1.2 1.2 0 0 0 0-2.4zM14.5 12.5a1.2 1.2 0 1 0 0 2.4 1.2 1.2 0 0 0 0-2.4z"/>',
    twitch: '<path d="M4 3h16v12l-4 4H11l-3 3v-3H4z"/><path d="M9 8v5M15 8v5"/>',
    appleMusic: '<path d="M9 18V6l12-2v12"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
    steam: '<circle cx="12" cy="12" r="9"/><path d="M5.5 15.5 3 18"/><path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/><circle cx="15.5" cy="9.5" r="1"/>',
    pinterest: '<circle cx="12" cy="12" r="10"/><path d="M12 8c-2 0-3.5 1.5-3.5 3.5 0 1.2.7 2.3 1.8 2.7"/><path d="M12 16l-1.5 4"/>',
    reddit: '<circle cx="12" cy="12" r="10"/><circle cx="9.5" cy="10.5" r="1.5"/><circle cx="14.5" cy="10.5" r="1.5"/><path d="M12 14c2 0 3 1.5 3 1.5s-1 1.5-3 1.5-3-1.5-3-1.5 1-1.5 3-1.5z"/>',
    behance: '<path d="M3 6h7M3 12h8M3 18h5"/><circle cx="15" cy="9" r="2"/><path d="M13 9h6M16 9v7c2 0 4-1 4-3 0-1.5-1.5-2.5-3-2.5"/>',
    dribbble: '<circle cx="12" cy="12" r="10"/><path d="M8 3.5a20 20 0 0 0 0 17"/><path d="M16 3a20 20 0 0 1 0 18"/><path d="M2.5 12h19"/>',

    /* IA / Inteligencia */
    sparkles: '<path d="M12 3l1.7 4.6 4.6 1.7-4.6 1.7L12 15.6l-1.7-4.6L5.7 9.3l4.6-1.7L12 3z"/><path d="M19 14l.9 2.4 2.4.9-2.4.9L19 20.6l-.9-2.4-2.4-.9 2.4-.9L19 14z"/>',
    palette: '<circle cx="13.5" cy="6.5" r="1.2"/><circle cx="17.5" cy="10.5" r="1.2"/><circle cx="8.5" cy="7.5" r="1.2"/><circle cx="6.5" cy="12.5" r="1.2"/><path d="M12 2a10 10 0 0 0 0 20c1.1 0 2-.9 2-2 0-.5-.2-.9-.5-1.3-.3-.3-.5-.8-.5-1.2a2 2 0 0 1 2-2h3a5 5 0 0 0 5-5C23 7 18.1 2 12 2z"/>',
    file: '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9l-6-6z"/><path d="M14 3v6h6M9 14h6M9 17h4"/>',
    target: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
    brain: '<path d="M9.5 3a2.5 2.5 0 0 1 2.5 2.5v13a2.5 2.5 0 0 1-5 0V8.5a2.5 2.5 0 0 1 2.5-2.5z"/><path d="M14.5 3a2.5 2.5 0 0 0-2.5 2.5v13a2.5 2.5 0 0 0 5 0V5.5A2.5 2.5 0 0 0 14.5 3z"/>'
  };

  /** Resolutor de dimensiones: vynkIcon('eye') | vynkIcon('eye', 18) | vynkIcon('eye', {size:18}) */
  function normSize(opt) {
    var s = 22;
    if (typeof opt === 'string') s = parseInt(opt, 10) || 22;
    else if (opt && typeof opt === 'object') s = parseInt(opt.size, 10) || 22;
    return isNaN(s) ? 22 : s;
  }

  function buildSvg(name, opt) {
    var size = normSize(opt);
    var shapes = P[name] || '';
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" '
      + 'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" '
      + 'style="width:' + size + 'px;height:' + size + 'px;flex-shrink:0">'
      + shapes + '</svg>';
  }

  /* Compat: dashboard usaba style width:1.1em — se mantiene funcional vía px */
  window.VYNK = { path: function (n) { return P[n] || ''; } };
  window.VYNK_ICONS = P;
  window.vynkIcon = function (name, opt) { return buildSvg(name, opt); };
})();