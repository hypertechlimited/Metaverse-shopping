import { test, expect } from '@playwright/test';

/** @param {import('@playwright/test').Page} page */
async function enterExplore(page) {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.fill('.landing-input', 'Aarav');
  await page.click('.landing-enter');
  await page.waitForFunction(() => document.body.dataset.mode === 'explore', null, { timeout: 15000 });
}

/** @param {import('@playwright/test').Page} page */
async function cameraPosition(page) {
  return page.evaluate(() => ({
    x: parseFloat(document.body.dataset.camX ?? ''),
    z: parseFloat(document.body.dataset.camZ ?? ''),
  }));
}

test('golden presence — joystick mounts, click-to-move walks the nav path', async ({ page }) => {
  test.setTimeout(120_000);
  /** @type {string[]} */
  const errors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(String(error)));

  await enterExplore(page);
  await page.waitForTimeout(1200);

  await expect(page.locator('.joystick')).toBeVisible();

  const before = await cameraPosition(page);
  await page.mouse.click(640, 180);
  await page.waitForTimeout(2500);
  const after = await cameraPosition(page);
  expect(Math.hypot(after.x - before.x, after.z - before.z)).toBeGreaterThan(0.4);

  await page.screenshot({ path: 'test-results/golden-presence-path.png', fullPage: false });
  expect(errors).toEqual([]);
});
