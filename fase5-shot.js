const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];

  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(String(e)));

  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
  await page.screenshot({ path: 'C:/Users/gpprz/AppData/Local/Temp/opencode/shots/fase5-landing.png' });
  const landingBg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  const landingPrimary = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--primary').trim());
  const landingFont = await page.evaluate(() => getComputedStyle(document.body).fontFamily.slice(0, 40));
  console.log('LANDING bg=' + landingBg + ' --primary=' + landingPrimary + ' font=' + landingFont);

  await page.goto('http://localhost:3000/admin', { waitUntil: 'networkidle' });
  await page.screenshot({ path: 'C:/Users/gpprz/AppData/Local/Temp/opencode/shots/fase5-dashboard.png' });
  const dashBg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  const dashPrimary = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--primary').trim());
  const dashNav = await page.evaluate(() => { const n = document.querySelector('.navbar'); return n ? getComputedStyle(n).backgroundColor : 'no-navbar'; });
  console.log('DASHBOARD bg=' + dashBg + ' --primary=' + dashPrimary + ' navbar=' + dashNav);

  console.log('JS ERRORS: ' + (errors.length ? errors.join(' | ') : 'ninguno'));
  await browser.close();
})();
