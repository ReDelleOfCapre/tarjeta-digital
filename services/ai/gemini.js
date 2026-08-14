// ============================================
// VYNK AI — GeminiProvider (NO ACTIVO en v1)
// ============================================
// Esqueleto preparado para la fase 2 (LLM).
// No se instancia ni se llama mientras no se
// configure VYNK_AI_PROVIDER=gemini + GEMINI_API_KEY.
// Implementa la misma interfaz que DeterministicProvider
// para que el resto del producto no cambie.
// ============================================

const { AIProvider } = require('./provider');

class GeminiProvider extends AIProvider {
  constructor(config) {
    super('gemini');
    this.apiKey = (config && config.apiKey) || process.env.GEMINI_API_KEY;
  }

  kind() {
    return 'llm';
  }

  isAvailable() {
    return !!(this.apiKey && process.env.VYNK_AI_PROVIDER === 'gemini');
  }

  _assertAvailable() {
    if (!this.isAvailable()) {
      throw new Error('GeminiProvider no está activo: configura VYNK_AI_PROVIDER=gemini y GEMINI_API_KEY.');
    }
  }

  async generateBio() {
    this._assertAvailable();
    throw new Error('GeminiProvider.generateBio aún no implementado.');
  }

  async suggestDesign() {
    this._assertAvailable();
    throw new Error('GeminiProvider.suggestDesign aún no implementado.');
  }

  async analyzeBrand() {
    this._assertAvailable();
    throw new Error('GeminiProvider.analyzeBrand aún no implementado.');
  }

  async generateInsights() {
    this._assertAvailable();
    throw new Error('GeminiProvider.generateInsights aún no implementado.');
  }

  async chat() {
    this._assertAvailable();
    throw new Error('GeminiProvider.chat aún no implementado.');
  }
}

module.exports = { GeminiProvider };
