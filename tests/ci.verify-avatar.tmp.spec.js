const { test, expect } = require('@playwright/test');

test('avatar llena el círculo del visor', async ({ page }) => {
  await page.goto('http://localhost:3000/u/cristina');
  await page.waitForSelector('.avatar-wrapper img');
  const info = await page.evaluate(() => {
    const wrapper = document.querySelector('.avatar-wrapper');
    const img = wrapper.querySelector('img.avatar, .avatar img');
    if (!img) return null;
    const w = wrapper.getBoundingClientRect();
    const i = img.getBoundingClientRect();
    const computed = getComputedStyle(img);
    return {
      wrapperW: w.width, wrapperH: w.height,
      imgW: i.width, imgH: i.height,
      objectFit: computed.objectFit
    };
  });
  console.log('AVATAR_INFO', JSON.stringify(info));
  expect(info).not.toBeNull();
  // El img debe llenar exactamente el wrapper (tolerancia 1px)
  expect(Math.abs(info.imgW - info.wrapperW)).toBeLessThanOrEqual(1);
  expect(Math.abs(info.imgH - info.wrapperH)).toBeLessThanOrEqual(1);
  expect(info.objectFit).toBe('cover');
});