import { test, expect } from '@playwright/test';

test('golden enter', async ({ page }) => {
  /** @type {string[]} */
  const errors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(String(error)));

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.locator('.landing')).toBeVisible();

  await page.fill('.landing-input', 'Aarav');
  await page.click('.landing-enter');

  await expect(page.locator('.toast')).toContainText('नमस्ते, Aarav');

  await page.waitForFunction(
    () => document.body.dataset.mode === 'explore',
    null,
    { timeout: 15000 },
  );

  const position = await page.evaluate(() => ({
    x: parseFloat(document.body.dataset.camX ?? ''),
    y: parseFloat(document.body.dataset.camY ?? ''),
    z: parseFloat(document.body.dataset.camZ ?? ''),
  }));
  const distance = Math.hypot(position.x - 6.8, position.y - 1.6, position.z - 7.6);
  expect(distance).toBeLessThan(0.5);

  const audioState = await page.evaluate(() => document.body.dataset.audio);
  expect(['started', 'blocked']).toContain(audioState);
  await expect(page.locator('.landing')).toHaveCount(0);

  await page.screenshot({ path: 'test-results/golden-enter.png', fullPage: false });
  expect(errors).toEqual([]);
});

test('golden enter via deal chip flies to the deal shelf', async ({ page }) => {
  /** @type {string[]} */
  const errors = [];
  page.on('pageerror', (error) => errors.push(String(error)));

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.click('.deal-chip[data-deal="ilam-tea-250g"]');

  await page.waitForFunction(
    () => document.body.dataset.mode === 'explore',
    null,
    { timeout: 15000 },
  );

  const position = await page.evaluate(() => ({
    x: parseFloat(document.body.dataset.camX ?? ''),
    y: parseFloat(document.body.dataset.camY ?? ''),
    z: parseFloat(document.body.dataset.camZ ?? ''),
  }));
  const distance = Math.hypot(position.x - -0.8, position.y - 1.6, position.z - 3.2);
  expect(distance).toBeLessThan(0.5);

  await page.screenshot({ path: 'test-results/golden-enter-deal.png', fullPage: false });
  expect(errors).toEqual([]);
});
