import { test, expect } from '@playwright/test';

test('golden boot', async ({ page }) => {
  /** @type {string[]} */
  const errors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(String(error)));

  await page.goto('/');
  await expect(page.locator('#scene')).toBeVisible();
  await expect(page.locator('#webgl-fallback')).toBeHidden();

  const hasWebGL2 = await page.evaluate(() => {
    const probe = document.createElement('canvas');
    return Boolean(probe.getContext('webgl2'));
  });
  expect(hasWebGL2).toBe(true);

  await page.waitForTimeout(1200);
  await page.screenshot({ path: 'test-results/golden-boot.png', fullPage: false });

  expect(errors).toEqual([]);
});
