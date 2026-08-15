# Revolución de Diseño · VYNK

Motor deterministic de experiencia que compone cada tarjeta con un arquetipo, una jerarquía y un patrón visual. Sin LLM, sin llamadas externas: las mismas reglas resuelven el editor, la página pública y el showcase (**editor == público == showcase**).

## Arquitectura

```
shared/vynk-experience.js   → motor isomórfico (Node + navegador, UMD)
shared/vynk-composition.js  → jerarquía estructural (hero, dock, secciones, densidad)
public/css/vynk-experience.css → capa visual ADITIVA, scoped bajo [data-exp-*]
public/js/vynk-renderer.js  → render cliente: aplica el blueprint al preview
routes/perfiles.js          → SSR: mismo blueprint en el main.vynk-public
routes/intelligence.js      → POST /api/intelligence/design ("Mejorar diseño")
public/design-revolution.html → showcase estático de 4 arquetipos
```

## Blueprint (`buildExperience`)

Salida 100% serializable (JSON) para que SSR y cliente generen el mismo HTML:

- `archetype {id, label, scores}` — `detectArchetype`: scoring determinista por
  tipos de bloque + keywords + seed por `tipo`. El override manual gana.
- `spine[]`, `zones[]` — jerarquía por arquetipo (PRIMARY/SECONDARY/CONTENT/UTILITY)
  y grilla por zona/densidad (`list`, `grid-2`, `bento`).
- `patterns {bloqueId → variante}` — `recommended`/`standard`/`compact`/`hero`/`glass`.
  Respetan el override del usuario en `contenido.variante`.
- `imageTreatment` — `none`, `blur`, `relief`, `editorial`.
- `background {mode, dark, glass, ornament}` — `solid`, `gradient`, `image` según
  arquetipo y densidad.
- `motion {semantics}` — motion cues (`standard`, `expressive`, `minimal`).
- `contrast` — guard WCAG AA: `safeOnColor` corrige texto sobre acento.

## Atributos en el HTML (SSR y editor)

El contenedor raíz (`main.vynk-public` en SSR, `#vynk-preview` en el editor) recibe:

```html
data-comp-density="balanced"        <!-- heredado, NUNCA se toca -->
data-exp-archetype="restaurant"
data-exp-scheme="light|dark"
data-exp-glass="medium|none"
data-exp-motion="standard|expressive|minimal"
data-exp-ornament="on|off"
data-exp-scale="standard|compact|large"
class="vynk-public exp-bg-gradient vynk-experience"
```

Cada bloque se envuelve en `<div class="exp-block exp-block--{variant}" data-exp-img="relief">…</div>`.
Las secciones llevan `exp-zone-{level}` y `data-exp-grid`.

## CSS aditivo

`vynk-experience.css` solo activa reglas bajo `[data-exp-archetype]` / `.exp-*`, de modo que
`vynk-cards.css` y `vynk-components.css` permanecen intactos. Incluye:

- Variantes `exp-block--standard|compact|hero|glass` (glass con `backdrop-filter`).
- Fondos `exp-bg-solid|gradient|image` (image con overlay `::before`).
- Motion `exp-rise`/`exp-fade` con stagger y `@media (prefers-reduced-motion: reduce)`.
- Grillas `@media (min-width:600px)` para `data-exp-grid="grid-2"`.
- Escala tipográfica `data-exp-scale`.

## "Mejorar diseño"

`POST /api/intelligence/design` (auth) → `suggestDesign` devuelve acciones accionables:

- `fix_contrast` — paleta explícita (onPrimary/text) que no alcanza AA 4.5.
- `set_background`, `set_ornament` — fondo/mood según densidad y banner.
- `promote_cta`, `compact_cta` — jerarquía de la sección primaria.
- `apply_patterns` — variantes recomendadas distintas a las actuales.
- `rebuild_blueprint` — fallback cuando el diseño ya está balanceado (nunca vacío).

## Variantes en el editor

En el formulario de bloque hay un select "Variante de diseño":
- **Automática** (vacío) → el motor asigna por arquetipo/zona.
- **Standard / Compacta / Hero / Glass** → override guardado en `contenido.variante`
  que vence al motor (incluido el hero de la composición).

## Tests

`tests/design.spec.js` (13): determinismo, detección de arquetipos, overrides,
contraste AA, SSR con `data-exp-archetype`, editor == público (mismo arquetipo y
`exp-bg-*`), showcase con 4 badges y reduced-motion. Suite completa: `npm test`
(34 tests, 21 preexistentes preservados).