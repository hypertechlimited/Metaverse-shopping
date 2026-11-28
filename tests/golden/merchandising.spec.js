import { test, expect } from '@playwright/test';

/** @param {import('@playwright/test').Page} page */
async function enterExplore(page) {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/?debug=1');
  await page.fill('.landing-input', 'Aarav');
  await page.click('.landing-enter');
  await page.waitForFunction(() => document.body.dataset.mode === 'explore', null, { timeout: 15000 });
  await page.waitForTimeout(1500);
}

/** @param {import('@playwright/test').Page} page */
async function flyToBackRack(page) {
  await page.click('.preset-btn[data-preset="Back Rack"]');
  await page.waitForFunction(
    () => {
      const x = parseFloat(document.body.dataset.camX ?? '');
      const y = parseFloat(document.body.dataset.camY ?? '');
      const z = parseFloat(document.body.dataset.camZ ?? '');
      return Math.hypot(x + 1.6, y - 1.6, z + 1.6) < 0.5;
    },
    null,
    { timeout: 15000 },
  );
  await page.waitForTimeout(1200);
}

/** @param {import('@playwright/test').Page} page @returns {Promise<{ facingCounts: Record<string, number>, rackVertexCount: number, meshNames: string[] }>} */
async function readShelfState(page) {
  return page.evaluate(() => {
    const scene = /** @type {any} */ (window).__sagarmatha?.scene;
    if (!scene) throw new Error('debug probe scene missing — run with ?debug=1');
    /** @type {Record<string, number>} */
    const facingCounts = {};
    let rackVertexCount = 0;
    /** @type {string[]} */
    const meshNames = [];
    scene.traverse((/** @type {any} */ node) => {
      meshNames.push(node.name);
      if (node.isInstancedMesh && typeof node.name === 'string' && node.name.startsWith('facings-')) {
        facingCounts[node.name] = node.count;
      }
      if (node.name === 'products-Back Rack') rackVertexCount = node.geometry.attributes.position.count;
    });
    return { facingCounts, rackVertexCount, meshNames };
  });
}

test('golden merchandising: gondola + facings + price rails, and sell-out empties truthfully', async ({ page }) => {
  test.setTimeout(180_000);
  await enterExplore(page);

  const stocked = await readShelfState(page);
  expect(stocked.meshNames).toContain('gondola');
  expect(stocked.meshNames).toContain('shelf-tags');
  expect(stocked.facingCounts['facings-pouch']).toBeGreaterThan(0);
  expect(stocked.facingCounts['facings-box']).toBeGreaterThan(0);
  expect(stocked.facingCounts['facings-bundle']).toBeGreaterThan(0);
  const totalStocked = Object.values(stocked.facingCounts).reduce((sum, count) => sum + count, 0);
  expect(totalStocked).toBeGreaterThan(10);

  await flyToBackRack(page);
  await page.screenshot({ path: 'test-results/golden-merchandising-rack.png', fullPage: false });

  await page.evaluate(() => {
    localStorage.setItem(
      'sagarmatha_metaverse_v3',
      JSON.stringify({ visitorName: 'Aarav', stockMap: { 'sakkhar-1kg': 0 }, cartArr: [] }),
    );
  });
  await page.reload();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.fill('.landing-input', 'Aarav');
  await page.click('.landing-enter');
  await page.waitForFunction(() => document.body.dataset.mode === 'explore', null, { timeout: 15000 });
  await page.waitForTimeout(1500);

  const soldOut = await readShelfState(page);
  const totalSoldOut = Object.values(soldOut.facingCounts).reduce((sum, count) => sum + count, 0);
  expect(soldOut.rackVertexCount).toBeLessThan(stocked.rackVertexCount);
  expect(totalSoldOut).toBeLessThan(totalStocked);

  await flyToBackRack(page);
  await page.screenshot({ path: 'test-results/golden-merchandising-soldout.png', fullPage: false });
});
