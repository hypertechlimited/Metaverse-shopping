import { test, expect } from '@playwright/test';

test('golden architecture & culture layer', async ({ page }) => {
  /** @type {string[]} */
  const errors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(String(error)));

  await page.goto('/');
  await expect(page.locator('#scene')).toBeVisible();
  await expect(page.locator('#webgl-fallback')).toBeHidden();

  await page.waitForTimeout(2500);
  const shotA = await page.screenshot({ path: 'test-results/golden-architecture-a.png', fullPage: false });

  await page.waitForTimeout(2200);
  const shotB = await page.screenshot({ path: 'test-results/golden-architecture-b.png', fullPage: false });

  expect(shotA.length).toBeGreaterThan(0);
  let identical = shotA.length === shotB.length;
  if (identical) {
    for (let i = 0; i < shotA.length; i++) {
      if (shotA[i] !== shotB[i]) {
        identical = false;
        break;
      }
    }
  }
  expect(identical).toBe(false);

  expect(errors).toEqual([]);
});
