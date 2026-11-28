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

  await page.waitForFunction(() => document.body.dataset.peerX !== undefined, null, { timeout: 10000 });
  const peerX = await page.evaluate(() => parseFloat(document.body.dataset.peerX ?? ''));
  expect(Number.isFinite(peerX)).toBe(true);

  const groundTargets = [
    [620, 500],
    [400, 520],
    [760, 470],
  ];
  let travelled = 0;
  for (const [x, y] of groundTargets) {
    const before = await cameraPosition(page);
    await page.mouse.click(x, y);
    await page.waitForTimeout(1800);
    const after = await cameraPosition(page);
    travelled = Math.hypot(after.x - before.x, after.z - before.z);
    if (travelled > 0.4) break;
  }
  expect(travelled).toBeGreaterThan(0.4);

  await page.screenshot({ path: 'test-results/golden-presence-path.png', fullPage: false });
  expect(errors).toEqual([]);
});
