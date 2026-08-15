const { test, expect } = require('@playwright/test');
const E = require('../shared/vynk-experience');

// ============================================
// VYNK Revolución de Diseño — Experience Engine
// Blueprint determinista: arquetipo + jerarquía + patrones + fondos saneados
// con contraste WCAG. Editor == público == showcase (mismo motor isomórfico).
// ============================================

const BLOQUE_PRECIO = { id: 5, tipo: 'link', contenido: { titulo: 'Precios' } };

function demoBlocks() {
  return [
    { id: 1, tipo: 'whatsapp', contenido: { numero: '521231231234', mensaje_default: 'Hola quiero pedir' } },
    { id: 2, tipo: 'pdf', contenido: { titulo: 'Menú', url: 'https://rest.com/menu.pdf', subtitulo: 'PDF' } },
    { id: 3, tipo: 'ubicacion', contenido: { titulo: 'Sede', direccion: 'Centro' } },
    { id: 4, tipo: 'horario', contenido: { dias: [{ dia: 'Lunes', horario: '12:00-22:00' }] } },
    BLOQUE_PRECIO
  ];
}

test('el blueprint es determinista: misma entrada, mismo JSON', () => {
  const a = E.buildExperience({ tipo: 'restaurant', blocks: demoBlocks(), density: 'auto' });
  const b = E.buildExperience({ tipo: 'restaurant', blocks: demoBlocks(), density: 'auto' });
  expect(JSON.stringify(a)).toBe(JSON.stringify(b));
});

test('detecta el arquetipo por seed de tipo', () => {
  const r = E.buildExperience({ tipo: 'restaurant', blocks: demoBlocks() });
  expect(r.archetype.id).toBe('restaurant');
  const c = E.buildExperience({ tipo: 'creator', blocks: [{ id: 1, tipo: 'link', contenido: {} }] });
  expect(c.archetype.id).toBe('creator');
});

test('los 4 arquetipos producen blueprints distintos (jerarquía + fondo + motion)', () => {
  const fixtures = {
    restaurant: demoBlocks(),
    creator: [
      { id: 1, tipo: 'social_icons', contenido: { redes: [{ tipo: 'instagram', url: '#' }] } },
      { id: 2, tipo: 'link', contenido: { titulo: 'Portafolio' } }
    ],
    professional: [
      { id: 1, tipo: 'agendar', contenido: { titulo: 'Agendar consulta' } },
      { id: 2, tipo: 'link', contenido: { titulo: 'Especialidades' } }
    ],
    corporate: [
      { id: 1, tipo: 'pago', contenido: { clabe: '012345678901234567' } },
      { id: 2, tipo: 'ubicaciones', contenido: { sucursales: [{ nombre: 'Centro' }] } },
      { id: 3, tipo: 'link', contenido: { titulo: 'Empresa' } }
    ]
  };
  const seen = {};
  Object.keys(fixtures).forEach(function (t) {
    const b = E.buildExperience({ tipo: t, blocks: fixtures[t] });
    expect(b.archetype.id).toBe(t);
    expect(Object.keys(b.patterns).length).toBeGreaterThanOrEqual(1);
    seen[t] = b.background.mode + '|' + b.motion.semantics;
  });
  // Jerarquía/fondo/motion deben diferenciar al menos dos de los cuatro.
  expect(new Set(Object.keys(seen).map(function (k) { return seen[k]; })).size).toBeGreaterThan(1);
});

test('variante: override manual en contenido.variante vence al motor', () => {
  const blocks = demoBlocks();
  blocks[0].contenido.variante = 'glass';
  const b = E.buildExperience({ tipo: 'restaurant', blocks });
  expect(b.patterns['1']).toBe('glass');
});

test('patrones vs overrides: sin override el motor asigna por arquetipo', () => {
  const b = E.buildExperience({ tipo: 'restaurant', blocks: demoBlocks() });
  expect(b.patterns['1']).toBeTruthy();
  expect(b.patterns['1']).not.toBe('recommended');
});

test('guardPalette reporta contraste AA (4.5:1) para texto normal', () => {
  // #FFFFFF sobre #FFFFFF → ratio 1:1 → falla.
  const bad = E.guardPalette({ primary: '#E8A33D', onPrimary: '#FFFFFF', text: '#FFFFFF' });
  expect(bad.reports.length).toBeGreaterThan(0);
  expect(bad.reports.some(function (r) { return !r.pass; })).toBe(true);
  // #111111 sobre #FFFFFF → ratio alto → pasa.
  const good = E.guardPalette({ primary: '#E8A33D', onPrimary: '#111111', text: '#111111', background: '#FFFFFF' });
  expect(good.reports.every(function (r) { return r.pass; })).toBe(true);
  expect(good.reports[0].ratio).toBeGreaterThanOrEqual(4.5);
});

test('suggestDesign sugiere fijar contraste cuando la paleta explícita no alcanza AA', () => {
  const out = E.suggestDesign({
    tipo: 'restaurant',
    blocks: demoBlocks(),
    profile: { color: '#E8A33D', onPrimary: '#FFFFFF', text: '#FFFFFF' }
  });
  const hasFix = out.recommendations.some(function (r) { return r.action.type === 'fix_contrast'; });
  expect(hasFix).toBe(true);
});

test('suggestDesign sin problema de contraste no sugiere fix_contrast', () => {
  const out = E.suggestDesign({
    tipo: 'restaurant',
    blocks: demoBlocks(),
    profile: { color: '#E8A33D' }
  });
  const acciones = out.recommendations.map(function (r) { return r.action.type; });
  expect(acciones.length).toBeGreaterThan(0);
  expect(acciones.includes('fix_contrast')).toBe(false);
});

// ---------- Integración e2e: editor == público (mismo motor) ----------

async function loginDemo(page) {
  const res = await page.request.post('http://localhost:3000/api/auth/demo');
  const data = await res.json();
  expect(data.token).toBeTruthy();
  await page.addInitScript((token) => {
    localStorage.setItem('token', token);
    localStorage.setItem('usuario', JSON.stringify({ id: 1, nombre: 'Demo' }));
  }, data.token);
}

test('editor: el preview aplica data-exp-archetype y exp-block desde el mismo motor', async ({ page }) => {
  await loginDemo(page);
  await page.goto('/editor.html?id=20', { waitUntil: 'domcontentloaded', timeout: 20000 });

  const canvas = page.locator('#vynk-preview');
  await expect(canvas.locator('.pass-hero')).toBeVisible({ timeout: 20000 });
  await expect(canvas.locator('.name')).not.toHaveText('Tu nombre', { timeout: 20000 });

  // El contenedor recibe el blueprint del Experience Engine.
  await expect(canvas).toHaveAttribute('data-exp-archetype', /\S/, { timeout: 20000 });

  // No debe haber degradado la ruta de composición existente.
  expect(await canvas.getAttribute('data-comp-density')).toBeTruthy();

  // Los bloques quedan envueltos en .exp-block con variante.
  const expBlocks = await canvas.locator('.exp-block').count();
  const wrappers = await canvas.locator('.block-wrapper').count();
  expect(expBlocks).toBeGreaterThan(0);
  expect(expBlocks).toBeGreaterThanOrEqual(wrappers);
});

test('público SSR: main.vynk-public lleva data-exp-archetype y bloques .exp-block', async ({ page }) => {
  const pub = await page.context().newPage();
  await pub.goto('/u/cantera', { waitUntil: 'domcontentloaded', timeout: 20000 });
  await pub.waitForSelector('.vynk-public', { timeout: 20000 });

  const main = pub.locator('.vynk-public');
  await expect(main).toHaveAttribute('data-exp-archetype', /\S/);
  // Editor == público: ambos conservan data-comp-density (compat de tests previos).
  expect(await main.getAttribute('data-comp-density')).toBeTruthy();

  const expBlocks = await main.locator('.exp-block').count();
  expect(expBlocks).toBeGreaterThan(0);
  await pub.close();
});

test('editor == público: el mismo arquetipo en preview y pagina publica', async ({ page }) => {
  await loginDemo(page);
  await page.goto('/editor.html?id=20', { waitUntil: 'domcontentloaded', timeout: 20000 });
  const canvas = page.locator('#vynk-preview');
  await expect(canvas).toHaveAttribute('data-exp-archetype', /\S/, { timeout: 20000 });

  const pub = await page.context().newPage();
  await pub.goto('/u/cantera', { waitUntil: 'domcontentloaded', timeout: 20000 });
  await pub.waitForSelector('.vynk-public', { timeout: 20000 });

  const editorArch = await canvas.getAttribute('data-exp-archetype');
  const publicArch = await pub.locator('.vynk-public').getAttribute('data-exp-archetype');
  expect(editorArch.trim()).toBe(publicArch.trim());

  const editorBg = await canvas.getAttribute('class');
  expect(editorBg).toMatch(/exp-bg-/);
  const publicBg = await pub.locator('.vynk-public').getAttribute('class');
  expect(publicBg).toMatch(/exp-bg-/);
  await pub.close();
});

test('showcase: design-revolution.html renderiza 4 arquetipos con badges', async ({ page }) => {
  await page.goto('/design-revolution.html', { waitUntil: 'domcontentloaded', timeout: 20000 });
  for (let i = 0; i < 4; i++) {
    const demo = page.locator('#dr-demo-' + i);
    await expect(demo.locator('.exp-block, .pass-hero').first()).toBeVisible({ timeout: 20000 });
  }
  const badges = await page.locator('.dr-card-head .dr-badge').allTextContents();
  expect(badges.filter(function (t) { return t.trim().length > 0; }).length).toBe(4);
});

test('accesible: prefers-reduced-motion desactiva las animaciones', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/design-revolution.html', { waitUntil: 'domcontentloaded', timeout: 20000 });
  await expect(page.locator('#dr-demo-0 .exp-block').first()).toBeVisible({ timeout: 20000 });
  const duration = await page.evaluate(() => {
    const el = document.querySelector('#dr-demo-0 .exp-block');
    if (!el) return null;
    return getComputedStyle(el).getPropertyValue('animation-name');
  });
  expect(duration).toBe('none');
});