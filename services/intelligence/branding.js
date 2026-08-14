// ============================================
// VYNK Intelligence — branding.js
// Análisis de marca: logo/cover/foto → paleta,
// legibilidad, identidad cromática. Determinístico.
// ============================================

const palette = require('./palette');

// Analiza una marca a partir de colores extraídos de logo/cover/foto.
// Si hay logo, tiene prioridad; el cover es complemento; ambos se combinan.
function analyzeBrand(input) {
  const logoColors = (input && input.logoColors) || [];
  const coverColors = (input && input.coverColors) || [];
  const photoColors = (input && input.photoColors) || [];

  const source = logoColors.length
    ? palette.mergePalettes(logoColors, coverColors.length ? coverColors : photoColors)
    : palette.mergePalettes(coverColors, photoColors);

  const brandPalette = palette.buildBrandPalette(source);

  const stats = {
    temperature: palette.temperature(brandPalette.primary),
    saturation: palette.saturation(brandPalette.primary),
    luminance: palette.luminance(brandPalette.background),
    isDark: palette.isDark(brandPalette.background)
  };

  // Contraste de texto sobre el fondo y del acento sobre el fondo.
  const textContrast = palette.contrastRatio(brandPalette.text, brandPalette.background);
  const accentContrast = palette.contrastRatio(brandPalette.accent, brandPalette.background);

  // Coherencia de marca: cuántos colores fuente fueron utilizables.
  const used = new Set([brandPalette.primary, brandPalette.secondary].map(function (c) { return String(c).toUpperCase(); }));
  const brandCoverage = source.length ? Math.round((used.size / Math.max(source.length, 1)) * 100) : 0;

  return {
    hasLogo: logoColors.length > 0,
    hasCover: coverColors.length > 0,
    hasPhoto: photoColors.length > 0,
    sources: {
      logo: logoColors,
      cover: coverColors,
      photo: photoColors
    },
    palette: brandPalette,
    stats: {
      temperature: Math.round(stats.temperature * 100) / 100,
      saturation: Math.round(stats.saturation * 100),
      luminance: Math.round(stats.luminance * 100),
      isDark: stats.isDark
    },
    contrast: {
      text: Math.round(textContrast * 100) / 100,
      accent: Math.round(accentContrast * 100) / 100,
      textPassesAA: textContrast >= palette.CONTRAST.AA_TEXT,
      accentPassesAA: accentContrast >= palette.CONTRAST.AA_LARGE
    },
    brandCoverage: Math.min(brandCoverage, 100),
    recommendedTheme: palette.recommendThemeId(brandPalette)
  };
}

module.exports = { analyzeBrand };
