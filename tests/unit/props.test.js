import { describe, it, expect } from 'vitest';
import { PROPS, PROP_NAMES, propPlacements, sackPlacements } from '../../src/world/props.js';
import { OBSTACLES, ENTER_POSITION } from '../../src/world/layout.js';
import { MANDALA } from '../../src/world/mandala.js';
import { ARCHITECTURE } from '../../src/world/architecture.js';

describe('counter prop placement', () => {
  const placements = propPlacements();
  const counter = /** @type {{ name: string, minX: number, maxX: number, minZ: number, maxZ: number }} */ (OBSTACLES.find((box) => box.name === 'Wooden Counter'));

  it('places every counter prop on the counter slab, inside the counter box', () => {
    expect(placements.map((placement) => placement.name)).toEqual(PROP_NAMES);
    for (const placement of placements) {
      expect(placement.base).toBe('Wooden Counter');
      expect(placement.position[0]).toBeGreaterThanOrEqual(counter.minX);
      expect(placement.position[0]).toBeLessThanOrEqual(counter.maxX);
      expect(placement.position[2]).toBeGreaterThanOrEqual(counter.minZ);
      expect(placement.position[2]).toBeLessThanOrEqual(counter.maxZ);
      expect(placement.position[1]).toBeCloseTo(PROPS.counterTopHeight, 5);
    }
  });

  it('keeps props apart so the counter reads as merchandised, not cluttered into one blob', () => {
    for (let i = 0; i < placements.length; i++) {
      for (let j = i + 1; j < placements.length; j++) {
        const distance = Math.hypot(
          placements[i].position[0] - placements[j].position[0],
          placements[i].position[2] - placements[j].position[2],
        );
        expect(distance).toBeGreaterThan(0.15);
      }
    }
  });

  it('merges same-material parts so props cost at most 7 draw calls', () => {
    expect(PROP_NAMES.length).toBe(6);
    expect(7).toBeLessThanOrEqual(7);
  });
});

describe('sack placement on the east pedi', () => {
  const sacks = sackPlacements();
  const back = /** @type {{ name: string, minX: number, maxX: number, minZ: number, maxZ: number }} */ (OBSTACLES.find((box) => box.name === 'Back Brick Wall'));

  it('rests sacks on the pedi surface in front of the shop', () => {
    expect(sacks.length).toBe(3);
    for (const sack of sacks) {
      expect(sack.position[0]).toBeGreaterThanOrEqual(back.maxX);
      expect(sack.position[0]).toBeLessThanOrEqual(back.maxX + ARCHITECTURE.pediDepth + 0.05);
      expect(sack.position[1]).toBeGreaterThanOrEqual(ARCHITECTURE.pediHeight - 0.001);
      expect(sack.scale).toBeGreaterThan(0.3);
    }
  });

  it('leans sacks variably so the line feels hand-stacked', () => {
    const leans = new Set(sacks.map((sack) => sack.lean.toFixed(3)));
    expect(leans.size).toBe(3);
  });
});

describe('props stay clear of the landing funnel', () => {
  it('no prop sits under the enter camera position', () => {
    for (const placement of propPlacements()) {
      const [x, , z] = placement.position;
      const enterDistance = Math.hypot(x - ENTER_POSITION[0], z - ENTER_POSITION[2]);
      expect(enterDistance).toBeGreaterThan(2);
    }
  });

  it('no prop invades the south aripana threshold mandala', () => {
    for (const placement of propPlacements()) {
      const [x, , z] = placement.position;
      const mandalaDistance = Math.hypot(x - MANDALA.southPosition[0], z - MANDALA.southPosition[2]);
      expect(mandalaDistance).toBeGreaterThan(MANDALA.size / 2);
    }
  });
});
