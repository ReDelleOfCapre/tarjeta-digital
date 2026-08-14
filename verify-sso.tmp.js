const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.waitForTimeout(2000);
  const ssoState = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('[data-action="sso"]'));
    return btns.map(b => ({ provider: b.getAttribute('data-provider'), disabled: b.disabled, cls: b.className }));
  });
  console.log('SSO state:', JSON.stringify(ssoState));
  console.log('Console errors:', JSON.stringify(errors));
  await browser.close();
})();