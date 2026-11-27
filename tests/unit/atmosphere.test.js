import { describe, it, expect } from 'vitest';
import { ATMOSPHERE, dustSeedPositions } from '../../src/world/atmosphere.js';

describe('dust motes', () => {
  it('stays under the 500-point performance budget', () => {
    expect(ATMOSPHERE.dustCountPerShaft * 2).toBeLessThan(500);
  });

  it('seeds deterministically inside the shaft volume', () => {
    const positions = dustSeedPositions(64, 5.2, ATMOSPHERE.southShaft);
    expect(positions).toHaveLength(64 * 3);
    const again = dustSeedPositions(64, 5.2, ATMOSPHERE.southShaft);
    expect(Array.from(positions)).toEqual(Array.from(again));
    for (let i = 0; i < 64; i++) {
      expect(positions[i * 3]).toBeGreaterThanOrEqual(ATMOSPHERE.southShaft.x[0]);
      expect(positions[i * 3]).toBeLessThanOrEqual(ATMOSPHERE.southShaft.x[1]);
      expect(positions[i * 3 + 1]).toBeGreaterThanOrEqual(ATMOSPHERE.southShaft.y[0]);
      expect(positions[i * 3 + 1]).toBeLessThanOrEqual(ATMOSPHERE.southShaft.y[1]);
      expect(positions[i * 3 + 2]).toBeGreaterThanOrEqual(ATMOSPHERE.southShaft.z[0]);
      expect(positions[i * 3 + 2]).toBeLessThanOrEqual(ATMOSPHERE.southShaft.z[1]);
    }
  });

  it('seeds the east shaft from a different stream', () => {
    const south = dustSeedPositions(16, 5.2, ATMOSPHERE.southShaft);
    const east = dustSeedPositions(16, 9.7, ATMOSPHERE.eastShaft);
    expect(Array.from(south)).not.toEqual(Array.from(east));
  });
});
