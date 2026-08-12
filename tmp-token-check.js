const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

  // Cache token resolution via evaluating computed vars on a styled probe
  await page.goto('http://localhost:3000/dashboard.html', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(800);

  const res = await page.evaluate(() => {
    const probe = document.createElement('div');
    probe.style.cssText = 'position:fixed;left:-9999px;top:0;width:10px;height:10px;background:var(--primary);color:var(--text-primary)';
    document.body.appendChild(probe);
    const cs = getComputedStyle(probe);
    const vars = [
      '--primary', '--accent', '--bg-base', '--bg-elevated', '--surface-surface',
      '--text-primary', '--text-secondary', '--text-tertiary', '--border-hairline',
      '--success', '--error', '--space-1', '--space-4', '--space-24', '--radius-1', '--radius-full',
      '--motion-micro', '--z-modal', '--text-display', '--font-family', '--grad-primary', '--vynk-navy'
    ];
    const out = {};
    for (const v of vars) out[v] = getComputedStyle(document.documentElement).getPropertyValue(v).trim();
    out.bodyBg = cs.backgroundColor;
    out.colorScheme = getComputedStyle(document.documentElement).colorScheme;
    probe.remove();
    return out;
  });

  console.log('=== DASHBOARD (dark) — tokens resueltos ===');
  for (const [k, v] of Object.entries(res)) console.log('  ' + k + ': ' + (v || '(VACÍO)'));
  await browser.close();
})();