const { test, expect } = require('@playwright/test');

async function loginDemo(page) {
  const res = await page.request.post('http://localhost:3000/api/auth/demo');
  const data = await res.json();
  expect(data.token).toBeTruthy();
  await page.addInitScript((token) => {
    localStorage.setItem('token', token);
    localStorage.setItem('usuario', JSON.stringify({ id: 1, nombre: 'Demo' }));
  }, data.token);
}

test('editor preview hidrata el perfil real con el renderer compartido', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (err) => errors.push(String(err)));
  await loginDemo(page);

  await page.goto('/editor.html?id=20', { waitUntil: 'domcontentloaded', timeout: 20000 });

  const canvas = page.locator('#vynk-preview');
  await expect(canvas.locator('.pass-hero')).toBeVisible({ timeout: 20000 });

  // El perfil se hidrata de forma asíncrona (loadExisting): espera el nombre real.
  await expect(page.locator('#nombre_perfil')).not.toHaveValue('', { timeout: 20000 });
  await expect(canvas.locator('.name')).not.toHaveText('Tu nombre', { timeout: 20000 });

  // Los bloques del perfil se renderizan con componentes vynk (block-wrapper).
  const wrappers = await canvas.locator('.block-wrapper').count();
  expect(wrappers).toBeGreaterThan(0);

  // Los tokens del tema se aplican sobre el frame (vynk-cards.css).
  const primary = await page.evaluate(() => {
    return getComputedStyle(document.getElementById('smartphone-frame')).getPropertyValue('--primary').trim();
  });
  expect(primary).toBeTruthy();

  expect(errors).toEqual([]);
});

test('el preview del editor coincide visualmente con la pagina publica', async ({ page }) => {
  await loginDemo(page);
  await page.goto('/editor.html?id=20', { waitUntil: 'domcontentloaded', timeout: 20000 });
  const canvas = page.locator('#vynk-preview');
  await expect(canvas.locator('.pass-hero')).toBeVisible({ timeout: 20000 });
  await expect(page.locator('#nombre_perfil')).not.toHaveValue('', { timeout: 20000 });
  await expect(canvas.locator('.name')).not.toHaveText('Tu nombre', { timeout: 20000 });

  // Publica en un contexto separado (domcontentloaded: la tarjeta genera QR y
  // recursos lentos que no necesitamos esperar para comparar identidad).
  const pub = await page.context().newPage();
  await pub.goto('/u/cantera', { waitUntil: 'domcontentloaded', timeout: 20000 });
  await pub.waitForSelector('.vynk-public', { timeout: 20000 });

  const editorName = await page.locator('#vynk-preview .name').textContent();
  const publicName = await pub.locator('.vynk-public .name').textContent();
  expect(editorName.trim()).toBe(publicName.trim());

  const editorHero = await page.locator('#vynk-preview .pass-hero').count();
  const publicHero = await pub.locator('.vynk-public .pass-hero').count();
  expect(editorHero).toBe(publicHero);
  await pub.close();
});
