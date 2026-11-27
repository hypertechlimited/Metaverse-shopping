import { describe, it, expect } from 'vitest';
import { FACADES, facadesLayout } from '../../src/world/facades.js';
import { OBSTACLES } from '../../src/world/layout.js';

describe('galli facade stage', () => {
  const layout = facadesLayout();

  it('stages a hand-authored galli of 6-8 neighbor masses', () => {
    expect(layout.length).toBe(FACADES.blocks.length);
    expect(layout.length).toBeGreaterThanOrEqual(6);
    expect(layout.length).toBeLessThanOrEqual(8);
  });

  it('keeps every mass clear of the landing orbit and camera presets', () => {
    for (const block of layout) {
      const nearest = Math.hypot(
        Math.max(Math.abs(block.x) - block.width / 2, 0),
        Math.max(Math.abs(block.z) - block.depth / 2, 0),
      );
      expect(nearest).toBeGreaterThanOrEqual(11.5);
    }
  });

  it('keeps every mass inside the fog read', () => {
    for (const block of layout) {
      const farthest = Math.hypot(
        Math.abs(block.x) + block.width / 2,
        Math.abs(block.z) + block.depth / 2,
      );
      expect(farthest).toBeLessThanOrEqual(26);
    }
  });

  it('never overlaps the shop obstacles or each other', () => {
    for (const block of layout) {
      for (const box of OBSTACLES) {
        const overlaps =
          block.x - block.width / 2 < box.maxX &&
          block.x + block.width / 2 > box.minX &&
          block.z - block.depth / 2 < box.maxZ &&
          block.z + block.depth / 2 > box.minZ;
        expect(overlaps).toBe(false);
      }
    }
    for (let i = 0; i < layout.length; i++) {
      for (let j = i + 1; j < layout.length; j++) {
        const a = layout[i];
        const b = layout[j];
        const overlaps =
          Math.abs(a.x - b.x) < (a.width + b.width) / 2 &&
          Math.abs(a.z - b.z) < (a.depth + b.depth) / 2;
        expect(overlaps).toBe(false);
      }
    }
  });

  it('is deterministic, street-facing, and within the height band', () => {
    expect(facadesLayout()).toEqual(facadesLayout());
    for (const block of layout) {
      expect(['north', 'south', 'east', 'west']).toContain(block.facing);
      expect(block.height).toBeGreaterThanOrEqual(3.4);
      expect(block.height).toBeLessThanOrEqual(6.5);
    }
  });
});
