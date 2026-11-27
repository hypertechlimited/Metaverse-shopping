import { describe, it, expect } from 'vitest';
import { THEME, shadowCoversShop, contactDecals } from '../../src/world/theme.js';
import { OBSTACLES } from '../../src/world/layout.js';
import { SKY_COLORS, SKY, SKY_RIDGE_LAYERS, CONTACT_AO } from '../../src/world/art.js';

describe('theme lighting rig', () => {
  it('locks exposure and keeps budgets inside the render plan', () => {
    expect(THEME.exposure).toBeGreaterThan(0.8);
    expect(THEME.exposure).toBeLessThanOrEqual(1.2);
    expect(THEME.sun.shadowMapSize).toBe(2048);
    expect(THEME.sun.shadowRadius).toBeGreaterThanOrEqual(1);
    expect(THEME.sun.shadowNormalBias).toBeGreaterThan(0);
  });

  it('covers the whole shop footprint with the shadow frustum', () => {
    expect(shadowCoversShop(THEME.sun.shadowExtent)).toBe(true);
    expect(shadowCoversShop(THEME.sun.shadowExtent - 3)).toBe(false);
  });

  it('derives the sun from the golden-hour sky, not a neutral white', () => {
    expect(THEME.sun.color).toBe(0xffd7a3);
    expect(SKY_COLORS.horizon).toMatch(/^#/);
    expect(SKY_COLORS.zenith).not.toBe(SKY_COLORS.horizon);
    expect(CONTACT_AO.size).toBeGreaterThan(0);
  });

  it('softens fog density below the M0 baseline so the sky reads at distance', () => {
    expect(THEME.fogDensity).toBeLessThan(0.028);
  });

  it('re-grades IBL fill for the r187 energy-preserving pipeline', () => {
    expect(THEME.environmentIntensity).toBeGreaterThanOrEqual(0.5);
    expect(THEME.environmentIntensity).toBeLessThanOrEqual(0.8);
    expect(THEME.hemisphere.intensity).toBeGreaterThanOrEqual(0.6);
    expect(THEME.hemisphere.intensity).toBeLessThanOrEqual(0.8);
  });

  it('authors a sun disc and valley ridges into the equirect sky', () => {
    expect(SKY.glowX).toBeGreaterThan(0.5);
    expect(SKY.glowX).toBeLessThan(0.8);
    expect(SKY.discRadius).toBeLessThan(SKY.haloRadius);
    expect(SKY_RIDGE_LAYERS.length).toBe(2);
    expect(SKY.streakCount).toBeGreaterThan(4);
    expect(SKY.puffCount).toBeGreaterThan(2);
  });
});

describe('contact-occlusion decals', () => {
  it('patches the counter and pillar exactly over their layout boxes', () => {
    const counter = /** @type {{ name: string, x: number, z: number, width: number, depth: number }} */ (contactDecals().find((decal) => decal.name === 'Wooden Counter'));
    const pillar = /** @type {{ name: string, x: number, z: number, width: number, depth: number }} */ (contactDecals().find((decal) => decal.name === 'Corner Pillar'));
    const counterBox = /** @type {{ name: string, minX: number, maxX: number, minZ: number, maxZ: number }} */ (OBSTACLES.find((box) => box.name === 'Wooden Counter'));
    const pillarBox = /** @type {{ name: string, minX: number, maxX: number, minZ: number, maxZ: number }} */ (OBSTACLES.find((box) => box.name === 'Corner Pillar'));
    expect(counter).toBeDefined();
    expect(pillar).toBeDefined();
    expect(counter.x).toBeCloseTo((counterBox.minX + counterBox.maxX) / 2, 5);
    expect(counter.width).toBeGreaterThan(counterBox.maxX - counterBox.minX);
    expect(pillar.z).toBeCloseTo((pillarBox.minZ + pillarBox.maxZ) / 2, 5);
  });

  it('lays the pedi strips just outside the stone plinths, never on the walls', () => {
    const back = /** @type {{ name: string, minX: number, maxX: number, minZ: number, maxZ: number }} */ (OBSTACLES.find((box) => box.name === 'Back Brick Wall'));
    const left = /** @type {{ name: string, minX: number, maxX: number, minZ: number, maxZ: number }} */ (OBSTACLES.find((box) => box.name === 'Left Brick Wall'));
    const east = /** @type {{ name: string, x: number, z: number, width: number, depth: number }} */ (contactDecals().find((decal) => decal.name === 'East Pedi'));
    const south = /** @type {{ name: string, x: number, z: number, width: number, depth: number }} */ (contactDecals().find((decal) => decal.name === 'South Pedi'));
    expect(east.x).toBeGreaterThan(back.maxX);
    expect(east.depth).toBeGreaterThan(5);
    expect(south.z).toBeGreaterThan(left.maxZ);
    expect(south.width).toBeGreaterThan(5);
  });

  it('never shades the brick walls themselves', () => {
    for (const decal of contactDecals()) {
      expect(decal.name.includes('Wall')).toBe(false);
    }
  });
});
