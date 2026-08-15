# VYNK Architecture Map

> Source of truth for the reconstruction. Update this doc whenever the architecture changes.

## Layers

VYNK splits into three layers. Each layer owns its files, states and contracts.

### 1. VYNK ID — the public experience
What everyone sees when a profile is shared.

| File | Role |
|---|---|
| `views/perfil-publico.html` | Public profile template rendered by the server |
| `public/js/vynk-renderer.js` | Client-side renderer — THE heart. Turns `profile` data into a complete ID experience |
| `public/css/vynk-cards.css` | Card/component styles consumed by both renderer AND editor |
| `public/js/vynk-icons.js` | Single consistent SVG icon system (shared by pages/renderer) |

Contract: `renderVynkProfile(container, data)` renders a full profile
(cards, QR, socials, actions, theme/variant). Data shape = the profile object.

### 2. VYNK STUDIO — the editor
Where the owner builds the experience. Lives at VYNK_EDITOR mode.

| File | Role |
|---|---|
| `views/editor.html` | Full editor UI |
| Editor styles engined by shared tokens + vynk-cards.css |
| Client code wires profile state -> live preview via `renderVynkProfile` |

Same renderer + same cards CSS => preview is always identical to the public page.

### 3. VYNK INTELLIGENCE — the server
Everything behind the scenes.

| Area | Files |
|---|---|
| HTTP server/routing | `server.js`, `routes/` |
| Business logic | `services/` |
| Data access | `database/` + lowdb/JSON store |
| Auth | middleware/services (SSO currently stubbed) |
| Intelligence | `services/ai/` (provider interface + DeterministicProvider activo) y `services/intelligence/` (motor VynkIntelligence: rules, palette, branding, layout, profile, insights, recommendations) |
| **Composition Engine** | `shared/vynk-composition.js` (isomórfico UMD: lo usa Node y el navegador vía `GET /js/vynk-composition.js`) — jerarquía §61-81 |
| Email | mailer service |
| Uploads | `uploads/` for photos/QR |

## Composition Engine (§61-82 — ventaja competitiva estructural)

Un solo módulo isomórfico (`shared/vynk-composition.js`) es la **fuente única de verdad** de la composición. Consumido por: motor de inteligencia (Node), renderer del editor (navegador) y página pública (SSR).

- **§61 jerarquía por contexto**: la tarjeta se compone como `IDENTIDAD → CTA → DOCK → CONTENIDO → INFORMACIÓN → CONTACTO → CONVERSIÓN → MÁS`, no como lista de botones.
- **§62 no todos los bloques son iguales**: clasificación semántica (`CONVERSION/SOCIAL/MEDIA/INFORMATION/CONTENT/UTILITY`) que cambia tamaño, posición y representación.
- **§63/§78 smart content types + card morphing**: `cta / dock / feature / media / location / schedule / payment / document / capture / text / note / action`.
- **§64-67 arquetipos**: creador / restaurante / profesional / empresa → layouts estructuralmente distintos (verificado por test §81).
- **§68 adaptive engine**: `buildComposition({tipo, blocks, density}) → {hero, dock, sections, more, density}`.
- **§69 density**: `minimal / balanced / rich / immersive` (auto-recomendada; override de usuario persistido en `perfiles.densidad`).
- **§70 smart priority 1-5**: inferida por bloque + refuerzos por tipo (el usuario no la ve).
- **§71 CTA contextual**: `Reservar mesa`, `Agendar consulta`, `Registrarme`, etc. según tipo.
- **§72 social dock**: redes → barra de iconos, nunca cards sueltas.
- **§73 content cards**: links ricos (og_image / título+subtítulo) → feature cards.
- **§69 overflow "Más"**: baja prioridad se oculta y es recuperable. La página pública renderiza `comp.more` igual que el editor (`<details class="comp-more">Más</details>`).
- La página pública (SSR vía `assemblePublicComposition`) emite `data-comp-density` en `<main class="vynk-public">` = densidad efectiva (override persistido en `perfiles.densidad` o auto-recomendada).
- Los bloques de ubicación se sustituyen por el mapa (`block-ubicaciones-map`) y se agrupan en la sección `information` junto al horario.
- `rules.js` re-exporta desde `shared/` (una sola fuente de verdad).

## Current state (post-audit)

### Strengths
- Renderer + editor shared the SAME card components (single story) — the main consistency win is in place.
- `public/css/tokens.css` centralizes design tokens with scales (spacing, radius, typography, shadows) and a styleguide.
- Server renders public pages server-side; renderer enhances/maintains experience.
- 21 tests pass (create/edit/save/share + intelligence determinística + composición §81 + SSR composición + densidad persistida).

### Problems
1. **Competing token declarations**: `dashboard.html`, `editor.html`, `legal.html`, `mapa` each re-declare `:root` tokens (some as `--vynk-bg`, others `--vynk-background`, `--vynk-facebook` / `--vynk-fb`). Multiple sources of truth.
2. **Inconsistent naming**: `--vynk-surface-2/3` vs semantic `--vynk-accent-soft`; radius free values (`22px`, `18px`, `980px`) instead of scale tokens.
3. **Duplicated UI atoms**: buttons, chips, toggles, dialogs, empty states, skeletons are re-implemented per page instead of living in the token/component layer.
4. **Page-specific tiles**: dashboard has bespoke insight/activity tiles; public page has its own tile markup — two homegrown card systems.
5. **Borders/focus**: mixed hairline approaches; focus states inconsistent across pages.
6. **Motion**: variable durations scattered inline; no shared motion tokens/timings.

## Target state

1. **ONE token layer** (`public/css/vynk-system.css` + `tokens.css` as the single import) with canonical semantic names:
   - Surfaces: `--vynk-bg`, `--vynk-surface`, `--vynk-surface-elevated`, `--vynk-surface-glass`
   - Text: `--vynk-text`, `--vynk-text-secondary`, `--vynk-text-tertiary`
   - State: `--vynk-accent`, `--vynk-accent-soft`, `--vynk-border`
   - Scales: radius `sm/md/lg/xl`, spacing `1/2/3/4/6/8`, shadows, typography, motion
2. **One component layer** (`vynk-components.css`) for buttons, chips, toggles, segmented, dialogs/popovers, sheets, inputs, skeletons, empty/error states, badges — imported by every app page AND the renderer.
3. **One renderer** (`vynk-renderer.js`) + **one card system** (`vynk-cards.css`) used by public page and editor preview. No page-specific card duplication.
4. **One icon system** (`vynk-icons.js`) with consistent stroke, sizes 16–48, states.
5. **Motion tokens** with 4 durations and standard eases; no inline magic numbers.
6. **Migration path**: additive first (new tokens alongside legacy), then migrate consumers page-by-page, then delete legacy tokens/atoms.

## Migration order (follows phases)

1. Design System (tokens + components + icons + motion) — additive, no breakage.
2. Renderer/cards — aligned to system.
3. Editor — consume system, remove local overrides.
4. Dashboard — consume system, remove local `:root`.
5. Share experience + QR + vCard.
6. Intelligence (Auto Design, Brand, Insights, Copilot) — ✅ determinística v1 (capa LLM-ready en `services/ai/`).
7. Auth (real SSO + linking) — ⏳ pendiente.
8. QA.

## Data contract (profile object)

Single shape produced by server, consumed by renderer. Kept central so server,
editor state, and preview all agree. (Do not fork shapes per page.)