import { test, expect } from '@playwright/test';

test('golden bill — checkout renders receipt, print styles hide the HUD', async ({ page }) => {
  /** @type {string[]} */
  const errors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(String(error)));

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.fill('.landing-input', 'Aarav');
  await page.click('.landing-enter');
  await page.waitForFunction(() => document.body.dataset.mode === 'explore', null, { timeout: 15000 });

  await page.click('.hud-cart');
  await expect(page.locator('.catalog-drawer')).toBeVisible();
  await page.click('.catalog-row[data-sku="waiwai-5pack"] .catalog-add');
  await expect(page.locator('.hud-cart-badge')).toHaveText('1');
  await page.click('.catalog-row[data-sku="marsyangdi-rice-5kg"] .catalog-add');
  await expect(page.locator('.catalog-subtotal')).toHaveText('रू 405');

  await page.click('.catalog-checkout');
  await expect(page.locator('.bill-paper')).toBeVisible();
  await expect(page.locator('.bill-shop-name')).toContainText('सगरमाथा कर्नर पसल');
  await expect(page.locator('.bill-customer')).toContainText('Aarav');
  await expect(page.locator('.bill-line')).toHaveCount(2);
  await expect(page.locator('.bill-line').first()).toContainText('वाइ वाइ चाउचाउ');
  await expect(page.locator('.bill-total').first()).toContainText('रू 405');
  await expect(page.locator('.bill-total-grand')).toContainText('रू 455');

  await expect(page.locator('.bill-order-id')).toBeVisible();
  const orderId = await page.locator('.bill-order-id').textContent();
  expect(orderId).toMatch(/^SM-[A-Z0-9]+$/);

  await page.emulateMedia({ media: 'print' });
  await expect(page.locator('#scene')).toBeHidden();
  await expect(page.locator('.hud-commerce')).toBeHidden();
  await expect(page.locator('.catalog-drawer')).toBeHidden();
  await expect(page.locator('.bill-paper')).toBeVisible();

  await page.screenshot({ path: 'test-results/golden-bill.png', fullPage: false });
  expect(errors).toEqual([]);
});
