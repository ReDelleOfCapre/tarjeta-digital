# VYNK UI/UX Design System & Behavioral Directives
Inspired by **Practical UI** (Adam Dannaway), **Don't Make Me Think** (Steve Krug), and **Lean UX** (Josh Seiden & Jeff Gothelf).

---

## 📘 1. Practical UI Principles (Adam Dannaway)
1. **Visual Hierarchy & Typography Scale**:
   - Establish an explicit 3-level type scale: Display (Space Grotesk 28-36px), Heading (Space Grotesk 18-24px), Body (Inter 14-16px), Micro (JetBrains Mono 10-12px).
   - Use contrast (font weight and color alpha) to signal importance before using font size changes.
2. **Action Hierarchy (CTA Distinction)**:
   - **Primary Action (Level 1)**: Single main action per screen (e.g. `Agendar Cita`, `Guardar y publicar`). Uses prominent fill, vibrant brand accent, subtle glow.
   - **Secondary Action (Level 2)**: Supporting actions (e.g. `Guardar Contacto (.vcf)`). Uses subtle glass background (`rgba(255,255,255,0.06)`), distinct border.
   - **Tertiary Action (Level 3)**: Secondary links or dismiss triggers. Uses ghost styling with text color transition on hover.
3. **Optical Alignment & Micro-Spacing Grid**:
   - Align elements using standard 4px/8px grid tokens (`gap: 8px`, `gap: 12px`, `gap: 16px`, `gap: 24px`).
   - Give text and buttons proportional internal padding so icons and labels look optically centered.

---

## 💡 2. Don't Make Me Think Principles (Steve Krug)
1. **Self-Explanatory Affordances**:
   - Interactive elements MUST look explicitly clickable with hover transforms (`transform: translateY(-2px)` or `scale(0.98)` on click).
   - Never rely on solitary ambiguous icons; pair icons with concise, self-explanatory text (e.g. `🧭 Cómo llegar (GPS)` instead of just a compass).
2. **Zero Cognitive Friction**:
   - Eliminate guesswork. Give immediate feedback on every user action (e.g. `¡Copiado! ✓`, `Agendando cita...`).
   - Use unmistakable status indicators (`🟢 Abierto ahora`, `🔴 Fuera de horario`).
3. **Visual Anchor & Scannability**:
   - Group related controls in clean Bento cards or grouped field sets with concise eyebrow titles.

---

## ⚡ 3. Lean UX Principles (Josh Seiden & Jeff Gothelf)
1. **Immediate Feedback & State Visibility**:
   - Every asynchronous request must show instantaneous feedback (button state disabled + loading text/spinner).
2. **Progressive Disclosure**:
   - Keep primary views simple and clean. Expose advanced details or secondary configuration via modals, accordion drawers, or tabbed views.
3. **Experimentation & Accessibility**:
   - Test layouts with Playwright E2E suites.
   - Maintain full contrast accessibility (WCAG AA) in both dark and light modes.
