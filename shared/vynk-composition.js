/* ============================================================
 * VYNK Composition Engine — motor de composición isomórfico.
 *
 * FUENTE ÚNICA DE VERDAD para la composición de la tarjeta:
 *  - Node (server):  require('../../shared/vynk-composition')
 *  - Navegador:      window.VynkComposition (via <script>)
 *
 * Traduce el manifiesto "Competitive Breakthrough":
 *   §61 jerarquía por contexto, no por orden de inserción
 *   §62 no todos los bloques son iguales (PRIMARY/SECONDARY/...)
 *   §63 smart content types (morphs con representación propia)
 *   §64-67 arquetipos distintos por tipo de negocio
 *   §68 adaptive composition engine (input → layout)
 *   §69 content density (minimal / balanced / rich / immersive)
 *   §70 smart priority 1–5 (inferida, el usuario no la edita)
 *   §71 CTA contextual por tipo
 *   §72 social dock (no convertir redes en cards)
 *   §73 content cards (no todo es botón)
 *   §78 card morphing (un bloque cambia de forma según contexto)
 *
 * Puro y determinístico: sin random, sin mocks, sin estado.
 * ============================================================ */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.VynkComposition = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* ------------------------- Tablas canónicas ------------------------- */

  // Aliases de tipo de perfil → tipo canónico.
  var TIPO_ALIASES = {
    negocio: 'business',
    negocio_local: 'business',
    restaurant: 'restaurant',
    restaurante: 'restaurant',
    creador: 'creator',
    creativo: 'creator',
    artista: 'artist',
    profesional: 'professional',
    portfolio: 'portfolio',
    evento: 'event',
    event: 'event',
    corporativo: 'corporate',
    corporate: 'corporate',
    personal: 'personal',
    otro: 'personal'
  };

  // Clasificación semántica de cada bloque (§62).
  var BLOCK_CLASSES = {
    whatsapp: 'CONVERSION',
    agendar: 'CONVERSION',
    link: 'CONVERSION',
    pago: 'CONVERSION',
    email_capture: 'CONVERSION',
    countdown: 'CONVERSION',
    seccion: 'INFORMATION',
    ubicacion: 'INFORMATION',
    ubicaciones: 'INFORMATION',
    horario: 'INFORMATION',
    social_icons: 'SOCIAL',
    spotify: 'MEDIA',
    youtube: 'MEDIA',
    tiktok: 'MEDIA',
    tweet: 'MEDIA',
    galeria: 'MEDIA',
    texto: 'CONTENT',
    nota: 'CONTENT',
    wishlist: 'CONTENT',
    pdf: 'UTILITY'
  };

  // Prioridad de bloques por tipo de perfil (composición ideal, en orden).
  var TIPO_BLOCK_PRIORITY = {
    business: ['whatsapp', 'agendar', 'link', 'pago', 'email_capture', 'horario', 'ubicacion', 'ubicaciones', 'seccion', 'social_icons', 'galeria', 'texto', 'nota', 'wishlist', 'countdown', 'pdf'],
    restaurant: ['whatsapp', 'agendar', 'link', 'ubicacion', 'ubicaciones', 'horario', 'pago', 'galeria', 'pdf', 'seccion', 'texto', 'social_icons', 'countdown'],
    creator: ['social_icons', 'link', 'galeria', 'youtube', 'tiktok', 'spotify', 'tweet', 'email_capture', 'seccion', 'texto', 'nota', 'wishlist', 'countdown'],
    artist: ['social_icons', 'galeria', 'link', 'spotify', 'youtube', 'email_capture', 'seccion', 'texto', 'wishlist', 'countdown'],
    professional: ['whatsapp', 'agendar', 'link', 'email_capture', 'horario', 'ubicacion', 'pdf', 'seccion', 'texto', 'social_icons'],
    portfolio: ['galeria', 'social_icons', 'link', 'youtube', 'tiktok', 'spotify', 'email_capture', 'seccion', 'texto', 'nota'],
    event: ['countdown', 'agendar', 'link', 'whatsapp', 'ubicacion', 'ubicaciones', 'pago', 'email_capture', 'seccion', 'social_icons', 'galeria', 'texto'],
    corporate: ['whatsapp', 'agendar', 'link', 'email_capture', 'horario', 'ubicacion', 'social_icons', 'pago', 'seccion', 'texto', 'galeria'],
    personal: ['link', 'social_icons', 'whatsapp', 'email_capture', 'seccion', 'texto', 'galeria', 'nota', 'wishlist']
  };

  // CTA recomendado por tipo (§71).
  var TIPO_PRIMARY_CTA = {
    business: 'whatsapp',
    restaurant: 'whatsapp',
    creator: 'link',
    artist: 'link',
    professional: 'agendar',
    portfolio: 'link',
    event: 'countdown',
    corporate: 'link',
    personal: 'link'
  };

  // Etiqueta del CTA hero por tipo (se prefiere el título del bloque).
  var CTA_LABELS = {
    business: 'Contactar',
    restaurant: 'Reservar mesa',
    creator: 'Ver contenido',
    artist: 'Ver portafolio',
    professional: 'Agendar consulta',
    portfolio: 'Ver portafolio',
    event: 'Registrarme',
    corporate: 'Contactar',
    personal: 'Contáctame'
  };

  // Etiquetas de sección por tipo (§61, §64-67).
  var SECTION_LABELS = {
    restaurant: { content: 'Especialidades', services: 'Pedidos', information: 'Información', contact: 'Contacto', conversion: 'Reserva', documents: 'Menú' },
    creator: { content: 'Contenido destacado', services: 'Enlaces', information: 'Info', contact: 'Contacto', conversion: 'Acción', documents: 'Descargas' },
    artist: { content: 'Trabajo destacado', services: 'Proyectos', information: 'Info', contact: 'Contacto', conversion: 'Acción', documents: 'Documentos' },
    professional: { content: 'Experiencia', services: 'Servicios', information: 'Datos', contact: 'Contacto', conversion: 'Agenda', documents: 'Documentos' },
    portfolio: { content: 'Portafolio', services: 'Proyectos', information: 'Info', contact: 'Contacto', conversion: 'Acción', documents: 'Documentos' },
    business: { content: 'Productos', services: 'Servicios', information: 'Datos', contact: 'Contacto', conversion: 'Ventas', documents: 'Catálogo' },
    corporate: { content: 'Contenido', services: 'Servicios', information: 'Información', contact: 'Contacto', conversion: 'Contacto', documents: 'Documentos' },
    event: { content: 'Sobre el evento', services: 'Detalles', information: 'Información', contact: 'Contacto', conversion: 'Registro', documents: 'Documentos' },
    personal: { content: 'Contenido', services: 'Enlaces', information: 'Info', contact: 'Contacto', conversion: 'Acción', documents: 'Documentos' }
  };

  // Umbrales de densidad (§69). immersive = mucho contenido visual.
  var DENSITY_THRESHOLDS = { minimal: 4, balanced: 10, rich: 18 };

  // Prioridad 1–5 base por bloque (§70).
  var BASE_PRIORITY = {
    whatsapp: 5, agendar: 5, pago: 4, countdown: 4, email_capture: 3,
    horario: 2, ubicacion: 2, ubicaciones: 2, seccion: 2,
    galeria: 2, youtube: 2, tiktok: 2, spotify: 2, tweet: 2,
    social_icons: 3, link: 3, pdf: 2, nota: 1, texto: 1, wishlist: 1
  };

  // Refuerzos por tipo (§70): el motor sabe qué importa en cada negocio.
  var TIPO_PRIORITY_BOOST = {
    restaurant: { horario: 4, ubicacion: 4, pdf: 3, galeria: 3 },
    business: { horario: 4, ubicacion: 4, galeria: 3, pago: 5 },
    professional: { horario: 3, ubicacion: 3, email_capture: 4, pdf: 3, whatsapp: 5 },
    corporate: { horario: 3, ubicacion: 3, pago: 4 },
    creator: { galeria: 4, youtube: 4, tiktok: 4, spotify: 4, email_capture: 3, whatsapp: 5 },
    artist: { galeria: 4, spotify: 4, youtube: 3 },
    portfolio: { galeria: 5, youtube: 3 },
    event: { countdown: 5, ubicacion: 4, pago: 4 }
  };

  // Palabras clave que convierten un link en CTA contextual (§71).
  var CTA_KEYWORDS = /reserv|compr|agend|cotiz|pedir|registr|suscrib|descarg|ver contenido|ver menú|ver menu|solicit|wa\.me|comprar|ordenar/gi;

  // Redes sociales reconocibles (§72). Orden estable del dock.
  var SOCIAL_ORDER = ['instagram', 'tiktok', 'youtube', 'facebook', 'linkedin', 'x', 'spotify', 'threads', 'telegram', 'snapchat', 'discord', 'twitch', 'pinterest', 'reddit', 'behance', 'dribbble', 'github', 'whatsapp', 'mail'];

  var SOCIAL_PATTERNS = [
    ['instagram', /instagram\.com|ig\.me/i],
    ['tiktok', /tiktok\.com/i],
    ['youtube', /youtube\.com|youtu\.be/i],
    ['facebook', /facebook\.com|fb\.com/i],
    ['linkedin', /linkedin\.com/i],
    ['x', /x\.com|twitter\.com/i],
    ['spotify', /spotify\.com/i],
    ['threads', /threads\.net/i],
    ['telegram', /t\.me|telegram/i],
    ['snapchat', /snapchat\.com/i],
    ['discord', /discord\.(gg|com)/i],
    ['twitch', /twitch\.tv/i],
    ['pinterest', /pinterest\./i],
    ['reddit', /reddit\.com/i],
    ['behance', /behance\.net/i],
    ['dribbble', /dribbble\.com/i],
    ['github', /github\.com/i]
  ];

  // Orden canónico de secciones (§61).
  var SECTION_KIND_ORDER = ['content', 'services', 'information', 'contact', 'conversion', 'documents'];

  /* ------------------------- Helpers puros ------------------------- */

  function normalizeTipo(tipo) {
    var t = String(tipo || '').toLowerCase().trim();
    return TIPO_ALIASES[t] || t || 'personal';
  }

  function blockClass(tipo) {
    return BLOCK_CLASSES[tipo] || 'CONTENT';
  }

  function priorityFor(tipo) {
    var t = normalizeTipo(tipo);
    return TIPO_BLOCK_PRIORITY[t] || TIPO_BLOCK_PRIORITY.personal;
  }

  function primaryCtaFor(tipo) {
    var t = normalizeTipo(tipo);
    return TIPO_PRIMARY_CTA[t] || 'link';
  }

  function normalizeBlocks(blocks) {
    if (!Array.isArray(blocks)) return [];
    return blocks.filter(Boolean).map(function (b, i) {
      var content = b.contenido || b.content || b.data || {};
      if (typeof content === 'string') {
        try { content = JSON.parse(content); } catch (e) { content = {}; }
      }
      return {
        id: b.id != null ? b.id : ('__b' + i),
        index: i,
        tipo: b.tipo || b.type || b.block_type || 'link',
        contenido: content,
        visible: b.visible === false || b.visible === 0 || b.visible === '0' ? false : true,
        orden: typeof b.orden === 'number' ? b.orden : i
      };
    }).filter(function (b) { return b.visible !== false; });
  }

  function detectSocial(url) {
    if (!url) return null;
    var u = String(url).trim();
    // Solo URLs web; mailto:/tel: no son redes (§72).
    if (!/^https?:\/\//i.test(u)) return null;
    for (var i = 0; i < SOCIAL_PATTERNS.length; i++) {
      if (SOCIAL_PATTERNS[i][1].test(u)) return SOCIAL_PATTERNS[i][0];
    }
    return null;
  }

  // ¿Un link parece un CTA contextual? (§71)
  function looksLikeCta(title, sub, url) {
    var haystack = String(title || '') + ' ' + String(sub || '') + ' ' + String(url || '');
    return CTA_KEYWORDS.test(haystack);
  }

  function smartPriority(block, tipo) {
    var t = normalizeTipo(tipo);
    var c = block.contenido || {};
    var tipo = block.tipo;
    var base = BASE_PRIORITY[tipo] != null ? BASE_PRIORITY[tipo] : 2;
    if (tipo === 'link') {
      if (looksLikeCta(c.titulo, c.subtitulo, c.url)) base = 5;
      else if (c.og_image || c.image || (c.titulo && c.subtitulo && c.url)) base = 4;
      else if (detectSocial(c.url)) base = 3;
      else base = 3;
    }
    var boost = (TIPO_PRIORITY_BOOST[t] && TIPO_PRIORITY_BOOST[t][tipo]) || 0;
    var p = base + boost;
    return Math.max(1, Math.min(5, p));
  }

  // Representación visual de cada bloque (§63, §78).
  function morphFor(block, tipo, opts) {
    var c = block.contenido || {};
    var url = c.url || '';
    var tipoB = block.tipo;
    opts = opts || {};

    if (tipoB === 'whatsapp') return opts.isPrimary ? 'cta' : 'contact';
    if (tipoB === 'agendar') return 'cta';
    if (tipoB === 'pago') return 'payment';
    if (tipoB === 'email_capture') return 'capture';
    if (tipoB === 'countdown') return 'countdown';
    if (tipoB === 'social_icons') return 'dock';
    if (tipoB === 'ubicacion' || tipoB === 'ubicaciones' || tipoB === 'location') return 'location';
    if (tipoB === 'horario') return 'schedule';
    if (tipoB === 'galeria') return 'gallery';
    if (tipoB === 'youtube' || tipoB === 'tiktok' || tipoB === 'spotify' || tipoB === 'tweet') return 'media';
    if (tipoB === 'pdf') return 'document';
    if (tipoB === 'texto') return 'text';
    if (tipoB === 'nota') return 'note';
    if (tipoB === 'seccion') return 'section';
    if (tipoB === 'wishlist') return 'action';
    if (tipoB === 'link') {
      if (detectSocial(url)) return 'social';
      if (looksLikeCta(c.titulo, c.subtitulo, url)) return opts.isPrimary ? 'cta' : 'service';
      if (c.og_image || c.image || (c.titulo && c.subtitulo && c.url)) return 'feature';
      return 'action';
    }
    return 'action';
  }

  // Densidad recomendada (§69): cuenta bloques + material visual.
  function recommendDensity(blocks, opts) {
    opts = opts || {};
    if (opts.density && opts.density !== 'auto' && opts.density !== 'recommended') {
      return { density: opts.density, recommended: false };
    }
    var count = blocks.length;
    var mediaCount = 0;
    blocks.forEach(function (b) {
      var c = b.contenido || {};
      var m = morphFor(b);
      if (m === 'gallery' || m === 'media') mediaCount += 1;
      if (m === 'gallery' && Array.isArray(c.imagenes)) mediaCount += Math.min(c.imagenes.length - 1, 2);
      if (m === 'feature' && (c.og_image || c.image)) mediaCount += 1;
    });
    var density = 'minimal';
    if (count > DENSITY_THRESHOLDS.rich) density = 'immersive';
    else if (count > DENSITY_THRESHOLDS.balanced) density = 'rich';
    else if (count > DENSITY_THRESHOLDS.minimal) density = 'balanced';
    if (count >= 8 && mediaCount >= 3) density = 'immersive';
    return { density: density, recommended: true };
  }

  /* ------------------------- Motor de composición ------------------------- */

  /**
   * Construye la composición de una tarjeta.
   * Input:  { tipo, blocks, density }
   * Output: { tipo, density, recommended, hero, dock, sections, more }
   */
  function buildComposition(input) {
    input = input || {};
    var tipo = normalizeTipo(input.tipo);
    var blocks = normalizeBlocks(input.blocks);
    var densityInfo = recommendDensity(blocks, { density: input.density });
    var density = densityInfo.density;

    // 1. Clasificar cada bloque (morph + prioridad + clase).
    var items = blocks.map(function (b) {
      return {
        block: b,
        tipo: b.tipo,
        class: blockClass(b.tipo),
        priority: smartPriority(b, tipo)
      };
    });

    // 2. Dock social (§72): extraer redes de social_icons + links sociales sueltos.
    var dockMap = {};
    items.forEach(function (it) {
      var c = it.block.contenido || {};
      if (it.tipo === 'social_icons' && Array.isArray(c.redes)) {
        c.redes.forEach(function (r) {
          if (r && r.tipo && r.url) {
            var net = r.tipo.toLowerCase();
            if (!dockMap[net]) dockMap[net] = { tipo: net, url: r.url, label: r.label || r.titulo || net, social: true };
          }
        });
      } else if (it.tipo === 'link') {
        var net = detectSocial(c.url);
        if (net) {
          dockMap[net] = dockMap[net] || { tipo: net, url: c.url, label: c.titulo || net, social: true };
          it.isSocial = true;
        }
      }
    });
    var dock = SOCIAL_ORDER.filter(function (n) { return dockMap[n]; }).map(function (n) { return dockMap[n]; });

    // 3. CTA hero contextual (§71): primer bloque de conversión ideal.
    var ideal = primaryCtaFor(tipo);
    var candidates = items.filter(function (it) {
      return it.class === 'CONVERSION' && !it.isSocial;
    }).sort(function (a, b) {
      return priorityFor(tipo).indexOf(a.tipo) - priorityFor(tipo).indexOf(b.tipo);
    });
    var heroItem = null;
    if (candidates.length) {
      heroItem = candidates.filter(function (it) { return it.tipo === ideal; })[0] || candidates[0];
    }
    var hero = null;
    if (heroItem) {
      heroItem.morph = morphFor(heroItem.block, tipo, { isPrimary: true });
      hero = {
        id: heroItem.block.id,
        tipo: heroItem.tipo,
        block: heroItem.block,
        morph: heroItem.morph,
        priority: heroItem.priority,
        label: heroItem.block.contenido.titulo || heroItem.block.contenido.texto || CTA_LABELS[tipo] || 'Contactar'
      };
    }

    // 4. Repartir el resto en secciones (§61, §64-67).
    var sectionItems = { content: [], services: [], information: [], contact: [], conversion: [], documents: [] };
    items.forEach(function (it) {
      if (hero && it.block.id === hero.id) return;
      if (it.tipo === 'social_icons' || it.isSocial) return; // ya en el dock
      var morph = morphFor(it.block, tipo);
      it.morph = morph;
      var c = it.block.contenido || {};
      switch (morph) {
        case 'gallery': case 'media': case 'feature': case 'text': case 'note': case 'section':
          sectionItems.content.push(it); break;
        case 'service':
          sectionItems.services.push(it); break;
        case 'location': case 'schedule':
          sectionItems.information.push(it); break;
        case 'contact':
          sectionItems.contact.push(it); break;
        case 'payment': case 'capture': case 'countdown': case 'action': case 'cta':
          sectionItems.conversion.push(it); break;
        case 'document':
          sectionItems.documents.push(it); break;
        default:
          sectionItems.conversion.push(it);
      }
    });

    // 5. Orden dentro de cada sección según prioridad ideal del tipo.
    var prioIndex = priorityFor(tipo);
    function byIdeal(a, b) {
      var ia = prioIndex.indexOf(a.tipo);
      var ib = prioIndex.indexOf(b.tipo);
      if (ia === -1) ia = 99;
      if (ib === -1) ib = 99;
      if (ia !== ib) return ia - ib;
      return b.priority - a.priority;
    }
    var sections = [];
    SECTION_KIND_ORDER.forEach(function (kind) {
      var list = sectionItems[kind];
      if (!list || !list.length) return;
      list.sort(byIdeal);
      sections.push({
        id: kind,
        kind: kind,
        label: (SECTION_LABELS[tipo] && SECTION_LABELS[tipo][kind]) || kind,
        items: list.map(function (it) {
          return { id: it.block.id, block: it.block, morph: it.morph, priority: it.priority };
        })
      });
    });

    // 6. Overflow "Más" (§69, §70): ocultar lo de menor prioridad según densidad.
    var more = [];
    var threshold = density === 'rich' ? 1 : (density === 'immersive' ? 0 : 1);
    sections = sections.map(function (sec) {
      var keep = [];
      sec.items.forEach(function (item) {
        var low = item.priority <= threshold && (item.morph === 'action' || item.morph === 'document' || item.morph === 'text' || item.morph === 'note' || item.morph === 'section');
        // El primer ítem de cada sección jamás va a "Más": vaciar una sección
        // haría desaparecer contenido visible (editor != público).
        if (density !== 'immersive' && low && more.length < 8 && keep.length > 0 && item !== sec.items[0]) {
          more.push(item);
        } else {
          keep.push(item);
        }
      });
      return { id: sec.id, kind: sec.kind, label: sec.label, items: keep };
    }).filter(function (sec) { return sec.items.length > 0; });

    return {
      tipo: tipo,
      density: density,
      recommended: densityInfo.recommended,
      hero: hero,
      dock: dock,
      sections: sections,
      more: more
    };
  }

  // Compatibilidad con layout.js del servidor.
  function contentDensity(blocks) {
    return recommendDensity(normalizeBlocks(blocks)).density;
  }

  return {
    buildComposition: buildComposition,
    recommendDensity: recommendDensity,
    contentDensity: contentDensity,
    normalizeTipo: normalizeTipo,
    blockClass: blockClass,
    priorityFor: priorityFor,
    primaryCtaFor: primaryCtaFor,
    smartPriority: smartPriority,
    morphFor: morphFor,
    detectSocial: detectSocial,
    normalizeBlocks: normalizeBlocks,
    /* tablas */
    TABLES: {
      TIPO_ALIASES: TIPO_ALIASES,
      BLOCK_CLASSES: BLOCK_CLASSES,
      TIPO_BLOCK_PRIORITY: TIPO_BLOCK_PRIORITY,
      TIPO_PRIMARY_CTA: TIPO_PRIMARY_CTA,
      SECTION_LABELS: SECTION_LABELS,
      DENSITY_THRESHOLDS: DENSITY_THRESHOLDS,
      CTA_LABELS: CTA_LABELS
    }
  };
});
