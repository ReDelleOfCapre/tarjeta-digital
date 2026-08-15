const { test, expect } = require('@playwright/test');

const DEMO_PHONE = '+525555555555';
const DEMO_PASSWORD = 'demo1234';

async function submitLogin(page) {
  await page.fill('#loginTelefono', DEMO_PHONE);
  await page.fill('#loginPassword', DEMO_PASSWORD);
  // El handler se dispara en el evento submit del form
  await page.evaluate(() => {
    const form = document.getElementById('loginForm');
    const evt = new Event('submit', { bubbles: true, cancelable: true });
    form.dispatchEvent(evt);
  });
}

test.describe('VYNK Login E2E (credenciales demo reales)', () => {
  test('TEST 10: Login exitoso desde la página principal con credenciales demo', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (err) => errors.push(String(err)));

    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Asegurar que el tab de login esté activo
    await page.evaluate(() => {
      if (typeof switchTab === 'function') switchTab('login');
    });

    await submitLogin(page);

    await page.waitForURL(/dashboard\.html/, { timeout: 15000 });

    const usuarioRaw = await page.evaluate(() => localStorage.getItem('usuario'));
    const usuario = JSON.parse(usuarioRaw || 'null');
    expect(usuario).toBeTruthy();
    expect(usuario.id).toBeTruthy();
    expect(await page.evaluate(() => !!localStorage.getItem('token'))).toBe(true);
    expect(errors.length).toBe(0);
  });

  test('TEST 11: Login desde dashboard redirige al login y permite sesión demo real', async ({ page }) => {
    await page.goto('/dashboard.html', { waitUntil: 'domcontentloaded' });

    // Sesión limpia: sin access demo fantasma
    await page.evaluate(() => {
      localStorage.removeItem('token');
      localStorage.removeItem('usuario');
      localStorage.removeItem('user');
    });

    // Navegar a la página principal para hacer login real
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    await submitLogin(page);

    await page.waitForURL(/dashboard\.html/, { timeout: 15000 });

    const token = await page.evaluate(() => localStorage.getItem('token'));
    expect(token).toBeTruthy();
    expect(token).not.toBe('vynk_demo_active_token');
  });
});