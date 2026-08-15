const { test, expect } = require('@playwright/test');
const C = require('../shared/vynk-composition');

// ============================================
// VYNK Composition Engine (§61-81)
// El diferenciador estructural frente a Linktree:
// jerarquía automática, dock social, CTA contextual,
// densidad y —crítico— 4 arquetipos que NO se ven igual.
// ============================================

const ARCHETYPES = {
  creator: [
    { id: 1, tipo: 'social_icons', contenido: { redes: [{ tipo: 'instagram', url: 'https://instagram.com/isradt' }, { tipo: 'tiktok', url: 'https://tiktok.com/isradt' }, { tipo: 'youtube', url: 'https://youtube.com/@isradt' }] } },
    { id: 2, tipo: 'link', contenido: { titulo: 'Contacto', url: 'mailto:hola@isradt.com' } },
    { id: 3, tipo: 'link', contenido: { titulo: 'Wallpapers para tu tablet', subtitulo: 'Descarga gratuita', url: 'https://isradt.com/wallpapers' } },
    { id: 4, tipo: 'link', contenido: { titulo: 'Blackview Fort 1 ML', subtitulo: 'Review del dispositivo', url: 'https://isradt.com/blackview' } }
  ],
  restaurant: [
    { id: 1, tipo: 'whatsapp', contenido: { numero: '521231231234', mensaje_default: 'Hola, quiero reservar una mesa' } },
    { id: 2, tipo: 'pdf', contenido: { titulo: 'Menú', subtitulo: 'PDF descargable', url: 'https://rest.com/menu.pdf' } },
    { id: 3, tipo: 'ubicacion', contenido: { titulo: 'Restaurante X', direccion: 'Centro histórico' } },
    { id: 4, tipo: 'social_icons', contenido: { redes: [{ tipo: 'instagram', url: 'https://instagram.com/restx' }] } },
    { id: 5, tipo: 'horario', contenido: { dias: [{ dia: 'Lunes', horario: '12:00-22:00' }] } },
    { id: 6, tipo: 'link', contenido: { titulo: 'Reservación', subtitulo: 'Disponible por WhatsApp', url: 'https://rest.com/reservar' } }
  ],
  professional: [
    { id: 1, tipo: 'agendar', contenido: { titulo: 'Agendar consulta', url: 'https://dra.com/agenda' } },
    { id: 2, tipo: 'link', contenido: { titulo: 'Especialidades', subtitulo: 'Derecho corporativo y fiscal', url: 'https://lic.com/esp' } },
    { id: 3, tipo: 'link', contenido: { titulo: 'Certificaciones', subtitulo: 'Colegio de abogados', url: 'https://lic.com/cert' } },
    { id: 4, tipo: 'whatsapp', contenido: { numero: '521231231234' } },
    { id: 5, tipo: 'ubicacion', contenido: { titulo: 'Oficina', direccion: 'Reforma 123' } },
    { id: 6, tipo: 'link', contenido: { titulo: 'LinkedIn', url: 'https://linkedin.com/in/lic' } }
  ],
  business: [
    { id: 1, tipo: 'whatsapp', contenido: { numero: '521231231234' } },
    { id: 2, tipo: 'link', contenido: { titulo: 'Catálogo de productos', subtitulo: 'Catálogo completo 2026', url: 'https://emp.com/catalogo' } },
    { id: 3, tipo: 'pago', contenido: { clabe: '012345678901234567', banco: 'BBVA' } },
    { id: 4, tipo: 'horario', contenido: { dias: [{ dia: 'Lunes', horario: '9:00-18:00' }] } },
    { id: 5, tipo: 'ubicaciones', contenido: { sucursales: [{ nombre: 'Sucursal Centro', direccion: 'Centro' }] } },
    { id: 6, tipo: 'social_icons', contenido: { redes: [{ tipo: 'facebook', url: 'https://facebook.com/emp' }] } },
    { id: 7, tipo: 'link', contenido: { titulo: 'Equipo', subtitulo: 'Conócenos', url: 'https://emp.com/equipo' } }
  ]
};

function sig(comp) {
  return JSON.stringify({
    hero: comp.hero ? comp.hero.tipo : null,
    dock: comp.dock.map(function (d) { return d.tipo; }),
    kinds: comp.sections.map(function (s) { return s.kind; }),
    labels: comp.sections.map(function (s) { return s.label; }),
    density: comp.density
  });
}

test('§81: los 4 arquetipos producen composiciones estructuralmente distintas', () => {
  const comps = {};
  Object.keys(ARCHETYPES).forEach(function (t) {
    comps[t] = C.buildComposition({ tipo: t, blocks: ARCHETYPES[t] });
  });

  const uniqueSigs = new Set(Object.keys(comps).map(function (t) { return sig(comps[t]); }));
  expect(uniqueSigs.size).toBe(4); // ninguno debe parecerse a otro

  // Restaurant (§65): hero whatsapp "Reservar mesa", horario + ubicación agrupados, menú.
  expect(comps.restaurant.hero.tipo).toBe('whatsapp');
  expect(comps.restaurant.hero.label).toBe('Reservar mesa');
  const restInfo = comps.restaurant.sections.find(function (s) { return s.kind === 'information'; });
  expect(restInfo).toBeTruthy();
  const restInfoTypes = restInfo.items.map(function (i) { return i.block.tipo; }).sort();
  expect(restInfoTypes).toEqual(['horario', 'ubicacion']);
  expect(comps.restaurant.sections.some(function (s) { return s.kind === 'documents'; })).toBeTruthy();

  // Profesional (§66): hero "Agendar consulta", experiencia + contacto + LinkedIn.
  expect(comps.professional.hero.tipo).toBe('agendar');
  expect(comps.professional.hero.label).toBe('Agendar consulta');
  expect(comps.professional.sections.some(function (s) { return s.kind === 'content'; })).toBeTruthy();
  const profContact = comps.professional.sections.find(function (s) { return s.kind === 'contact'; });
  expect(profContact).toBeTruthy();
  expect(profContact.items.some(function (i) { return i.block.tipo === 'whatsapp'; })).toBeTruthy();

  // Creador (§64): dock con las redes, sin hero agresivo; contenido destacado.
  const creatorDock = comps.creator.dock.map(function (d) { return d.tipo; });
  expect(creatorDock).toContain('instagram');
  expect(creatorDock).toContain('tiktok');
  expect(creatorDock).toContain('youtube');
  expect(comps.creator.sections.some(function (s) { return s.kind === 'content'; })).toBeTruthy();

  // Empresa (§67): CTA + catálogo + datos (horario/ubicaciones) + pago.
  expect(comps.business.hero.tipo).toBe('whatsapp');
  expect(comps.business.sections.some(function (s) { return s.kind === 'content'; })).toBeTruthy();
  const bizInfo = comps.business.sections.find(function (s) { return s.kind === 'information'; });
  expect(bizInfo).toBeTruthy();
  expect(bizInfo.items.some(function (i) { return i.block.tipo === 'pago' || i.block.tipo === 'ubicaciones' || i.block.tipo === 'horario'; })).toBeTruthy();
});

test('§69-70: la densidad recomienda y las prioridades empujan el CTA arriba', () => {
  const few = [{ id: 1, tipo: 'whatsapp', contenido: {} }, { id: 2, tipo: 'link', contenido: { url: 'https://a.com' } }];
  const richSet = [];
  for (let i = 0; i < 14; i++) richSet.push({ id: i + 1, tipo: i % 3 === 0 ? 'link' : (i % 3 === 1 ? 'texto' : 'nota'), contenido: { titulo: 'Item ' + i, url: 'https://a.com/' + i } });
  const immersiveSet = [];
  for (let i = 0; i < 24; i++) immersiveSet.push({ id: i + 1, tipo: i % 3 === 0 ? 'link' : (i % 3 === 1 ? 'galeria' : 'youtube'), contenido: { titulo: 'Item ' + i, url: 'https://a.com/' + i } });

  expect(C.buildComposition({ tipo: 'personal', blocks: few }).density).toBe('minimal');
  const rich = C.buildComposition({ tipo: 'personal', blocks: richSet });
  expect(rich.density).toBe('rich');
  expect(rich.more.length).toBeGreaterThan(0); // overflow "Más" (§69)
  const immersive = C.buildComposition({ tipo: 'personal', blocks: immersiveSet });
  expect(immersive.density).toBe('immersive');
  expect(immersive.more.length).toBe(0); // inmersivo: todo visible

  // Override explícito del usuario (§69): se respeta.
  const forced = C.buildComposition({ tipo: 'personal', blocks: immersiveSet, density: 'minimal' });
  expect(forced.density).toBe('minimal');
  expect(forced.recommended).toBe(false);

  // Prioridad (§70): whatsapp (5) > link (3) > texto (1).
  expect(C.smartPriority({ tipo: 'whatsapp', contenido: {} }, 'business')).toBe(5);
  expect(C.smartPriority({ tipo: 'texto', contenido: {} }, 'business')).toBe(1);
});

test('§72: mailto y tel no contaminan el dock social', () => {
  const comp = C.buildComposition({
    tipo: 'creator',
    blocks: [
      { id: 1, tipo: 'link', contenido: { titulo: 'Email', url: 'mailto:hola@isradt.com' } },
      { id: 2, tipo: 'link', contenido: { titulo: 'Llámame', url: 'tel:+521231231234' } },
      { id: 3, tipo: 'link', contenido: { titulo: 'Instagram', url: 'https://instagram.com/isradt' } }
    ]
  });
  const dockTipes = comp.dock.map(function (d) { return d.tipo; });
  expect(dockTipes).toEqual(['instagram']);
});

test('API: /api/intelligence/analyze expone composition', async ({ request }) => {
  const authRes = await request.post('/api/auth/demo');
  const auth = await authRes.json();
  expect(auth.token).toBeTruthy();

  const res = await request.post('/api/intelligence/analyze', {
    headers: { Authorization: 'Bearer ' + auth.token },
    data: {
      profile: { nombre_perfil: 'Restaurante X', tipo: 'restaurant' },
      blocks: [
        { tipo: 'whatsapp', contenido: { numero: '521231231234' } },
        { tipo: 'horario', contenido: { dias: [{ dia: 'Lunes', horario: '12:00-22:00' }] } },
        { tipo: 'ubicacion', contenido: { direccion: 'Centro' } },
        { tipo: 'social_icons', contenido: { redes: [{ tipo: 'instagram', url: 'https://instagram.com/r' }] } }
      ]
    }
  });
  expect(res.ok()).toBeTruthy();
  const data = await res.json();
  expect(data.composition).toBeTruthy();
  expect(data.composition.hero.tipo).toBe('whatsapp');
  expect(Array.isArray(data.composition.sections)).toBeTruthy();
  expect(data.composition.sections.length).toBeGreaterThan(0);
});

test('Editor: la vista previa compone con dock + CTA + secciones', async ({ page }) => {
  const authRes = await page.request.post('http://localhost:3000/api/auth/demo');
  const data = await authRes.json();
  await page.addInitScript((token) => {
    localStorage.setItem('token', token);
    localStorage.setItem('usuario', JSON.stringify({ id: 11, nombre: 'Demo' }));
  }, data.token);

  await page.goto('/editor.html?id=20', { waitUntil: 'domcontentloaded', timeout: 20000 });
  const canvas = page.locator('#vynk-preview');
  await expect(canvas).toHaveAttribute('data-comp-density', /minimal|balanced|rich|immersive/, { timeout: 20000 });

  // Composición activa: al menos una sección / CTA / dock en el lienzo.
  const hasComposition = await page.waitForFunction(function () {
    const el = document.getElementById('vynk-preview');
    return el && el.querySelector('.comp-section, .comp-hero-cta, .comp-dock');
  }, { timeout: 15000 }).then(function () { return true; }).catch(function () { return false; });
  expect(hasComposition).toBeTruthy();
});

test('Editor: cambiar densidad recompone la vista previa', async ({ page }) => {
  const authRes = await page.request.post('http://localhost:3000/api/auth/demo');
  const data = await authRes.json();
  await page.addInitScript((token) => {
    localStorage.setItem('token', token);
    localStorage.setItem('usuario', JSON.stringify({ id: 11, nombre: 'Demo' }));
  }, data.token);

  await page.goto('/editor.html?id=20', { waitUntil: 'domcontentloaded', timeout: 20000 });
  const canvas = page.locator('#vynk-preview');
  await expect(canvas).toHaveAttribute('data-comp-density', /.+/, { timeout: 20000 });

  await page.click('.vynk-density-opt[data-density="minimal"]');
  await expect(canvas).toHaveAttribute('data-comp-density', 'minimal', { timeout: 10000 });
  await page.click('.vynk-density-opt[data-density="immersive"]');
  await expect(canvas).toHaveAttribute('data-comp-density', 'immersive', { timeout: 10000 });
});

test('Public SSR: restaurante se compone con hero + dock + secciones etiquetadas', async ({ page, request }) => {
  const auth = await (await request.post('/api/auth/demo')).json();
  const headers = { Authorization: 'Bearer ' + auth.token };

  const res = await request.post('/api/perfiles', { headers, data: { nombre_perfil: 'Composición E2E ' + Date.now(), tipo: 'restaurant' } });
  expect(res.status()).toBe(201);
  const perfil = await res.json();

  try {
    const blocks = [
      { tipo: 'whatsapp', contenido: { numero: '521231231234', mensaje_default: 'Hola, quiero reservar una mesa' } },
      { tipo: 'horario', contenido: { dias: [{ dia: 'Lunes', horario: '12:00-22:00' }] } },
      { tipo: 'ubicacion', contenido: { titulo: 'Restaurante X', direccion: 'Centro histórico' } },
      { tipo: 'pdf', contenido: { titulo: 'Menú', url: 'https://rest.com/menu.pdf' } },
      { tipo: 'social_icons', contenido: { redes: [{ tipo: 'instagram', url: 'https://instagram.com/restx' }] } },
      { tipo: 'link', contenido: { titulo: 'Reservación', url: 'https://rest.com/reservar' } }
    ];
    for (const b of blocks) {
      const br = await request.post(`/api/perfiles/${perfil.id}/bloques`, { headers, data: b });
      expect(br.status()).toBe(201);
    }

    await page.goto('/u/' + perfil.slug, { waitUntil: 'domcontentloaded' });

    // §71 hero CTA: el whatsapp "Reservar mesa" queda PRIMERO.
    await expect(page.locator('.block-wrapper').first()).toHaveClass(/block-whatsapp/);

    // §72 dock social agrupado en sección propia, no cards sueltas.
    await expect(page.locator('.comp-section-social')).toHaveCount(1);
    await expect(page.locator('.comp-section-social')).toContainText('Síguenos');

    // §61/§68 secciones etiquetadas + horario y ubicación agrupados en "information".
    const labels = await page.locator('.comp-section-label').allTextContents();
    expect(labels.length).toBeGreaterThanOrEqual(2);
    const info = page.locator('.comp-section[data-comp-kind="information"]');
    await expect(info).toHaveCount(1);
    await expect(info.locator('.block-schedule')).toHaveCount(1);
    await expect(info.locator('.block-ubicaciones-map')).toHaveCount(1);
  } finally {
    await request.delete(`/api/perfiles/${perfil.id}`, { headers });
  }
});

test('Public SSR: la densidad persistida se respeta (Más vs todo visible)', async ({ page, request }) => {
  const auth = await (await request.post('/api/auth/demo')).json();
  const headers = { Authorization: 'Bearer ' + auth.token };

  const res = await request.post('/api/perfiles', { headers, data: { nombre_perfil: 'Densidad E2E ' + Date.now(), tipo: 'business' } });
  expect(res.status()).toBe(201);
  const perfil = await res.json();

  try {
    const blocks = [
      { tipo: 'whatsapp', contenido: { numero: '521231231234' } },
      { tipo: 'link', contenido: { titulo: 'Catálogo', subtitulo: 'Completo 2026', url: 'https://emp.com/catalogo' } },
      { tipo: 'horario', contenido: { dias: [{ dia: 'Lunes', horario: '9:00-18:00' }] } },
      { tipo: 'ubicacion', contenido: { titulo: 'Oficina', direccion: 'Centro' } }
    ];
    for (let i = 0; i < 10; i++) blocks.push({ tipo: i % 2 === 0 ? 'texto' : 'nota', contenido: { texto: 'Nota ' + i } });
    for (const b of blocks) {
      const br = await request.post(`/api/perfiles/${perfil.id}/bloques`, { headers, data: b });
      expect(br.status()).toBe(201);
    }

    // Densidad persistida = minimal → overflow "Más" recuperable (§69).
    const putMin = await request.put(`/api/perfiles/${perfil.id}`, { headers, data: { densidad: 'minimal' } });
    expect(putMin.status()).toBe(200);
    await page.goto('/u/' + perfil.slug, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('main.vynk-public')).toHaveAttribute('data-comp-density', 'minimal');
    await expect(page.locator('.comp-more')).toHaveCount(1);

    // Densidad persistida = immersive → todo visible, sin overflow.
    const putImm = await request.put(`/api/perfiles/${perfil.id}`, { headers, data: { densidad: 'immersive' } });
    expect(putImm.status()).toBe(200);
    await page.goto('/u/' + perfil.slug, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('main.vynk-public')).toHaveAttribute('data-comp-density', 'immersive');
    await expect(page.locator('.comp-more')).toHaveCount(0);
  } finally {
    await request.delete(`/api/perfiles/${perfil.id}`, { headers });
  }
});
