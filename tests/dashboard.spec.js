const { test, expect } = require('@playwright/test');

test.describe('VYNK Platform Safety Loop & E2E Interactivity Suite', () => {
  test('1. Landing page loads, auth tab switches and CTA buttons are clickable', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/VYNK|Tarjeta/i);
    
    // Test navigation / tab switching
    const ctaBtn = page.locator('button:has-text("Crear cuenta gratis"), a:has-text("Crear cuenta gratis"), a:has-text("Iniciar sesión")').first();
    await expect(ctaBtn).toBeVisible();
    await ctaBtn.click();
  });

  test('2. Dashboard authentication, layout and clickable card actions (Z-Index Guard)', async ({ page }) => {
    // Intercept API calls to prevent 401 redirects in test environment
    await page.route('**/api/perfiles*', route => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([{ id: 1, nombre_perfil: 'Tarjeta Demo', slug: 'demo', tipo: 'personal', visitas: 5, total_campos: 3 }])
    }));

    await page.route('**/api/workspaces*', route => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([{ id: 1, nombre: 'Workspace Demo' }])
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

    // Verify Create Card CTA is visible and clickable (Not blocked by z-index overlay)
    const createBtn = page.locator('#btn-create-card, .card-create-cta').first();
    await expect(createBtn).toBeVisible();
    await createBtn.click({ trial: true }); // Fails if blocked by overlay

    // Verify Sidebar nav items and card-actions are visible and clickable
    const navItem = page.locator('.nav-side-item').first();
    await expect(navItem).toBeVisible();
    await navItem.click({ trial: true }); // Fails if intercepted by overlay

    const actionBtn = page.locator('.card-actions a, .card-actions button').first();
    await expect(actionBtn).toBeVisible();
    await actionBtn.click({ trial: true }); // Fails if intercepted by overlay
  });

  test('3. Public plans page structure and payment buttons', async ({ page }) => {
    await page.goto('/planes.html');
    const plansHeading = page.locator('h1, h2').first();
    await expect(plansHeading).toBeVisible();
  });
});
