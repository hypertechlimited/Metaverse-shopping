import { test, expect } from '@playwright/test';
import { STYLE_NAMES } from '../../src/world/fixtureStyles.js';

/** @param {import('@playwright/test').Page} page @param {string} style */
async function enterExploreWithStyle(page, style) {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(`/?debug=1&style=${style}`);
  await page.waitForSelector('.landing');
  await page.click('.landing-enter');
  await page.waitForFunction(() => document.body.dataset.mode === 'explore', null, { timeout: 30000 });
  await page.waitForTimeout(1500);
}

/** @param {import('@playwright/test').Page} page */
async function overviewState(page) {
  await page.click('.preset-btn[data-preset="Overview"]');
  await page.waitForTimeout(2000);
  return page.evaluate(() => {
    const s = /** @type {any} */ (window).__sagarmatha;
    /** @type {string[]} */
    const names = [];
    s.scene.traverse((/** @type {any} */ node) => {
      if (node.isMesh) names.push(node.name);
    });
    return {
      drawCalls: s.stats().drawCalls,
      names,
    };
  });
}

test.describe('fixture styles', () => {
  for (const style of STYLE_NAMES) {
    test(`golden fixture style ${style} — budget, presence, screenshot`, async ({ page }) => {
      /** @type {string[]} */
      const errors = [];
      page.on('pageerror', (error) => errors.push(String(error)));
      await enterExploreWithStyle(page, style);
      const state = await overviewState(page);

      expect(state.drawCalls).toBeGreaterThan(0);
      expect(state.drawCalls).toBeLessThanOrEqual(88);
      expect(state.names).toContain('gondola');
      expect(state.names).toContain('shelf-tags');

      if (style === 'traditional') {
        expect(state.names).not.toContain('fixture-led');
        expect(state.names).not.toContain('fixture-endcap');
      }
      if (style === 'modern') {
        expect(state.names).toContain('fixture-led');
        expect(state.names).not.toContain('fixture-endcap');
      }
      if (style === 'supermart') {
        expect(state.names).toContain('fixture-led');
        expect(state.names).toContain('fixture-endcap');
        expect(state.names).toContain('fixture-chatti');
        expect(state.names).toContain('fixture-baskets');
        expect(state.names).toContain('fixture-grid');
      }

      await page.screenshot({ path: `test-results/golden-fixture-${style}.png`, fullPage: false });
      expect(errors).toEqual([]);
    });
  }

  test('golden fixture style swap — runtime rebuild stays clean and commerce keeps working', async ({ page }) => {
    /** @type {string[]} */
    const errors = [];
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });
    page.on('pageerror', (error) => errors.push(String(error)));
    await enterExploreWithStyle(page, 'traditional');
    await overviewState(page);

    await page.evaluate(() => {
      /** @type {any} */ (window).__sagarmatha.setFixtureStyle('supermart');
    });
    await page.waitForTimeout(800);
    const swapped = await page.evaluate(() => {
      /** @type {string[]} */
      const names = [];
      /** @type {any} */ (window).__sagarmatha.scene.traverse((/** @type {any} */ node) => {
        if (node.isMesh) names.push(node.name);
      });
      return { names, drawCalls: /** @type {any} */ (window).__sagarmatha.stats().drawCalls };
    });
    expect(swapped.names).toContain('fixture-grid');
    expect(swapped.drawCalls).toBeLessThanOrEqual(88);

    await page.click('.preset-btn[data-preset="Back Rack"]');
    await page.waitForTimeout(1500);
    await page.click('canvas', { position: { x: 640, y: 360 } });
    await page.screenshot({ path: 'test-results/golden-fixture-supermart-hover.png', fullPage: false });
    expect(errors).toEqual([]);
  });
});
