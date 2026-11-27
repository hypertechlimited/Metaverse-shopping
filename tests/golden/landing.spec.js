import { test, expect } from '@playwright/test';

test('golden landing', async ({ page }) => {
  /** @type {string[]} */
  const errors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(String(error)));

  await page.goto('/');
  await expect(page.locator('.landing')).toBeVisible();
  await expect(page.locator('.landing-pill')).toContainText('पसल खुला');
  await expect(page.locator('.landing-title')).toContainText('सगरमाथा कर्नर पसल');
  await expect(page.locator('.deal-chip')).toHaveCount(4);
  await expect(page.locator('.landing-enter')).toBeVisible();

  await expect(page.locator('#scene')).toBeVisible();
  await expect(page.locator('#webgl-fallback')).toBeHidden();
  await expect(page.locator('.dpad')).toBeVisible();

  await page.waitForTimeout(1200);
  await page.screenshot({ path: 'test-results/golden-landing.png', fullPage: false });

  expect(errors).toEqual([]);
});
