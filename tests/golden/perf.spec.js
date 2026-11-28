import { test, expect } from '@playwright/test';

const DRAW_CALL_BUDGET = 80;
const PAYLOAD_BUDGET_BYTES = 5 * 1024 * 1024;
const FOUR_G = { latencyMs: 100, downloadBytesPerSecond: 750_000, uploadBytesPerSecond: 250_000 };
const FOUR_G_BUDGET_SECONDS = 5;

/** @param {import('@playwright/test').Page} page */
async function enterExplore(page) {
  await page.goto('/?debug=1');
  await page.waitForSelector('.landing');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.click('.landing-enter');
  await page.waitForFunction(() => document.body.dataset.mode === 'explore', null, { timeout: 15000 });
}

test('golden perf: draw calls within budget at steady state', async ({ page }) => {
  await enterExplore(page);
  await page.waitForTimeout(2000);
  await page.click('.preset-btn[data-preset="Overview"]');
  await page.waitForTimeout(2500);
  const stats = await page.evaluate(() => (/** @type {any} */ (window)).__sagarmatha.stats());
  expect(stats.drawCalls).toBeGreaterThan(0);
  expect(stats.drawCalls).toBeLessThanOrEqual(DRAW_CALL_BUDGET);
  await page.screenshot({ path: 'test-results/golden-perf-overview.png', fullPage: false });
});

test('golden perf: total scene payload within budget', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('.landing');
  await page.waitForLoadState('load');
  const payload = await page.evaluate(() => {
    const entries = /** @type {PerformanceResourceTiming[]} */ (performance.getEntriesByType('resource'));
    return {
      bytes: entries.reduce((sum, entry) => sum + (entry.decodedBodySize || entry.transferSize || 0), 0),
      count: entries.length,
    };
  });
  expect(payload.bytes).toBeGreaterThan(0);
  expect(payload.bytes).toBeLessThanOrEqual(PAYLOAD_BUDGET_BYTES);
});

test('golden perf: throttled 4G cold load captured as evidence', async ({ page }) => {
  const client = await page.context().newCDPSession(page);
  await client.send('Network.enable');
  await client.send('Network.emulateNetworkConditions', {
    offline: false,
    latency: FOUR_G.latencyMs,
    downloadThroughput: FOUR_G.downloadBytesPerSecond,
    uploadThroughput: FOUR_G.uploadBytesPerSecond,
  });
  const started = Date.now();
  await page.goto('/');
  await page.waitForSelector('.landing');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.click('.landing-enter');
  await page.waitForFunction(() => document.body.dataset.mode === 'explore', null, { timeout: 60000 });
  console.log('PERF-4G-COLD-LOAD-MS ' + (Date.now() - started));
});

test.describe('dpr2', () => {
  test.use({ deviceScaleFactor: 2 });

  test('golden perf: DPR 2 renders clean and captures FPS', async ({ page }) => {
    test.setTimeout(180_000);
    /** @type {string[]} */
    const errors = [];
    page.on('pageerror', (error) => errors.push(String(error)));
    await enterExplore(page);
    await page.waitForTimeout(2000);
    const stats = await page.evaluate(() => (/** @type {any} */ (window)).__sagarmatha.stats());
    expect(stats.drawCalls).toBeGreaterThan(0);
    console.log('PERF-DRAWCALLS-DPR2 ' + stats.drawCalls);
    const fps = await page.evaluate(async () => {
      const frames = /** @type {number[]} */ ([]);
      await new Promise((resolve) => {
        const start = performance.now();
        const tick = (/** @type {number} */ now) => {
          frames.push(now);
          if (now - start < 5000) requestAnimationFrame(tick);
          else resolve(null);
        };
        requestAnimationFrame(tick);
      });
      const span = frames[frames.length - 1] - frames[0];
      return (frames.length - 1) / (span / 1000);
    });
    console.log('PERF-FPS-DPR2 ' + fps.toFixed(2));
    expect(fps).toBeGreaterThan(0);
    await page.screenshot({ path: 'test-results/golden-perf-dpr2.png', fullPage: false });
    expect(errors).toEqual([]);
  });
});
