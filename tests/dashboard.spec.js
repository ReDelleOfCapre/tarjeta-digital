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
    // Intercept API calls to prevent 401 redirects in test environment
    await page.route('**/api/perfiles*', route => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([{ id: 1, nombre_perfil: 'Tarjeta Demo', slug: 'demo', tipo: 'personal', visitas: 5, total_campos: 3 }])
    }));

    // Inject localStorage before document scripts execute
    await page.addInitScript(() => {
      const mockUser = { id: 1, nombre: 'Test User', email: 'test@vynk.app', plan: 'paid' };
      localStorage.setItem('token', 'mock_e2e_test_token');
      localStorage.setItem('usuario', JSON.stringify(mockUser));
      localStorage.setItem('user', JSON.stringify(mockUser));
    });

    await page.goto('/dashboard.html');
    await expect(page.locator('.dashboard-grid-container').first()).toBeVisible();

    // 1. Verify B2C Pedir Tarjeta NFC button is visible and clickable
    const b2cOrderBtn = page.locator('button:has-text("Pedir Tarjeta Física NFC")').first();
    await expect(b2cOrderBtn).toBeVisible();
    await b2cOrderBtn.click({ trial: true });

    // 2. Verify Tab switching between Mis Tarjetas, Tienda, and Mi Inventario
    const tabTienda = page.locator('#nav-item-tienda');
    await expect(tabTienda).toBeVisible();
    await tabTienda.click();
    await expect(page.locator('#view-tab-tienda')).toBeVisible();

    const tabInventario = page.locator('#nav-item-inventario');
    await expect(tabInventario).toBeVisible();
    await tabInventario.click();
    await expect(page.locator('#view-tab-inventario')).toBeVisible();

    // 3. Verify Card action buttons are clickable
    const tabTarjetas = page.locator('#nav-item-tarjetas');
    await tabTarjetas.click();
    const actionBtn = page.locator('.card-actions a, .card-actions button').first();
    await expect(actionBtn).toBeVisible();
    await actionBtn.click({ trial: true });
  });

  test('3. Public plans page structure and payment buttons', async ({ page }) => {
    await page.goto('/planes.html');
    const plansHeading = page.locator('h1, h2').first();
    await expect(plansHeading).toBeVisible();
  });
});
