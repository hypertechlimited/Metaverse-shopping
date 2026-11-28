import { test, expect } from '@playwright/test';

const OBSTACLES = [
  { name: 'Back Brick Wall', minX: -5.1, maxX: 1.7, minZ: -5.1, maxZ: -4.4 },
  { name: 'Left Brick Wall', minX: -5.1, maxX: -4.4, minZ: -5.1, maxZ: 1.7 },
  { name: 'Wooden Counter', minX: -2.6, maxX: 0.9, minZ: 0.0, maxZ: 1.1 },
  { name: 'Back Shelf Rack', minX: -4.4, maxX: 1.1, minZ: -4.45, maxZ: -3.55 },
  { name: 'Corner Pillar', minX: 1.1, maxX: 1.65, minZ: 1.1, maxZ: 1.65 },
];

const PLAYER_RADIUS = 0.45;

/** @type {Array<{ name: string, position: [number, number, number] }>} */
const PRESETS = [
  { name: 'Entrance', position: [6.8, 2.9, 7.6] },
  { name: 'Counter', position: [-0.8, 1.6, 3.2] },
  { name: 'Back Rack', position: [-1.6, 1.6, -1.6] },
  { name: 'Front Pedi', position: [1.0, 1.5, 4.6] },
  { name: 'Corner', position: [3.4, 1.6, 3.4] },
  { name: 'Overview', position: [7.4, 4.6, 7.4] },
  { name: 'Dusk', position: [-8.2, 2.1, 8.2] },
];

/** @param {string} name */
const slug = (name) => name.toLowerCase().replace(/\s+/g, '-');

/** @param {import('@playwright/test').Page} page */
async function enterExplore(page) {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.fill('.landing-input', 'Aarav');
  await page.click('.landing-enter');
  await page.waitForFunction(() => document.body.dataset.mode === 'explore', null, { timeout: 15000 });
}

/** @param {import('@playwright/test').Page} page */
async function cameraPosition(page) {
  return page.evaluate(() => ({
    x: parseFloat(document.body.dataset.camX ?? ''),
    y: parseFloat(document.body.dataset.camY ?? ''),
    z: parseFloat(document.body.dataset.camZ ?? ''),
  }));
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} name
 * @param {[number, number, number]} position
 */
async function flyToPreset(page, name, position) {
  await page.click(`.preset-btn[data-preset="${name}"]`);
  await page.waitForFunction(() => document.body.dataset.mode === 'explore', null, { timeout: 15000 });
  const positionSeen = await cameraPosition(page);
  const distance = Math.hypot(positionSeen.x - position[0], positionSeen.y - position[1], positionSeen.z - position[2]);
  expect(distance, `preset ${name}`).toBeLessThan(0.5);
  await page.screenshot({ path: `test-results/golden-preset-${slug(name)}.png`, fullPage: false });
}

test('golden presets — navigate all seven camera presets', async ({ page }) => {
  test.setTimeout(180_000);
  /** @type {string[]} */
  const errors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(String(error)));

  await enterExplore(page);

  await expect(page.locator('.preset-bar')).toBeVisible();
  await expect(page.locator('.preset-btn')).toHaveCount(8);

  for (const preset of PRESETS) {
    await flyToPreset(page, preset.name, preset.position);
  }

  expect(errors).toEqual([]);
});

test('golden tour — guided auto-tour flies presets and cancels on drag', async ({ page }) => {
  await enterExplore(page);

  await page.click('.preset-tour');
  await expect(page.locator('.preset-tour')).toHaveAttribute('aria-pressed', 'true');
  await page.waitForFunction(
    () => document.body.dataset.camX !== undefined && document.body.dataset.mode === 'explore',
    null,
    { timeout: 15000 },
  );

  await page.mouse.move(700, 400);
  await page.mouse.down();
  await page.mouse.move(760, 400, { steps: 8 });
  await page.mouse.up();

  await expect(page.locator('.preset-tour')).toHaveAttribute('aria-pressed', 'false');
});

test('golden collision — walking cannot pass through any obstacle', async ({ page }) => {
  await enterExplore(page);

  await page.keyboard.down('KeyW');
  await page.waitForTimeout(12000);
  await page.keyboard.up('KeyW');

  const walked = await cameraPosition(page);
  const backWall = OBSTACLES.find((box) => box.name === 'Back Brick Wall');
  if (!backWall) throw new Error('spec table must define the back wall');
  expect(walked.z).toBeGreaterThan(backWall.minZ);
  for (const box of OBSTACLES) {
    const dx = Math.max(box.minX - walked.x, 0, walked.x - box.maxX);
    const dz = Math.max(box.minZ - walked.z, 0, walked.z - box.maxZ);
    const distance = Math.hypot(dx, dz);
    expect(distance, `clear of ${box.name}`).toBeGreaterThanOrEqual(PLAYER_RADIUS - 0.02);
  }

  await page.keyboard.down('KeyS');
  await page.waitForTimeout(12000);
  await page.keyboard.up('KeyS');

  const retreated = await cameraPosition(page);
  expect(retreated.x).toBeGreaterThanOrEqual(-14);
  expect(retreated.x).toBeLessThanOrEqual(14);
  expect(retreated.z).toBeGreaterThanOrEqual(-14);
  expect(retreated.z).toBeLessThanOrEqual(14);

  await page.screenshot({ path: 'test-results/golden-collision.png', fullPage: false });
});

test('golden hover — rack product tooltip, highlight, click opens inspector', async ({ page }) => {
  /** @type {string[]} */
  const errors = [];
  page.on('pageerror', (error) => errors.push(String(error)));

  await enterExplore(page);
  await flyToPreset(page, 'Back Rack', PRESETS[2].position);

  await page.mouse.move(640, 360, { steps: 4 });
  await expect(page.locator('.hover-tip')).toBeVisible();
  await expect(page.locator('.hover-tip-np')).toContainText('मुसुरो दाल');
  await expect(page.locator('.hover-tip-meta')).toContainText('रू 190');

  await page.screenshot({ path: 'test-results/golden-hover.png', fullPage: false });

  await page.mouse.click(640, 360);
  await expect(page.locator('.inspector')).toBeVisible();
  await expect(page.locator('.inspector-name-en')).toContainText('Red lentils');

  await page.keyboard.press('Escape');
  await expect(page.locator('.inspector')).toHaveCount(0);

  expect(errors).toEqual([]);
});

test('golden explore d-pad — movement steps with collision', async ({ page }) => {
  test.setTimeout(180_000);
  await page.setViewportSize({ width: 640, height: 360 });
  await enterExplore(page);

  const before = await cameraPosition(page);

  for (let i = 0; i < 5; i++) {
    await page.locator('.dpad-up').click({ force: true });
  }
  const after = await cameraPosition(page);
  const moved = Math.hypot(after.x - before.x, after.z - before.z);
  expect(moved).toBeGreaterThan(0.5);

  for (let i = 0; i < 40; i++) {
    await page.locator('.dpad-up').click({ force: true });
  }
  const pinned = await cameraPosition(page);
  for (const box of OBSTACLES) {
    const dx = Math.max(box.minX - pinned.x, 0, pinned.x - box.maxX);
    const dz = Math.max(box.minZ - pinned.z, 0, pinned.z - box.maxZ);
    expect(Math.hypot(dx, dz), `clear of ${box.name}`).toBeGreaterThanOrEqual(PLAYER_RADIUS - 0.02);
  }
});
