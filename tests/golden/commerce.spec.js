import { test, expect } from '@playwright/test';

test('golden commerce — drawer, add to jhola, badge and subtotal', async ({ page }) => {
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

  await expect(page.locator('.hud-cart')).toBeVisible();
  await page.click('.hud-cart');
  await expect(page.locator('.catalog-drawer')).toBeVisible();
  await expect(page.locator('.catalog-row')).toHaveCount(17);
  await expect(page.locator('.catalog-zone')).toHaveCount(4);

  await page.click('.catalog-row[data-sku="waiwai-5pack"] .catalog-add');
  await expect(page.locator('.hud-cart-badge')).toHaveText('1');
  await page.click('.catalog-row[data-sku="waiwai-5pack"] .catalog-step:last-child');
  await expect(page.locator('.hud-cart-badge')).toHaveText('2');
  await expect(page.locator('.hud-cart-subtotal')).toHaveText('रू 190');
  await expect(page.locator('.catalog-row[data-sku="waiwai-5pack"] .catalog-qty')).toHaveText('2');
  await expect(page.locator('.catalog-subtotal')).toHaveText('रू 190');

  await page.screenshot({ path: 'test-results/golden-commerce.png', fullPage: false });
  expect(errors).toEqual([]);
});

test('golden commerce — oversell guard rejects above stock with a toast', async ({ page }) => {
  /** @type {string[]} */
  const errors = [];
  page.on('pageerror', (error) => errors.push(String(error)));

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem(
      'sagarmatha_metaverse_v3',
      JSON.stringify({ visitorName: 'Aarav', stockMap: { 'gungdi-ghee': 1 }, cartArr: [] }),
    );
  });
  await page.reload();
  await expect(page.locator('.landing')).toBeVisible();
  await page.click('.landing-enter');
  await page.waitForFunction(() => document.body.dataset.mode === 'explore', null, { timeout: 15000 });

  await page.click('.hud-cart');
  await expect(page.locator('.catalog-drawer')).toBeVisible();
  await expect(page.locator('.catalog-row[data-sku="gungdi-ghee"] .catalog-stock')).toHaveText('स्टक 1');

  const row = page.locator('.catalog-row[data-sku="gungdi-ghee"]');
  await row.locator('.catalog-add').click();
  await expect(row.locator('.catalog-qty')).toHaveText('1');
  await row.locator('.catalog-step:last-child').click();
  await expect(page.locator('.toast')).toContainText('स्टक सकियो');
  await expect(row.locator('.catalog-qty')).toHaveText('1');
  await expect(page.locator('.hud-cart-badge')).toHaveText('1');
  expect(errors).toEqual([]);
});
