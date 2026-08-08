const { test, expect } = require('@playwright/test');

test.describe('VYNK Platform E2E Suite', () => {
  test('Landing page loads with DOM brand header', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/VYNK|Tarjeta/i);
    const brandElement = page.locator('.brand, .logo, h1, h2').first();
    await expect(brandElement).toBeVisible();
  });

  test('Public plans page loads structure correctly', async ({ page }) => {
    await page.goto('/planes.html');
    const plansHeading = page.locator('h1, h2').first();
    await expect(plansHeading).toBeVisible();
  });

  test('Dashboard page loads grid container', async ({ page }) => {
    await page.goto('/dashboard.html');
    const containerElement = page.locator('#profile-grid, .container').first();
    await expect(containerElement).toBeAttached();
  });
});
