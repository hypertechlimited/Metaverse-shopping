import { describe, it, expect } from 'vitest';
import { MANDALA, MANDALA_RINGS, petalAngles, ringRadii } from '../../src/world/mandala.js';

describe('aripana mandala geometry', () => {
  it('uses the traditional eight-petal lotus', () => {
    const angles = petalAngles(MANDALA.petalCount);
    expect(MANDALA.petalCount).toBe(8);
    expect(angles).toHaveLength(8);
    expect(new Set(angles).size).toBe(8);
    expect(angles[2]).toBeCloseTo((2 / 8) * Math.PI * 2, 12);
  });

  it('rings strictly ascend from the mustard-oil center to the outer edge', () => {
    const radii = ringRadii();
    expect(radii[0]).toBe(MANDALA_RINGS.outerRing);
    expect(radii).toEqual([...radii].sort((a, b) => b - a));
    for (const radius of radii) expect(radius).toBeLessThanOrEqual(1);
  });

  it('places mandalas at both perpendicular thresholds inside the street bounds', () => {
    expect(MANDALA.southPosition).toHaveLength(3);
    expect(MANDALA.eastPosition).toHaveLength(3);
    expect(MANDALA.southPosition[2]).toBeGreaterThan(1.7);
    expect(MANDALA.eastPosition[0]).toBeGreaterThan(1.7);
    expect(Math.abs(MANDALA.southPosition[0])).toBeLessThan(14);
    expect(Math.abs(MANDALA.eastPosition[2])).toBeLessThan(14);
    expect(MANDALA.ySouth).toBeGreaterThan(0);
    expect(MANDALA.yEast).toBeGreaterThan(MANDALA.ySouth);
  });
});
