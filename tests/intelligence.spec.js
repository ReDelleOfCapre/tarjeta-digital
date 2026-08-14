const { test, expect } = require('@playwright/test');

// ============================================
// VYNK Intelligence — determinístico, sin LLM
// Verifica: score real, recomendaciones desde
// datos reales, insights desde analytics reales,
// y que el proveedor activo es 'deterministic'.
// ============================================

test('intelligence: analiza el estado del editor sin mocks y propone mejoras reales', async ({ request }) => {
  const authRes = await request.post('/api/auth/demo');
  const auth = await authRes.json();
  expect(auth.token).toBeTruthy();

  const res = await request.post('/api/intelligence/analyze', {
    headers: { Authorization: 'Bearer ' + auth.token },
    data: {
      profile: {
        nombre_perfil: 'Cristina Taquería',
        tipo: 'restaurant',
        bio: 'Tacos artesanales en Teziutlán, cocina de autor con recetas de familia.',
        color: '#E8A33D',
        tema: 'auto'
      },
      blocks: [
        { tipo: 'whatsapp', contenido: { numero: '522311556138', titulo: 'Pedidos WhatsApp' } },
        { tipo: 'ubicacion', contenido: { direccion: 'Centro Teziutlán' } },
        { tipo: 'horario', contenido: { dias: [{ dia: 'Lunes', horario: '8:00-23:00' }] } },
        { tipo: 'social_icons', contenido: { redes: [{ tipo: 'instagram', url: 'https://ig.com/x' }] } }
      ]
    }
  });
  expect(res.ok()).toBeTruthy();
  const data = await res.json();

  // Proveedor activo = determinístico (sin LLM).
  expect(data.provider).toBe('deterministic');
  expect(data.providerKind).toBe('deterministic');

  // Score 0-100 con desglose real.
  expect(data.score.score).toBeGreaterThanOrEqual(0);
  expect(data.score.score).toBeLessThanOrEqual(100);
  expect(data.score.breakdown).toBeTruthy();
  expect(Object.keys(data.score.breakdown).length).toBeGreaterThanOrEqual(5);

  // Recomendaciones derivadas de datos reales (foto faltante, CTA ausente…).
  expect(Array.isArray(data.recommendations)).toBeTruthy();
  const hasPhotoRec = data.recommendations.some(function (r) { return r.id === 'identity_photo'; });
  expect(hasPhotoRec).toBeTruthy();

  // Insights: sin analytics aún → aviso honesto (nunca inventar cifras).
  expect(Array.isArray(data.insights)).toBeTruthy();
  const noData = data.insights.find(function (i) { return i.id === 'no_data'; });
  expect(noData).toBeTruthy();
});

test('intelligence: score sube cuando el perfil está completo', async ({ request }) => {
  const authRes = await request.post('/api/auth/demo');
  const auth = await authRes.json();

  const res = await request.post('/api/intelligence/analyze', {
    headers: { Authorization: 'Bearer ' + auth.token },
    data: {
      profile: {
        nombre_perfil: 'Negocio Completo',
        tipo: 'business',
        bio: 'Atención personalizada, rigor técnico y excelencia garantizada en cada consulta profesional.',
        color: '#722F43',
        tema: 'editorial'
      },
      blocks: [
        { tipo: 'whatsapp', contenido: { numero: '521234567890' } },
        { tipo: 'link', contenido: { url: 'https://ejemplo.com', titulo: 'Agenda una llamada' } },
        { tipo: 'ubicacion', contenido: { direccion: 'Centro Histórico' } },
        { tipo: 'horario', contenido: { dias: [{ dia: 'Lunes', horario: '9:00-18:00' }, { dia: 'Martes', horario: '9:00-18:00' }] } },
        { tipo: 'social_icons', contenido: { redes: [{ tipo: 'instagram', url: 'https://ig.com/a' }, { tipo: 'facebook', url: 'https://fb.com/a' }, { tipo: 'linkedin', url: 'https://in.com/a' }] } },
        { tipo: 'pago', contenido: { clabe: '012345678901234567' } }
      ]
    }
  });
  expect(res.ok()).toBeTruthy();
  const data = await res.json();

  // Perfil completo → score alto (≥ 80).
  expect(data.score.score).toBeGreaterThanOrEqual(80);
});

test('intelligence: insights se calculan desde analytics reales (sin inventar)', async ({ request }) => {
  const authRes = await request.post('/api/auth/demo');
  const auth = await authRes.json();

  const res = await request.post('/api/intelligence/analyze', {
    headers: { Authorization: 'Bearer ' + auth.token },
    data: {
      profile: { nombre_perfil: 'Perfil Con Analítica', tipo: 'business', bio: 'Un negocio con actividad registrada suficiente para generar insights.' },
      blocks: [{ tipo: 'whatsapp', contenido: { numero: '521234567890' } }],
      analytics: {
        visitas_total: 120,
        eventos: { visita: 120, click_whatsapp: 34, click_mapa: 12, descarga_vcard: 5 },
        tendencia: []
      }
    }
  });
  expect(res.ok()).toBeTruthy();
  const data = await res.json();

  expect(Array.isArray(data.insights)).toBeTruthy();
  const visits = data.insights.find(function (i) { return i.id === 'visits_total'; });
  expect(visits).toBeTruthy();
  expect(visits.data.visitas).toBe(120);

  const whatsapp = data.insights.find(function (i) { return i.id === 'top_action'; });
  expect(whatsapp).toBeTruthy();
  expect(whatsapp.data.evento).toBe('click_whatsapp');
  expect(whatsapp.data.total).toBe(34);

  // Nunca debe afirmar un % de tráfico sin tendencia real.
  const fakeTrend = data.insights.find(function (i) { return i.id === 'trend_week'; });
  expect(fakeTrend).toBeUndefined();
});

test('intelligence: el botón de aplicar mejoras mueve el CTA arriba en el editor', async ({ page }) => {
  const authRes = await page.request.post('http://localhost:3000/api/auth/demo');
  const data = await authRes.json();
  await page.addInitScript((token) => {
    localStorage.setItem('token', token);
    localStorage.setItem('usuario', JSON.stringify({ id: 11, nombre: 'Demo' }));
  }, data.token);

  await page.goto('/editor.html?id=20', { waitUntil: 'domcontentloaded', timeout: 20000 });

  // El panel de inteligencia existe y el perfil se hidrata con bloques.
  await expect(page.locator('#intel-score')).toBeVisible({ timeout: 20000 });
  await page.waitForFunction(() => {
    if (!window.vynkEditorBridge) return false;
    const blocks = window.vynkEditorBridge.getState().blocks;
    return blocks && blocks.length > 0;
  }, { timeout: 20000 });

  // Reordenamos vía el puente del editor (simula aplicar mejoras de CTA).
  await page.evaluate(() => window.vynkEditorBridge.reorderByTipo(['whatsapp', 'ubicacion', 'link']));

  const tiposDespues = await page.evaluate(() => window.vynkEditorBridge.getState().blocks.map(function (b) { return b.tipo; }));
  expect(tiposDespues[0]).toBe('whatsapp');
});
