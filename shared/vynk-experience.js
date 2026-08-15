/* ============================================================
 * VYNK Experience Engine — motor de diseño isomórfico (Revolución de Diseño).
 *
 * FUENTE ÚNICA DE VERDAD para las decisiones de "experiencia":
 *  - Node (server):   require('../../shared/vynk-experience')
 *  - Navegador:       window.VynkExperience (via GET /js/vynk-experience.js)
 *
 * Lo que DECIDE este motor, por reglas deterministas (sin LLM):
 *   §90 arquetipo de identidad (creator / restaurant / professional / corporate)
 *   §91 layout spine de secciones por arquetipo (orden maestro)
 *   §92 jerarquía visual por zona (PRIMARY/SECONDARY/CONTENT/UTILITY/SOCIAL/MEDIA/INFORMATION/CONVERSION)
 *   §93 patrón por bloque (variante: compact/standard/hero/glass + recommended)
 *   §94 grid layout por densidad (list / grid-2 / bento)
 *   §95 image treatment por bloque (none / blur / relief / editorial)
 *   §96 fondo por arquetipo (solid / gradient / image-derived) + dark mode
 *   §97 color mood + glass density + ornament
 *   §98 motion semantics (minimal / standard / expressive) con reduced-motion
 *   §99 contraste WCAG AA (guard determinista sobre la paleta)
 *
 * Output: blueprint 100% serializable (JSON). El renderer del cliente y el
 * renderer del servidor consumen el MISMO blueprint → editor == público.
 * Puro y determinístico: sin random, sin mocks, sin estado.
 * ============================================================ */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./vynk-composition'));
  } else {
    root.VynkExperience = factory(root.VynkComposition || {});
  }
})(typeof self !== 'undefined' ? self : this, function (composition) {
  'use strict';

  /* ------------------------- Helpers de color (CWAG AA) ------------------------- */

  function hexToRgb(hex) {
    let raw = String(hex || '').replace('#', '');
    if (raw.length === 3) raw = raw.split('').map(function (p) { return p + p; }).join('');
    const int = parseInt(raw, 16) || 0;
    return { r: (int >> 16) & 255, g: (int >> 8) & 255, b: int & 255 };
  }

  function rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(function (v) {
      const safe = Math.max(0, Math.min(255, Math.round(v)));
      return safe.toString(16).padStart(2, '0');
    }).join('').toUpperCase();
  }

  function mixHex(hexA, hexB, weight) {
    const a = hexToRgb(hexA);
    const b = hexToRgb(hexB);
    const ratio = typeof weight === 'number' ? Math.max(0, Math.min(1, weight)) : 0.5;
    return rgbToHex(
      a.r + (b.r - a.r) * ratio,
      a.g + (b.g - a.g) * ratio,
      a.b + (b.b - a.b) * ratio
    );
  }

  function luminance(hex) {
    const c = hexToRgb(hex);
    const f = function (v) {
      const s = v / 255;
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
  }

  function contrastRatio(fg, bg) {
    const l1 = luminance(fg);
    const l2 = luminance(bg);
    const hi = Math.max(l1, l2);
    const lo = Math.min(l1, l2);
    return (hi + 0.05) / (lo + 0.05);
  }

  function readableText(hex) {
    return luminance(hex) > 0.55 ? '#17151B' : '#FFF8F0';
  }

  function isDark(hex) {
    return luminance(hex) < 0.5;
  }

  // Guard determinista (§99): corrige el texto sobre el acento hasta cumplir AA.
  function safeOnColor(hex) {
    const dark = readableText(hex);
    const light = dark === '#FFF8F0' ? '#17151B' : '#FFF8F0';
    return contrastRatio(dark, hex) >= 4.5 ? dark : light;
  }

  function guardPalette(input) {
    const primary = input.primary || '#E8A33D';
    const background = input.background || (isDark(primary) ? '#17151B' : '#F5F1E7');
    const onPrimary = input.onPrimary || safeOnColor(primary);
    const text = input.text || (isDark(background) ? '#F8F4EF' : '#211D19');
    const muted = input.muted || mixHex(text, background, 0.42);
    const reports = [
      { pair: 'acento/onPrimary', ratio: Number(contrastRatio(onPrimary, primary).toFixed(2)), pass: contrastRatio(onPrimary, primary) >= 4.5 },
      { pair: 'fondo/texto', ratio: Number(contrastRatio(text, background).toFixed(2)), pass: contrastRatio(text, background) >= 4.5 }
    ];
    return { primary, background, surface: input.surface || '#FFFFFF', card: input.card || '#FFFFFF', onPrimary, text, muted, reports };
  }

  /* ------------------------- Arquetipos (§90) ------------------------- */

  // Evidencia determinista por tipo de bloque + palabras clave.
  const ARCHETYPE_EVIDENCE = {
    creator: { types: ['galeria', 'youtube', 'tiktok', 'spotify', 'tweet', 'social_icons'], boost: 3 },
    restaurant: { types: ['horario', 'pdf', 'whatsapp', 'ubicacion'], boost: 2, keywords: /menú|menu|reservar|reserva|tacos|platillos|especialidades|taquer|restaurante|antojitos|comida/i },
    professional: { types: ['agendar', 'email_capture'], boost: 3, keywords: /consult[a-z]*|asesor[a-z]*|abogad|licenciad|doctor|clínica|fiscal|jurídic|profesional|servicios/i },
    corporate: { types: ['pago', 'ubicaciones'], boost: 2, keywords: /corpora|empres[a-z]*|sucursal|es|sa de cv|grupo|comercial/i }
  };

  const TIPO_ARCHETYPE_SEED = {
    creator: 'creator', artista: 'creator', artist: 'creator', portfolio: 'creator',
    restaurante: 'restaurant', restaurant: 'restaurant', negocio_local: 'restaurant',
    profesional: 'professional', professional: 'professional',
    corporativo: 'corporate', corporate: 'corporate', negocio: 'corporate', business: 'corporate', evento: 'professional', event: 'professional',
    personal: 'personal', otro: 'personal'
  };

  function detectArchetype(input) {
    const tipo = (input && input.tipo) || 'personal';
    const blocks = Array.isArray(input && input.blocks) ? input.blocks : [];
    const profileText = String(((input && input.profile) || {}).bio || '') + ' ' + String(((input && input.profile) || {}).nombre_perfil || (input && input.profile && input.profile.nombre || ''));

    const scores = { creator: 0, restaurant: 0, professional: 0, corporate: 0 };
    const seed = TIPO_ARCHETYPE_SEED[tipo];
    if (seed && seed !== 'personal') scores[seed] += 2;

    blocks.forEach(function (b) {
      const t = (b && (b.tipo || b.type)) || '';
      const c = (b && (b.contenido || b.content || b.data)) || {};
      Object.keys(ARCHETYPE_EVIDENCE).forEach(function (arch) {
        const ev = ARCHETYPE_EVIDENCE[arch];
        if (ev.types.includes(t)) scores[arch] += ev.boost;
        const hay = String(c.titulo || '') + ' ' + String(c.descripcion || '') + ' ' + String(c.subtitulo || '') + ' ' + String(c.texto || '') + ' ' + String(c.url || '');
        if (ev.keywords && ev.keywords.test(hay)) scores[arch] += 2;
      });
      if (t === 'pdf') {
        const tit = String(c.titulo || '').toLowerCase();
        if (tit.includes('men')) scores.restaurant += 3;
        else scores.professional += 1;
      }
    });

    // Señales fuertes sobre anulan el seed débil.
    let best = seed !== 'personal' ? seed : 'creator';
    let bestScore = scores[best] || 0;
    Object.keys(scores).forEach(function (arch) {
      if (scores[arch] > bestScore) { best = arch; bestScore = scores[arch]; }
    });
    // Empates: si el seed es personal, prioriza contenido visual.
    if (bestScore === 0 && seed === 'personal') {
      const hasMedia = blocks.some(function (b) { return ARCHETYPE_EVIDENCE.creator.types.includes((b && b.tipo) || ''); });
      const hasCta = blocks.some(function (b) { return (b && (b.tipo === 'whatsapp' || b.tipo === 'agendar')); });
      best = hasCta ? 'corporate' : (hasMedia ? 'creator' : 'professional');
    }

    const labelMap = { creator: 'Creador', restaurant: 'Restaurante', professional: 'Profesional', corporate: 'Empresa' };
    return { id: best, label: labelMap[best] || best, scores };
  }

  /* ------------------------- Layout spine (§91) -------------------------
   * Orden maestro de zonas por arquetipo. Cada zona tiene peso de jerarquía
   * (§92). comp.sections queda reordenado según este spine. */
  const SPINE_BY_ARCHETYPE = {
    creator: ['conversion', 'media', 'content', 'social', 'information', 'services', 'documents', 'contact'],
    restaurant: ['conversion', 'content', 'information', 'services', 'social', 'documents', 'contact'],
    professional: ['conversion', 'contact', 'content', 'information', 'services', 'documents', 'social'],
    corporate: ['conversion', 'information', 'content', 'services', 'documents', 'contact', 'social']
  };

  const ZONE_HIERARCHY = {
    conversion: { level: 'PRIMARY', weight: 1 },
    media: { level: 'SECONDARY', weight: 2 },
    content: { level: 'CONTENT', weight: 3 },
    services: { level: 'CONTENT', weight: 3 },
    information: { level: 'INFORMATION', weight: 5 },
    social: { level: 'SOCIAL', weight: 6 },
    documents: { level: 'UTILITY', weight: 7 },
    contact: { level: 'CONTACT', weight: 4 }
  };

  function buildSpine(archetype) {
    const order = SPINE_BY_ARCHETYPE[archetype] || SPINE_BY_ARCHETYPE.professional;
    return order.map(function (kind, index) {
      const h = ZONE_HIERARCHY[kind] || { level: 'CONTENT', weight: 3 };
      return {
        kind: kind,
        index: index,
        level: h.level,
        order: h.weight,
        primary: h.level === 'PRIMARY',
        secondary: h.level === 'PRIMARY' || h.level === 'SECONDARY'
      };
    });
  }

  function kindIndex(kind, spine) {
    for (let i = 0; i < spine.length; i++) if (spine[i].kind === kind) return spine[i].index;
    return 999;
  }

  /* ------------------------- Patrones por bloque (§93) -------------------------
   * Variante recomendada por tipo+morph+zona. El usuario puede forzar
   * (compact|standard|hero|glass) en el editor; si pone 'recommended', se
   * usa esta recomendación determinista. */
  const VARIANT_OPTIONS = [
    { id: 'recommended', label: 'Recommended', short: 'Auto', hint: 'El motor elige por ti según identidad, jerarquía y contenido.' },
    { id: 'compact', label: 'Compact', short: 'Compacto', hint: 'Fila ligera: icono + título, mínimo ruido visual.' },
    { id: 'standard', label: 'Standard', short: 'Standard', hint: 'Card estándar con icono, título y subtítulo.' },
    { id: 'hero', label: 'Hero', short: 'Hero', hint: 'Card protagonista con mayor superficie y peso visual.' },
    { id: 'glass', label: 'Glass', short: 'Glass', hint: 'Superficie translúcida con blur — efecto liquid glass.' }
  ];

  const MORPH_TO_VARIANT = {
    cta: 'hero',
    payment: 'glass',
    capture: 'glass',
    countdown: 'glass',
    gallery: 'standard',
    media: 'hero',
    location: 'standard',
    schedule: 'standard',
    document: 'compact',
    contact: 'standard',
    dock: 'compact',
    feature: 'hero',
    service: 'standard',
    action: 'standard',
    text: 'compact',
    note: 'compact',
    section: 'compact',
    social: 'compact',
    default: 'standard'
  };

  // Ajustes por arquetipo sobre el patrón base.
  const ARCHETYPE_VARIANT_SHIFT = {
    creator: { media: 'hero', gallery: 'hero', feature: 'hero', action: 'glass' },
    restaurant: { cta: 'hero', feature: 'standard', schedule: 'standard', document: 'glass' },
    professional: { cta: 'hero', service: 'hero', capture: 'glass', contact: 'standard' },
    corporate: { payment: 'hero', schedule: 'standard', action: 'compact', feature: 'standard' }
  };

  function recommendedVariant(tipo, morph, archetype) {
    const base = MORPH_TO_VARIANT[morph] || MORPH_TO_VARIANT.default;
    const shift = (ARCHETYPE_VARIANT_SHIFT[archetype] || {})[morph];
    return shift || base;
  }

  function variantFor(block, zone, archetype) {
    const c = (block && (block.contenido || block.content || block.data)) || {};
    const forced = c.variante || c.pattern || block.variante;
    if (forced && forced !== 'recommended') {
      const known = VARIANT_OPTIONS.some(function (v) { return v.id === forced; });
      if (known) return forced;
    }
    let morph = 'default';
    try { morph = (composition.morphFor && composition.morphFor(block, archetype, {})) || 'default'; } catch (e) { morph = 'default'; }
    if (block._morph) morph = block._morph;
    if (zone && zone.level === 'PRIMARY' && morph !== 'gallery' && morph !== 'media') return 'hero';
    return recommendedVariant(block && block.tipo, morph, archetype);
  }

  /* ------------------------- Grid layout (§94) ------------------------- */

  const GRID_BY_DENSITY = {
    minimal: { content: 'list', services: 'list', information: 'list', media: 'list' },
    balanced: { content: 'grid-2', services: 'list', information: 'list', media: 'grid-2' },
    rich: { content: 'grid-2', services: 'grid-2', information: 'grid-2', media: 'bento' },
    immersive: { content: 'bento', services: 'grid-2', information: 'grid-2', media: 'bento' }
  };

  function gridFor(kind, density) {
    const d = GRID_BY_DENSITY[density] || GRID_BY_DENSITY.balanced;
    return d[kind] || 'list';
  }

  /* ------------------------- Image treatment (§95) ------------------------- */

  // none | blur (desenfoque ambiental) | relief (relieve/gradiente) | editorial
  function imageTreatmentFor(block, archetype, backgroundMode) {
    const c = (block && (block.contenido || block.content || block.data)) || {};
    const t = (block && (block.tipo || block.type)) || '';
    if (t === 'galeria') return 'editorial';
    if (t === 'youtube' || t === 'tiktok' || t === 'spotify') return 'none';
    if (t === 'ubicacion' || t === 'ubicaciones' || t === 'location') return 'relief';
    const hasImg = c.og_image || c.image || c.imagen;
    if (!hasImg) return 'none';
    if (backgroundMode === 'image') return 'blur';
    if (archetype === 'creator' || archetype === 'restaurant') return 'editorial';
    return 'relief';
  }

  /* ------------------------- Fondo (§96) + mood (§97) ------------------------- */

  const MOOD_THEMES = {
    auto: 'dynamic',
    ios: 'dynamic', coast: 'cool', graphite: 'neutral', velvet: 'warm',
    editorial: 'warm', forest: 'cool', sunset: 'warm', midnight: 'cool',
    champagne: 'warm', mint: 'cool', rose: 'warm', paper: 'neutral'
  };

  const ARCHETYPE_BG_MODE = {
    creator: 'gradient',
    restaurant: 'gradient',
    professional: 'gradient',
    corporate: 'solid'
  };

  const ARCHETYPE_GLASS = {
    creator: 'heavy',
    restaurant: 'light',
    professional: 'light',
    corporate: 'none'
  };

  function backgroundFor(archetype, density, profile, themeId) {
    const mode = ARCHETYPE_BG_MODE[archetype] || 'gradient';
    const glass = ARCHETYPE_GLASS[archetype] || 'light';
    const hasBanner = !!(profile && (profile.banner_url || profile.banner));
    const imageDerived = hasBanner && (density === 'rich' || density === 'immersive');
    const finalMode = imageDerived ? 'image' : mode;
    const mood = MOOD_THEMES[themeId] || 'dynamic';
    const extra = {};
    if (finalMode === 'image') extra.source = 'banner';
    if (finalMode === 'gradient') extra.angle = archetype === 'corporate' ? 120 : 135;
    return {
      mode: finalMode,
      glass: glass,
      mood: mood,
      dark: (density === 'rich' || density === 'immersive') || mood === 'cool' || mood === 'neutral',
      ornament: archetype !== 'corporate',
      ...extra
    };
  }

  /* ------------------------- Motion semantics (§98) ------------------------- */

  const ARCHETYPE_MOTION = {
    creator: 'expressive',
    restaurant: 'standard',
    professional: 'standard',
    corporate: 'minimal'
  };

  function motionFor(archetype) {
    return {
      semantics: ARCHETYPE_MOTION[archetype] || 'standard',
      reduceSafe: true
    };
  }

  /* ------------------------- Blueprint maestro ------------------------- */

  /**
   * buildExperience(input) → blueprint serializable.
   * Input: { tipo, blocks, density, profile }
   * El caller puede pasar además `comp` (buildComposition) para reusar.
   */
  function buildExperience(input) {
    input = input || {};
    const tipo = input.tipo || 'personal';
    const blocks = Array.isArray(input.blocks) ? input.blocks : [];
    const density = input.density || 'auto';
    const profile = input.profile || {};
    const themeId = input.themeId || profile.tema || 'auto';

    let comp = input.comp;
    if (!comp && composition && typeof composition.buildComposition === 'function') {
      try {
        comp = composition.buildComposition({ tipo, blocks, density: density === 'auto' ? undefined : density });
      } catch (e) { comp = null; }
    }

    // Arquetipo.
    const archetype = detectArchetype({ tipo, blocks, profile });

    // Spine + orden de secciones maestro (§91, §92).
    const spine = buildSpine(archetype.id);

    // Zonas resueltas sobre la composición real.
    const zones = [];
    if (comp && Array.isArray(comp.sections)) {
      const sorted = comp.sections.slice().sort(function (a, b) {
        return kindIndex(a.kind, spine) - kindIndex(b.kind, spine);
      });
      sorted.forEach(function (sec) {
        const spineEntry = spine.find(function (s) { return s.kind === sec.kind; });
        zones.push({
          kind: sec.kind,
          label: sec.label,
          level: spineEntry ? spineEntry.level : 'CONTENT',
          order: spineEntry ? spineEntry.order : 99,
          grid: gridFor(sec.kind, density),
          items: sec.items.map(function (it) {
            const b = it.block;
            return { id: it.id || (it.block && (it.block.id != null ? it.block.id : null)), tipo: b && b.tipo, morph: it.morph };
          })
        });
      });
    }

    // Patrones por bloque: { [bloqueId]: variante } + lista ordenada.
    const patterns = {};
    const patternByIndex = [];
    if (comp) {
      if (comp.hero) {
        const id = comp.hero.id != null ? String(comp.hero.id) : null;
        if (id) patterns[id] = 'hero';
      }
      const emitter = function (it, zoneLevel) {
        const b = it.block || it;
        let vid = null;
        if (it.id != null) vid = String(it.id);
        else if (b && b.id != null) vid = String(b.id);
        const variant = variantFor(b, { level: zoneLevel }, archetype.id);
        if (vid) patterns[vid] = variant;
        return variant;
      };
      (comp.sections || []).forEach(function (sec) {
        (sec.items || []).forEach(function (it) {
          const level = (spine.find(function (s) { return s.kind === sec.kind; }) || {}).level || 'CONTENT';
          emitter(it, level);
        });
      });
      (comp.more || []).forEach(function (it) { emitter(it, 'UTILITY'); });
    }

    // Fondo + mood + glass (§96-97).
    const bg = backgroundFor(archetype.id, density, profile, themeId);

    // Image treatment por bloque (§95).
    const imageTreatment = {};
    blocks.forEach(function (b) {
      const id = b.id != null ? String(b.id) : null;
      if (id) imageTreatment[id] = imageTreatmentFor(b, archetype.id, bg.mode);
    });

    // Motion (§98).
    const motion = motionFor(archetype.id);

    // Contraste WCAG (§99): paleta guardada con safe-on-color.
    const contrast = guardPalette({
      primary: profile.color || input.color || '#E8A33D',
      background: isDark(profile.color || '#E8A33D') ? '#17151B' : '#F5F1E7'
    });

    const blueprint = {
      engine: 'vynk-experience@1',
      archetype: archetype,
      density: density,
      spine: spine,
      zones: zones,
      patterns: patterns,
      grid: { byDensity: GRID_BY_DENSITY[density] || GRID_BY_DENSITY.balanced, perZone: zones.reduce(function (acc, z) { acc[z.kind] = z.grid; return acc; }, {}) },
      imageTreatment: imageTreatment,
      background: bg,
      motion: motion,
      contrast: contrast,
      scheme: bg.dark ? 'dark' : 'light'
    };
    return blueprint;
  }

  /* ------------------------- Sugerencias de diseño (no copy) ------------------------- */
  // "Mejorar diseño": recomendaciones 100% visuales derivadas del blueprint.

  function suggestDesign(input) {
    const exp = buildExperience(input);
    const profile = input.profile || {};
    const suggestions = [];
    const can = function (title, message, action) {
      return { id: 'design_' + suggestions.length + 1, level: 'info', title: title, message: message, action: action };
    };

    // Contraste.
    exp.contrast.reports.forEach(function (r) {
      if (!r.pass) {
        suggestions.push(can(
          'Contraste AA en ' + r.pair,
          'Tu paleta no alcanza WCAG AA (' + r.ratio + ':1). Se ajustará el texto sobre el acento.',
          { type: 'fix_contrast', pair: r.pair, expected: 4.5 }
        ));
      }
    });

    // Fondo.
    if (exp.background.mode === 'image' && !profile.banner_url) {
      suggestions.push(can('Fondo con imagen', 'Sugerimos un degradado derivado de tu color para mantener el mood.', { type: 'set_background', mode: 'gradient' }));
    }
    if (input.blocks && input.blocks.length > 8 && exp.background.ornament) {
      suggestions.push(can('Calma el fondo', 'Con mucho contenido, reducimos la ornamentación para proteger la jerarquía.', { type: 'set_ornament', on: false }));
    }

    // Jerarquía: sección PRIMARY debería existir.
    const hasPrimary = (exp.zones || []).some(function (z) { return z.level === 'PRIMARY'; });
    if (!hasPrimary && Array.isArray(input.blocks) && input.blocks.some(function (b) { return (b.tipo === 'whatsapp' || b.tipo === 'agendar' || b.tipo === 'link'); })) {
      suggestions.push(can('CTA principal', 'Tu arquetipo ' + exp.archetype.label + ' prioriza una acción primaria. La convertiremos en hero glass.', { type: 'promote_cta', archetype: exp.archetype.id }));
    }

    // Patrones recomendados distintos a lo que ya hay.
    return { blueprint: exp, recommendations: suggestions };
  }

  /* ------------------------- Exports ------------------------- */

  return {
    buildExperience: buildExperience,
    suggestDesign: suggestDesign,
    detectArchetype: detectArchetype,
    buildSpine: buildSpine,
    variantFor: variantFor,
    recommendedVariant: recommendedVariant,
    gridFor: gridFor,
    imageTreatmentFor: imageTreatmentFor,
    backgroundFor: backgroundFor,
    motionFor: motionFor,
    guardPalette: guardPalette,
    contrastRatio: contrastRatio,
    readableText: readableText,
    isDark: isDark,
    VARIANT_OPTIONS: VARIANT_OPTIONS,
    TABLES: {
      ARCHETYPE_EVIDENCE: ARCHETYPE_EVIDENCE,
      SPINE_BY_ARCHETYPE: SPINE_BY_ARCHETYPE,
      ZONE_HIERARCHY: ZONE_HIERARCHY,
      GRID_BY_DENSITY: GRID_BY_DENSITY
    }
  };
});