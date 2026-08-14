// ============================================
// VYNK AI — index.js (fábrica de proveedores)
// ============================================
// Devuelve el proveedor activo. Por defecto y en v1
// siempre es DeterministicProvider. Cuando se active
// un LLM (env VYNK_AI_PROVIDER + API key) se usará
// Gemini/OpenAI sin que el resto del producto cambie.
// ============================================

const { DeterministicProvider } = require('./deterministic');
const { GeminiProvider } = require('./gemini');
const { OpenAIProvider } = require('./openai');

function getProvider() {
  const providerName = (process.env.VYNK_AI_PROVIDER || '').toLowerCase();

  if (providerName === 'gemini') {
    const provider = new GeminiProvider();
    if (provider.isAvailable()) return provider;
  }
  if (providerName === 'openai') {
    const provider = new OpenAIProvider();
    if (provider.isAvailable()) return provider;
  }

  // Fallback y default: proveedor determinístico (siempre disponible, gratis).
  return new DeterministicProvider();
}

module.exports = { getProvider, DeterministicProvider, GeminiProvider, OpenAIProvider };
