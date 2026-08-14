// ============================================
// VYNK AI — AIProvider (interfaz abstracta)
// ============================================
// Define el contrato que cualquier proveedor de inteligencia (determinístico
// o LLM) debe cumplir. El resto del producto solo conoce VynkIntelligence,
// nunca el proveedor concreto. En el futuro GeminiProvider/OpenAIProvider
// implementan estos mismos métodos sin tocar editor/renderer/dashboard.

class AIProvider {
  constructor(name) {
    if (new.target === AIProvider) {
      throw new Error('AIProvider es una interfaz: usa una implementación concreta (DeterministicProvider, GeminiProvider…).');
    }
    this.name = name || 'abstract';
  }

  /** Estado del proveedor: 'deterministic' | 'llm' */
  kind() {
    return 'unknown';
  }

  /** Indica si el proveedor está disponible y puede ser usado. */
  isAvailable() {
    return true;
  }

  /** Método abstracto: generar biografía a partir de datos reales del perfil. */
  async generateBio() {
    throw new Error(this.name + '.generateBio no implementado.');
  }

  /** Método abstracto: sugerir diseño (tema, paleta, layout). */
  async suggestDesign() {
    throw new Error(this.name + '.suggestDesign no implementado.');
  }

  /** Método abstracto: análisis de marca a partir de una paleta/imágenes. */
  async analyzeBrand() {
    throw new Error(this.name + '.analyzeBrand no implementado.');
  }

  /** Método abstracto: generar insights a partir de analytics reales. */
  async generateInsights() {
    throw new Error(this.name + '.generateInsights no implementado.');
  }

  /** Método abstracto: chat de soporte/asistente. */
  async chat() {
    throw new Error(this.name + '.chat no implementado.');
  }
}

module.exports = { AIProvider };
