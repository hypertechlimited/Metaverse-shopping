import { describe, it, expect } from 'vitest';
import { PROPS, PROP_NAMES, PROPS_DRAW_CALL_BUDGET, propPlacements, sackPlacements, scatterPlacements } from '../../src/world/props.js';
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

  it('merges same-material parts so props cost at most 9 draw calls', () => {
    expect(PROP_NAMES.length).toBe(6);
    expect(PROPS_DRAW_CALL_BUDGET).toBeLessThanOrEqual(9);
  });
});

describe('physical hero materials', () => {
  it('gives the glazed jars a clearcoat ceramic finish', () => {
    expect(PROPS.glaze.clearcoat).toBeGreaterThanOrEqual(0.8);
    expect(PROPS.glaze.clearcoatRoughness).toBeLessThan(0.4);
    expect(PROPS.glaze.roughness).toBeGreaterThan(0.1);
  });

  it('renders the chiya glass with real transmission, not an opacity fake', () => {
    expect(PROPS.glassPane.transmission).toBeGreaterThan(0.5);
    expect(PROPS.glassPane.thickness).toBeGreaterThan(0);
    expect(PROPS.glassPane.ior).toBeGreaterThanOrEqual(1.3);
    expect(PROPS.glassPane.ior).toBeLessThanOrEqual(1.6);
  });
});

describe('instanced ground scatter', () => {
  const scatter = scatterPlacements();

  it('is deterministic across calls', () => {
    expect(scatterPlacements()).toEqual(scatter);
  });

  it('seeds pebbles and petals at the named-constant counts', () => {
    expect(scatter.pebbles.length).toBe(PROPS.scatter.pebbleCount);
    expect(scatter.petals.length).toBe(PROPS.scatter.petalCount);
    expect(PROPS.scatter.pebbleCount + PROPS.scatter.petalCount).toBeGreaterThanOrEqual(100);
  });

  it('keeps every instance clear of obstacles and the aripana mandala', () => {
    for (const spot of [...scatter.pebbles, ...scatter.petals]) {
      for (const box of OBSTACLES) {
        const inside =
          spot.x > box.minX - 0.001 &&
          spot.x < box.maxX + 0.001 &&
          spot.z > box.minZ - 0.001 &&
          spot.z < box.maxZ + 0.001;
        expect(inside).toBe(false);
      }
      const mandalaDistance = Math.hypot(spot.x - MANDALA.southPosition[0], spot.z - MANDALA.southPosition[2]);
      expect(mandalaDistance).toBeGreaterThan(MANDALA.size / 2);
    }
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
