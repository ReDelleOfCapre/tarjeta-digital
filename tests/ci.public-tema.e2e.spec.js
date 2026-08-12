const { test, expect } = require('@playwright/test');

test.describe('Perfil público: tema y mapa', () => {

  test('la tarjeta pública inyecta tokens de tema CSS', async ({ request }) => {
    const res = await request.get('http://localhost:3000/u/pequeno-juan');
    expect(res.ok()).toBeTruthy();
    const html = await res.text();
    expect(html).toContain('--bg-primary:');
    expect(html).toContain('--text-primary:');
    expect(html).toContain('--accent-soft:');
  });

  test('los bloques públicos usan el fondo del tema (body no queda claro por default)', async ({ page }) => {
    await page.goto('http://localhost:3000/u/pequeno-juan');
    await page.waitForSelector('.vynk-public');
    const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    const rootBg = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--bg-primary').trim());
    const toRgb = (v) => {
      const m = /#([0-9a-fA-F]{6})/.exec(v);
      if (!m) return v;
      const int = parseInt(m[1], 16);
      return 'rgb(' + ((int >> 16) & 255) + ', ' + ((int >> 8) & 255) + ', ' + (int & 255) + ')';
    };
    expect(bg).toBe(toRgb(rootBg));
  });

  test('tarjeta con tema oscuro mantiene contraste legible en bloques', async ({ page }) => {
    await page.goto('http://localhost:3000/u/pequeno-juan');
    await page.waitForSelector('.block-link');
    const info = await page.evaluate(() => {
      const el = document.querySelector('.block-link, .bento-rich-card');
      if (!el) return null;
      const cs = getComputedStyle(el);
      const tx = getComputedStyle(el.querySelector('.bl-title, .bento-title'));
      return { bg: cs.backgroundColor, text: tx ? tx.color : cs.color };
    });
    expect(info).not.toBeNull();
    const toHex = (rgb) => {
      const m = /rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)/.exec(rgb);
      return '#' + [m[1], m[2], m[3]].map((x) => parseInt(x).toString(16).padStart(2, '0')).join('');
    };
    const lum = (hex) => {
      const int = parseInt(String(hex).replace('#', ''), 16);
      const r = ((int >> 16) & 255) / 255, g = ((int >> 8) & 255) / 255, b = (int & 255) / 255;
      const f = (c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
      return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
    };
    const ratio = ((Math.max(lum(toHex(info.text)), lum(toHex(info.bg))) + 0.05) / (Math.min(lum(toHex(info.text)), lum(toHex(info.bg))) + 0.05));
    expect(ratio).toBeGreaterThan(4.5);
  });

  test('el selector del editor agrupa paletas (Clásicos, Apple, Old Money)', async ({ page }) => {
    await page.goto('http://localhost:3000/editor.html');
    await page.waitForSelector('.theme-card');
    const colorOptions = await page.locator('.color-option').count();
    expect(colorOptions).toBeGreaterThanOrEqual(30);
    const labels = await page.locator('.color-group-label').allTextContents();
    expect(labels.join(' ')).toContain('Apple');
    expect(labels.join(' ')).toContain('Old Money');
  });

});