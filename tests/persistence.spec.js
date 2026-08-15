const { test, expect } = require('@playwright/test');

// ============================================
// VYNK — FIX CRÍTICO DE PERSISTENCIA DEL EDITOR
// Prueba editor == DB == público SIN mocks y SIN localStorage como fuente de verdad.
// La BD es la fuente de verdad: cada test crea un perfil REAL por UI y verifica
// contra la BD a través de la API (Bearer token) y contra la página pública.
// ============================================

const BASE = 'http://localhost:3000';

async function loginDemo(page) {
  const res = await page.request.post(BASE + '/api/auth/demo');
  const data = await res.json();
  expect(data.token).toBeTruthy();
  await page.addInitScript((token) => {
    localStorage.setItem('token', token);
    localStorage.setItem('usuario', JSON.stringify({ id: 1, nombre: 'Demo', plan: 'paid', role: 'admin' }));
  }, data.token);
  return data.token;
}

// Espera a que el estado de guardado llegue a "saved".
async function waitSaved(page, timeout = 25000) {
  await page.waitForFunction(function () {
    const el = document.getElementById('save-status');
    return el && el.getAttribute('data-state') === 'saved';
  }, {}, { timeout: timeout });
}

// Crea un perfil nuevo real. Devuelve el id del perfil.
async function createProfile(page, token, nombre) {
  await page.goto('/editor.html', { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.locator('#nombre_perfil').fill(nombre);
  await page.evaluate(() => window.goStep && window.goStep(3));
  await waitSaved(page);
  const id = await page.evaluate(() => {
    const url = new URL(location.href);
    return url.searchParams.get('id');
  });
  expect(Number(id)).toBeGreaterThan(0);
  return Number(id);
}

async function apiGet(token, url) {
  const res = await fetch(BASE + url, { headers: { Authorization: 'Bearer ' + token } });
  expect(res.ok).toBeTruthy();
  return res.json();
}

async function getProfile(token, id) {
  return apiGet(token, '/api/perfiles/' + id);
}

async function getBlocks(token, id) {
  return apiGet(token, '/api/perfiles/' + id + '/bloques');
}

async function addBlockViaUI(page, tipo, values) {
  await page.locator('.block-chip[data-block-type="' + tipo + '"]').first().click();
  const area = page.locator('#block-form-area');
  await expect(area).toBeVisible();
  for (const [field, value] of Object.entries(values)) {
    await area.locator('#' + field).fill(value);
  }
  await area.locator('button:has-text("Agregar bloque")').click();
  await expect(area).toBeHidden();
}

// Accede al formulario de edición de un bloque (índice en la lista).
function blockRow(page, index) {
  return page.locator('#block-list .block-item-row').nth(index);
}

// ============================================================
// TEST 1 — El nombre se guarda solo con autosave → BD
// ============================================================
test('TEST 1: cambiar el nombre del perfil persiste en BD con solo autosave', async ({ page }) => {
  const token = await loginDemo(page);
  const nombre = 'Persistencia Nombre ' + Date.now();
  const id = await createProfile(page, token, nombre);

  const profile = await getProfile(token, id);
  expect(profile.nombre_perfil).toBe(nombre);

  // Sin ningún clic en "Guardar": solo autosave, y se confirma via BD.
  const url = page.url();
  expect(url).toContain('id=' + id);
});

// ============================================================
// TEST 2 — La bio se guarda con autosave → BD
// ============================================================
test('TEST 2: editar la bio persiste en BD con autosave', async ({ page }) => {
  const token = await loginDemo(page);
  const id = await createProfile(page, token, 'Persistencia Bio ' + Date.now());
  await page.goto('/editor.html?id=' + id, { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.waitForFunction(function () {
    const el = document.getElementById('save-status');
    return el && el.getAttribute('data-state') === 'saved';
  }, {}, { timeout: 20000 });

  const bio = 'Nueva narrativa generada y persistida ' + Date.now();
  await page.locator('#bio_perfil').fill(bio);
  await page.waitForFunction(function () {
    const el = document.getElementById('save-status');
    return el && el.getAttribute('data-state') === 'dirty';
  }, {}, { timeout: 10000 });
  await waitSaved(page);

  const profile = await getProfile(token, id);
  expect(profile.bio).toBe(bio);
});

// ============================================================
// TEST 3 — Tema y color se guardan → BD
// ============================================================
test('TEST 3: cambiar tema y color persiste en BD', async ({ page }) => {
  const token = await loginDemo(page);
  const id = await createProfile(page, token, 'Persistencia Tema ' + Date.now());
  await page.evaluate(() => window.goStep && window.goStep(2));

  await page.locator('.theme-card[data-theme-id="editorial"]').click();
  await page.locator('.color-option[data-color="#7C3AED"]').click();
  await waitSaved(page);

  const profile = await getProfile(token, id);
  expect(profile.tema).toBe('editorial');
  expect(profile.color).toBe('#7C3AED');
});

// ============================================================
// TEST 4 — Agregar bloque se guarda → BD
// ============================================================
test('TEST 4: agregar un bloque texto persiste en BD', async ({ page }) => {
  const token = await loginDemo(page);
  const id = await createProfile(page, token, 'Persistencia Bloque ' + Date.now());

  await page.evaluate(() => window.goStep && window.goStep(3));
  await addBlockViaUI(page, 'texto', { 'bf-texto': 'Hola mundo persistente' });
  await waitSaved(page);

  const blocks = await getBlocks(token, id);
  expect(blocks.length).toBe(1);
  const contenido = JSON.parse(blocks[0].contenido);
  expect(contenido.texto).toBe('Hola mundo persistente');
  expect(blocks[0].visible).toBe(1);
});

// ============================================================
// TEST 5 — Editar bloque se guarda → BD
// ============================================================
test('TEST 5: editar el contenido de un bloque persiste en BD', async ({ page }) => {
  const token = await loginDemo(page);
  const id = await createProfile(page, token, 'Persistencia Editar ' + Date.now());

  await page.evaluate(() => window.goStep && window.goStep(3));
  await addBlockViaUI(page, 'texto', { 'bf-texto': 'Versión uno' });
  await waitSaved(page);

  await blockRow(page, 0).locator('button:has-text("Editar")').click();
  const area = page.locator('#block-form-area');
  await area.locator('#bf-texto').fill('Versión dos persistida');
  await area.locator('button:has-text("Actualizar bloque")').click();
  await waitSaved(page);

  const blocks = await getBlocks(token, id);
  expect(blocks.length).toBe(1);
  const contenido = JSON.parse(blocks[0].contenido);
  expect(contenido.texto).toBe('Versión dos persistida');
});

// ============================================================
// TEST 6 — Eliminar bloque se guarda (con deletedBlockIds) → BD
// ============================================================
test('TEST 6: eliminar un bloque persiste (ya no existe en BD)', async ({ page }) => {
  const token = await loginDemo(page);
  const id = await createProfile(page, token, 'Persistencia Delete ' + Date.now());

  await page.evaluate(() => window.goStep && window.goStep(3));
  await addBlockViaUI(page, 'texto', { 'bf-texto': 'Bloque que se borra' });
  await addBlockViaUI(page, 'texto', { 'bf-texto': 'Bloque que permanece' });
  await waitSaved(page);
  expect((await getBlocks(token, id)).length).toBe(2);

  await blockRow(page, 0).locator('button:has-text("Borrar")').click();
  await page.waitForFunction(function () {
    const el = document.getElementById('save-status');
    return el && el.getAttribute('data-state') === 'dirty';
  }, {}, { timeout: 10000 });
  await waitSaved(page);

  const blocks = await getBlocks(token, id);
  expect(blocks.length).toBe(1);
  const contenido = JSON.parse(blocks[0].contenido);
  expect(contenido.texto).toBe('Bloque que permanece');
});

// ============================================================
// TEST 7 — Duplicar bloque se guarda → BD
// ============================================================
test('TEST 7: duplicar un bloque persiste en BD', async ({ page }) => {
  const token = await loginDemo(page);
  const id = await createProfile(page, token, 'Persistencia Duplicar ' + Date.now());

  await page.evaluate(() => window.goStep && window.goStep(3));
  await addBlockViaUI(page, 'texto', { 'bf-texto': 'Original' });
  await waitSaved(page);

  await blockRow(page, 0).locator('button:has-text("Duplicar")').click();
  await waitSaved(page);

  const blocks = await getBlocks(token, id);
  expect(blocks.length).toBe(2);
  expect(JSON.parse(blocks[1].contenido).texto).toBe('Original');
});

// ============================================================
// TEST 8 — Reordenar bloques se guarda → BD
// ============================================================
test('TEST 8: reordenar bloques persiste el nuevo orden en BD', async ({ page }) => {
  const token = await loginDemo(page);
  const id = await createProfile(page, token, 'Persistencia Orden ' + Date.now());

  await page.evaluate(() => window.goStep && window.goStep(3));
  await addBlockViaUI(page, 'texto', { 'bf-texto': 'PRIMERO' });
  await addBlockViaUI(page, 'texto', { 'bf-texto': 'SEGUNDO' });
  await waitSaved(page);

  // Baja el segundo bloque con la flecha ↑ para que quede primero.
  await blockRow(page, 1).locator('button:has-text("↑")').click();
  await waitSaved(page);

  const blocks = await getBlocks(token, id);
  expect(JSON.parse(blocks[0].contenido).texto).toBe('SEGUNDO');
  expect(JSON.parse(blocks[1].contenido).texto).toBe('PRIMERO');
  expect(blocks[0].orden).toBeLessThan(blocks[1].orden);
});

// ============================================================
// TEST 9 — Ocultar/Mostrar bloque se guarda → BD
// ============================================================
test('TEST 9: ocultar un bloque persiste visible=0 en BD', async ({ page }) => {
  const token = await loginDemo(page);
  const id = await createProfile(page, token, 'Persistencia Visible ' + Date.now());

  await page.evaluate(() => window.goStep && window.goStep(3));
  await addBlockViaUI(page, 'texto', { 'bf-texto': 'Bloque oculto' });
  await waitSaved(page);

  await blockRow(page, 0).locator('button:has-text("Ocultar")').click();
  await waitSaved(page);

  const blocks = await getBlocks(token, id);
  expect(blocks.length).toBe(1);
  expect(blocks[0].visible).toBe(0);

  // Mostrarlo de nuevo debe restaurar visible=1 en BD.
  await blockRow(page, 0).locator('button:has-text("Mostrar")').click();
  await waitSaved(page);
  const blocksAfter = await getBlocks(token, id);
  expect(blocksAfter[0].visible).toBe(1);
});

// ============================================================
// TEST 10 — Combo múltiple de cambios se guarda completo → BD
// ============================================================
test('TEST 10: combinación de cambios (nombre+bio+tema+bloques) persiste completa', async ({ page }) => {
  const token = await loginDemo(page);
  const id = await createProfile(page, token, 'Persistencia Combo ' + Date.now());

  // Bio
  await page.locator('#bio_perfil').fill('Combo de cambio múltiple');
  // Tema
  await page.evaluate(() => window.goStep && window.goStep(2));
  await page.locator('.theme-card[data-theme-id="midnight"]').click();
  await page.locator('.color-option[data-color="#0B2545"]').click();
  // Bloques
  await page.evaluate(() => window.goStep && window.goStep(3));
  await addBlockViaUI(page, 'texto', { 'bf-texto': 'Combo 1' });
  await addBlockViaUI(page, 'link', { 'bf-titulo': 'Mi web', 'bf-url': 'https://ejemplo.com/' + Date.now(), 'bf-sub': 'Sitio' });
  // Reordenar (link arriba)
  await blockRow(page, 1).locator('button:has-text("↑")').click();
  await waitSaved(page);

  const profile = await getProfile(token, id);
  expect(profile.bio).toBe('Combo de cambio múltiple');
  expect(profile.tema).toBe('midnight');
  expect(profile.color).toBe('#0B2545');

  const blocks = await getBlocks(token, id);
  expect(blocks.length).toBe(2);
  expect(blocks[0].tipo).toBe('link');
  expect(blocks[1].tipo).toBe('texto');
  expect(JSON.parse(blocks[0].contenido).titulo).toBe('Mi web');
});

// ============================================================
// TEST 11 — Perfil nuevo con bloques antes del primer guardado
// ============================================================
test('TEST 11: bloques agregados antes del primer guardado no se pierden al crear el perfil', async ({ page }) => {
  const token = await loginDemo(page);

  await page.goto('/editor.html', { waitUntil: 'domcontentloaded', timeout: 20000 });
  // Agregar bloques ANTES de escribir el nombre (el perfil aún no existe en BD).
  await page.evaluate(() => window.goStep && window.goStep(3));
  await addBlockViaUI(page, 'texto', { 'bf-texto': 'Primer bloque antes de crear perfil' });
  await addBlockViaUI(page, 'whatsapp', { 'bf-tel': '522311556138' });

  // Hasta aquí, persistEditorState no crea perfil (falta nombre): no lanza error, solo dirty.
  const statusBefore = await page.locator('#save-status').getAttribute('data-state');
  expect(['dirty', 'idle']).toContain(statusBefore);

  // Ahora sí: nombre → autosave crea el perfil y sincroniza los bloques pendientes.
  const nombre = 'Perfil Nuevo con Bloques ' + Date.now();
  await page.locator('#nombre_perfil').fill(nombre);
  await page.evaluate(() => window.goStep && window.goStep(3));
  await waitSaved(page);

  const id = await page.evaluate(() => new URL(location.href).searchParams.get('id'));
  expect(Number(id)).toBeGreaterThan(0);

  const blocks = await getBlocks(token, Number(id));
  expect(blocks.length).toBe(2);
  expect(JSON.parse(blocks[0].contenido).texto).toContain('antes de crear perfil');
  expect(blocks[1].tipo).toBe('whatsapp');
});

// ============================================================
// TEST 12 — Cambio durante autosave en vuelo → cola, nada se pierde
// ============================================================
test('TEST 12: un cambio que llega mientras el guardado está en vuelo se encola y se persiste', async ({ page }) => {
  const token = await loginDemo(page);
  const id = await createProfile(page, token, 'Persistencia Cola ' + Date.now());

  // Retrasa el PUT del perfil para que el primer guardado quede "en vuelo".
  let delayed = false;
  await page.route('**/api/perfiles/' + id, async (route) => {
    if (route.request().method() === 'PUT' && !delayed) {
      delayed = true;
      await new Promise(function (resolve) { setTimeout(resolve, 2200); });
    }
    await route.continue();
  });

  // Cambio 1: bio → dispara autosave (en vuelo por el retraso).
  await page.locator('#bio_perfil').fill('Cambio durante guardado en vuelo');

  await page.waitForFunction(function () {
    const el = document.getElementById('save-status');
    return el && el.getAttribute('data-state') === 'saving';
  }, {}, { timeout: 15000 });

  // Cambio 2: nombre → llega DURANTE el guardado (cola).
  const nuevoNombre = 'Nombre Cambiado en Cola ' + Date.now();
  await page.locator('#nombre_perfil').fill(nuevoNombre);

  // Termina: ambos cambios deben quedar persistidos.
  await waitSaved(page, 30000);

  const profile = await getProfile(token, id);
  expect(profile.nombre_perfil).toBe(nuevoNombre);
  expect(profile.bio).toBe('Cambio durante guardado en vuelo');
});

// ============================================================
// ACCEPTANCE — Editor reabierto == BD == público
// ============================================================
test('ACCEPTANCE: editor==BD==público tras reabrir, recargar y revisar la tarjeta pública', async ({ page }) => {
  const token = await loginDemo(page);
  const nombre = 'Tarjeta Acceptance ' + Date.now();

  // 1. Crear perfil real por UI.
  const id = await createProfile(page, token, nombre);

  // 2. Bio + tema + 2 bloques + ocultar uno + reordenar.
  await page.locator('#bio_perfil').fill('Bio de la tarjeta de aceptación');
  await page.evaluate(() => window.goStep && window.goStep(2));
  await page.locator('.theme-card[data-theme-id="coast"]').click();
  await page.evaluate(() => window.goStep && window.goStep(3));
  await addBlockViaUI(page, 'whatsapp', { 'bf-tel': '522311556138' });
  await addBlockViaUI(page, 'texto', { 'bf-texto': 'Bloque visible público' });
  await blockRow(page, 0).locator('button:has-text("↓")').click(); // texto queda arriba, whatsapp abajo
  await blockRow(page, 1).locator('button:has-text("Ocultar")').click(); // ocultar whatsapp
  await waitSaved(page);

  // 3. Reabrir el editor con el MISMO id → estado igual a lo guardado.
  await page.goto('/editor.html?id=' + id, { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.waitForFunction(function () {
    const el = document.getElementById('save-status');
    return el && el.getAttribute('data-state') === 'saved';
  }, {}, { timeout: 20000 });

  await expect(page.locator('#nombre_perfil')).toHaveValue(nombre);
  await expect(page.locator('#bio_perfil')).toHaveValue('Bio de la tarjeta de aceptación');

  // El bloque oculto reabre como "oculto" y el visible sigue visible.
  await page.evaluate(() => window.goStep && window.goStep(3));
  const rows = page.locator('#block-list .block-item-row');
  await expect(rows).toHaveCount(2);
  expect(await rows.nth(0).textContent()).toContain('Bloque visible público');
  expect(await rows.nth(0).textContent()).not.toContain('oculto');
  expect(await rows.nth(1).textContent()).toContain('oculto');

  // 4. BD == editor.
  const profile = await getProfile(token, id);
  expect(profile.nombre_perfil).toBe(nombre);
  expect(profile.bio).toBe('Bio de la tarjeta de aceptación');
  expect(profile.tema).toBe('coast');

  const blocks = await getBlocks(token, id);
  expect(blocks.length).toBe(2);
  expect(blocks[0].tipo).toBe('texto');
  expect(blocks[0].visible).toBe(1);
  expect(blocks[1].tipo).toBe('whatsapp');
  expect(blocks[1].visible).toBe(0);

  // 5. Público == BD: el nombre aparece y el bloque oculto NO se renderiza.
  const pub = await page.context().newPage();
  await pub.goto('/u/' + profile.slug, { waitUntil: 'domcontentloaded', timeout: 25000 });
  await pub.waitForSelector('.vynk-public', { timeout: 25000 });

  const publicName = await pub.locator('.vynk-public .name').textContent();
  expect(publicName.trim()).toBe(nombre);

  // El texto del bloque visible sí aparece; el whatsapp oculto no genera CTA.
  await expect(pub.locator('text=Bloque visible público').first()).toBeVisible({ timeout: 15000 });
  const waExists = await pub.locator('.block-wa, [data-action="click_whatsapp"]').count();
  expect(waExists).toBe(0);
  await pub.close();
});