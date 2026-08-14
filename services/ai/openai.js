// ============================================
// VYNK AI — OpenAIProvider (NO ACTIVO en v1)
// ============================================
// Esqueleto preparado para la fase 2 (LLM).
// No se instancia ni se llama mientras no se
// configure VYNK_AI_PROVIDER=openai + OPENAI_API_KEY.
// Implementa la misma interfaz que DeterministicProvider.
// ============================================

const { AIProvider } = require('./provider');

class OpenAIProvider extends AIProvider {
  constructor(config) {
    super('openai');
    this.apiKey = (config && config.apiKey) || process.env.OPENAI_API_KEY;
  }

  kind() {
    return 'llm';
  }

  isAvailable() {
    return !!(this.apiKey && process.env.VYNK_AI_PROVIDER === 'openai');
  }

  _assertAvailable() {
    if (!this.isAvailable()) {
      throw new Error('OpenAIProvider no está activo: configura VYNK_AI_PROVIDER=openai y OPENAI_API_KEY.');
    }
  }

  async generateBio() {
    this._assertAvailable();
    throw new Error('OpenAIProvider.generateBio aún no implementado.');
  }

  async suggestDesign() {
    this._assertAvailable();
    throw new Error('OpenAIProvider.suggestDesign aún no implementado.');
  }

  async analyzeBrand() {
    this._assertAvailable();
    throw new Error('OpenAIProvider.analyzeBrand aún no implementado.');
  }

  async generateInsights() {
    this._assertAvailable();
    throw new Error('OpenAIProvider.generateInsights aún no implementado.');
  }

  async chat() {
    this._assertAvailable();
    throw new Error('OpenAIProvider.chat aún no implementado.');
  }
}

module.exports = { OpenAIProvider };
