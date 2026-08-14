// ============================================
// VYNK Intelligence — index.js
// VynkIntelligence: motor determinístico de
// inteligencia de producto. Orquesta branding,
// paleta, layout, perfil, insights y sugerencias
// usando SIEMPRE datos reales. Sin mocks.
//
// UI → VynkIntelligence → Provider (Deterministic)
// En el futuro: → Provider (Gemini/OpenAI)
// El resto del producto no sabe qué proveedor usa.
// ============================================

const rules = require('./rules');
const palette = require('./palette');
const branding = require('./branding');
const layout = require('./layout');
const profile = require('./profile');
const insights = require('./insights');
const recommendations = require('./recommendations');

const { getProvider } = require('../ai');

class VynkIntelligence {
  constructor() {
    this.provider = getProvider();
  }

  // --- Construcción del contexto desde datos reales ---
  _context(input) {
    const ctx = input || {};
    const profileData = ctx.profile || {};
    const blocks = layout.normalizeBlocks(ctx.blocks);

    // BrandInfo derivado de la paleta declarada (logo/cover/foto ya extraídos).
    const rawColors = Array.isArray(ctx.colors) && ctx.colors.length
      ? ctx.colors
      : (profileData.color ? [profileData.color] : ['#E8A33D']);
    const brandInfo = branding.analyzeBrand({
      logoColors: ctx.logoColors || rawColors,
      coverColors: ctx.coverColors || [],
      photoColors: ctx.photoColors || []
    });

    return {
      profile: profileData,
      blocks,
      brandInfo,
      analytics: ctx.analytics || null
    };
  }

  // --- API pública ---
  analyzeProfile(input) {
    const c = this._context(input);
    return {
      profile: c.profile,
      blocks: c.blocks,
      brand: this.analyzeBrand(c),
      palette: this.analyzePalette(c),
      layout: this.recommendLayout(c),
      density: this.analyzeContentDensity(c),
      score: this.scoreProfile(c),
      recommendations: this.suggestImprovements(c),
      insights: this.calculateInsights(c)
    };
  }

  analyzeBrand(ctx) {
    const c = ctx && ctx.profile ? ctx : this._context(ctx);
    return c.brandInfo;
  }

  analyzePalette(ctx) {
    const c = ctx && ctx.profile ? ctx : this._context(ctx);
    return palette.analyzePalette(c.brandInfo.palette.source || [c.brandInfo.palette.primary]);
  }

  recommendTheme(ctx) {
    const c = ctx && ctx.profile ? ctx : this._context(ctx);
    return {
      themeId: c.brandInfo.recommendedTheme,
      accent: c.brandInfo.palette.accent,
      palette: c.brandInfo.palette
    };
  }

  recommendBlocks(ctx) {
    const c = ctx && ctx.profile ? ctx : this._context(ctx);
    return layout.recommendOrder(c.blocks, rules.normalizeTipo(c.profile.tipo || 'personal')).map(function (b) { return b.tipo; });
  }

  recommendLayout(ctx) {
    const c = ctx && ctx.profile ? ctx : this._context(ctx);
    return layout.analyzeLayout(c.blocks, rules.normalizeTipo(c.profile.tipo || 'personal'));
  }

  analyzeContentDensity(ctx) {
    const c = ctx && ctx.profile ? ctx : this._context(ctx);
    return layout.analyzeLayout(c.blocks, rules.normalizeTipo(c.profile.tipo || 'personal'));
  }

  calculateInsights(ctx) {
    const c = ctx && ctx.profile ? ctx : this._context(ctx);
    return insights.calculateInsights(c.analytics, c.profile, c.blocks);
  }

  scoreProfile(ctx) {
    const c = ctx && ctx.profile ? ctx : this._context(ctx);
    return profile.scoreProfile(c.profile, c.blocks, c.brandInfo);
  }

  suggestImprovements(ctx) {
    const c = ctx && ctx.profile ? ctx : this._context(ctx);
    return recommendations.suggestImprovements({
      profile: c.profile,
      blocks: c.blocks,
      brandInfo: c.brandInfo
    });
  }

  // --- Delegación a proveedor (para funcionalidad futura) ---
  async generateBio(input) {
    return this.provider.generateBio(input);
  }

  async chat(input) {
    return this.provider.chat(input);
  }

  providerName() {
    return this.provider.name;
  }

  providerKind() {
    return this.provider.kind();
  }
}

module.exports = { VynkIntelligence };
