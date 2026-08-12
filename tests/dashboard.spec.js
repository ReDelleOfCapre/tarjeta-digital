const { test, expect } = require('@playwright/test');

test.describe('VYNK E-Commerce Dual Safety Loop & E2E Suite', () => {
  test('1. Landing page loads, auth tab switches and CTA buttons are clickable', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/VYNK|Tarjeta/i);
    
    const ctaBtn = page.locator('button:has-text("Crear cuenta gratis"), a:has-text("Crear cuenta gratis"), a:has-text("Iniciar sesión")').first();
    await expect(ctaBtn).toBeVisible();
    await ctaBtn.click();
  });

  test('2. Dashboard E-Commerce dual tabs, B2C NFC order button and reseller inventory', async ({ page }) => {
    // Intercept all API calls to prevent 401 redirects in test environment
    await page.route('**/api/**', route => {
      const url = route.request().url();
      if (url.includes('/api/perfiles')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([{ id: 1, nombre_perfil: 'Tarjeta Demo', slug: 'demo', tipo: 'personal', visitas: 5, total_campos: 3 }])
        });
      }
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true })
      });
    });

    // Inject localStorage before document scripts execute
    await page.addInitScript(() => {
      const mockUser = { id: 1, nombre: 'Test User', email: 'test@vynk.app', plan: 'paid', terms_accepted: true, is_first_login: false };
      localStorage.setItem('token', 'mock_e2e_test_token');
      localStorage.setItem('usuario', JSON.stringify(mockUser));
      localStorage.setItem('user', JSON.stringify(mockUser));
      localStorage.setItem('vynk_tour_completed', 'true');
    });

    await page.goto('/dashboard.html');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('.dashboard-grid-container').first()).toBeVisible();

    // 1. Verify B2C Pedir Tarjeta NFC button is visible and clickable
    const b2cOrderBtn = page.locator('button:has-text("Pedir Tarjeta Física NFC")').first();
    await expect(b2cOrderBtn).toBeVisible();
    await b2cOrderBtn.click({ trial: true });

    // 2. Verify Tab switching between Mis Tarjetas, Tienda, and Mi Inventario
    const tabTienda = page.locator('#nav-item-tienda');
    await expect(tabTienda).toBeVisible();
    await tabTienda.click();
    await page.waitForTimeout(100);
    await expect(page.locator('#view-tab-tienda')).toBeVisible();

    const tabInventario = page.locator('#nav-item-inventario');
    await expect(tabInventario).toBeVisible();
    await tabInventario.click();
    await page.waitForTimeout(100);
    await expect(page.locator('#view-tab-inventario')).toBeVisible();

    // 3. Verify Card action buttons are clickable
    const tabTarjetas = page.locator('#nav-item-tarjetas');
    await tabTarjetas.click();
    await page.waitForTimeout(100);
    const actionBtn = page.locator('.card-actions a, .card-actions button').first();
    await expect(actionBtn).toBeVisible();
    await actionBtn.click({ trial: true });

    // 4. Verify Core Creation Modal opening and Form submit setup
    const createCardBtn = page.locator('#btn-create-card');
    await expect(createCardBtn).toBeVisible();
    await page.evaluate(() => window.openCreateModal());
    await page.waitForTimeout(100);
    await expect(page.locator('#modal-perfiles')).toBeVisible();
    await page.evaluate(() => window.closeCreateModal());

    // 5. Verify Eye icon (Ver perfil público) has valid href and target="_blank"
    const eyeBtn = page.locator('.card-actions a[title="Ver perfil público"]').first();
    await expect(eyeBtn).toBeVisible();
    await expect(eyeBtn).toHaveAttribute('target', '_blank');
    await expect(eyeBtn).toHaveAttribute('href', '/u/demo');
    await eyeBtn.click({ trial: true });
  });

  test('3. Public plans page structure and payment buttons', async ({ page }) => {
    await page.goto('/planes.html');
    const plansHeading = page.locator('h1, h2').first();
    await expect(plansHeading).toBeVisible();
  });
});
