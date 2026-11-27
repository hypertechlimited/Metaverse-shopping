import { test, expect } from '@playwright/test';

test('golden culture polish: mandala, windhorse lungta, atmosphere, d-pad', async ({ page }) => {
  /** @type {string[]} */
  const errors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(String(error)));

  await page.goto('/');
  await expect(page.locator('#scene')).toBeVisible();
  await expect(page.locator('#webgl-fallback')).toBeHidden();

  await expect(page.locator('.dpad')).toBeVisible();
  await expect(page.locator('.dpad-btn')).toHaveCount(4);
  await expect(page.locator('.dpad-up')).toHaveAccessibleName('Zoom camera in');

  await page.waitForTimeout(2500);
  const fontReady = await page.evaluate(() => document.fonts.check('700 100px "Noto Sans Devanagari"'));
  expect(fontReady).toBe(true);
  const shotA = await page.screenshot({ path: 'test-results/golden-polish-a.png', fullPage: false });

  await page.locator('.dpad-right').click();
  await page.locator('.dpad-right').click();
  await page.locator('.dpad-up').click();

  await page.waitForTimeout(1800);
  const shotB = await page.screenshot({ path: 'test-results/golden-polish-b.png', fullPage: false });

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
