import { test, expect } from '@playwright/test';

test('golden resilience: webgl context loss and restore recovers the scene', async ({ page }) => {
  /** @type {string[]} */
  const errors = [];
  page.on('pageerror', (error) => errors.push(String(error)));

  await page.goto('/?debug=1');
  await page.waitForSelector('.landing');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.click('.landing-enter');
  await page.waitForFunction(() => document.body.dataset.mode === 'explore', null, { timeout: 15000 });
  await page.waitForTimeout(1500);

  await page.evaluate(() => {
    const canvas = /** @type {HTMLCanvasElement} */ (document.getElementById('scene'));
    const gl = /** @type {WebGL2RenderingContext} */ (canvas.getContext('webgl2'));
    const loseContext = /** @type {WEBGL_lose_context} */ (gl.getExtension('WEBGL_lose_context'));
    (/** @type {any} */ (window)).__loseContext = loseContext;
    loseContext.loseContext();
  });
  await page.waitForTimeout(800);

  await page.evaluate(() => {
    (/** @type {any} */ (window)).__loseContext.restoreContext();
  });
  await page.waitForTimeout(2500);

  const stats = await page.evaluate(() => ({
    ...(/** @type {any} */ (window)).__sagarmatha.stats(),
    mode: document.body.dataset.mode,
  }));
  expect(stats.drawCalls).toBeGreaterThan(0);
  expect(stats.triangles).toBeGreaterThan(0);
  expect(stats.mode).toBe('explore');
  await page.screenshot({ path: 'test-results/golden-context-restore.png', fullPage: false });
  expect(errors).toEqual([]);
});
