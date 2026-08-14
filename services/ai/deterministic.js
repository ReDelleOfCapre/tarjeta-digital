// ============================================
// VYNK AI — DeterministicProvider
// Único proveedor activo en v1. Implementa la
// interfaz AIProvider con lógica 100% determinística
// y datos reales. Sin LLM, sin API keys, sin costes.
// ============================================

const { AIProvider } = require('./provider');
const rules = require('../intelligence/rules');
const layout = require('../intelligence/layout');
const insightsLib = require('../intelligence/insights');

class DeterministicProvider extends AIProvider {
  constructor() {
    super('deterministic');
  }

  kind() {
    return 'deterministic';
  }

  isAvailable() {
    return true;
  }

  // Bio derivada del nombre y tipo reales del perfil.
  async generateBio(input) {
    const p = (input && input.profile) || {};
    const nombre = String(p.nombre_perfil || p.nombre || '').trim();
    const tipo = rules.normalizeTipo(p.tipo || 'personal');

    const templates = {
      business: 'Experiencia y servicio de primer nivel. Conéctate con nosotros en un solo toque.',
      restaurant: 'Cocina de autor y atención cercana. Reserva, visita o pide directo desde tu tarjeta.',
      creator: 'Contenido de alta fidelidad, estética propia y narrativa visual independiente.',
      artist: 'Proyectos sonoros y dirección creativa. Escucha nuestras producciones en tiempo real.',
      professional: 'Atención personalizada, rigor técnico y excelencia garantizada en cada consulta.',
      portfolio: 'Una selección de mis mejores trabajos, proyectos y colaboraciones.',
      event: 'Todo lo que necesitas para tu evento: fechas, accesos y confirmación en un solo lugar.',
      corporate: 'La presencia digital de nuestra organización: información, contacto y canales oficiales.',
      personal: 'Mi identidad digital: cómo conectar, seguir y conocerme.'
    };

    return {
      bio: (nombre ? nombre + ' — ' : '') + (templates[tipo] || templates.personal),
      provider: this.name,
      deterministic: true
    };
  }

  // Sugerencia de diseño: tema + acento + layout, calculados con reglas reales.
  async suggestDesign(input) {
    const c = {
      profile: (input && input.profile) || {},
      blocks: (input && input.blocks) || [],
      colors: (input && input.colors) || [],
      logoColors: (input && input.logoColors) || [],
      coverColors: (input && input.coverColors) || []
    };
    const palette = require('../intelligence/palette');
    const brand = require('../intelligence/branding').analyzeBrand({
      logoColors: c.logoColors.length ? c.logoColors : c.colors,
      coverColors: c.coverColors,
      photoColors: []
    });

    const ordered = layout.recommendOrder(layout.normalizeBlocks(c.blocks), rules.normalizeTipo(c.profile.tipo || 'personal'));
    return {
      themeId: brand.recommendedTheme,
      accent: brand.palette.accent,
      palette: brand.palette,
      order: ordered.map(function (b) { return b.tipo; }),
      provider: this.name,
      deterministic: true
    };
  }

  // Análisis de marca (delegado al módulo determinístico).
  async analyzeBrand(input) {
    const brand = require('../intelligence/branding').analyzeBrand(input || {});
    return Object.assign({}, brand, { provider: this.name, deterministic: true });
  }

  // Insights desde analytics reales (delegado).
  async generateInsights(input) {
    const analytics = (input && input.analytics) || null;
    const profile = (input && input.profile) || {};
    const blocks = (input && input.blocks) || [];
    const list = insightsLib.calculateInsights(analytics, profile, blocks);
    return {
      insights: list,
      provider: this.name,
      deterministic: true
    };
  }

  // Chat determinístico: respuestas basadas en reglas y datos reales del perfil.
  async chat(input) {
    const message = String((input && input.message) || '').toLowerCase();
    const profile = (input && input.profile) || {};
    const slug = profile.slug || '';

    if (message.includes('link') || message.includes('enlace') || message.includes('url')) {
      return { reply: 'Tu tarjeta pública está en ' + (slug ? '/u/' + slug : 'tu perfil'), provider: this.name };
    }
    if (message.includes('qr')) {
      return { reply: 'Tu QR se genera automáticamente desde el panel Compartir de tu tarjeta.', provider: this.name };
    }
    if (message.includes('nfc') || message.includes('fisica') || message.includes('tarjeta')) {
      return { reply: 'Puedes pedir tu tarjeta NFC física desde el dashboard (sección "Pedir Tarjeta Física NFC").', provider: this.name };
    }
    if (message.includes('cambio') || message.includes('actualiza') || message.includes('tema') || message.includes('color')) {
      return { reply: 'Abre tu identidad en el editor: ahí puedes cambiar tema, color y bloques; los cambios se guardan automáticamente.', provider: this.name };
    }
    return { reply: 'Puedo ayudarte con tu link, QR, tarjeta NFC física o cómo editar tu identidad. Escribe una de esas opciones.', provider: this.name };
  }
}

module.exports = { DeterministicProvider };
