import { describe, it, expect } from 'vitest';
import { NAV, buildNavGrid, cellCenter, findPath, isWalkable, lineOfSight, stringPull, mulberry32 } from '../../src/engine/nav.js';
import { OBSTACLES, STREET, PLAYER_RADIUS } from '../../src/world/layout.js';

const grid = buildNavGrid(OBSTACLES, STREET, { radius: PLAYER_RADIUS });

const inflated = OBSTACLES.map((box) => ({
  name: box.name,
  minX: box.minX - PLAYER_RADIUS,
  maxX: box.maxX + PLAYER_RADIUS,
  minZ: box.minZ - PLAYER_RADIUS,
  maxZ: box.maxZ + PLAYER_RADIUS,
}));

/** @param {[number, number][]} path @param {Array<{ minX: number, maxX: number, minZ: number, maxZ: number }>} [boxes] @returns {boolean} every sampled point stands clear */
const pathClear = (path, boxes = OBSTACLES) => {
  const clearBoxes = boxes.map((box) => ({
    minX: box.minX - PLAYER_RADIUS,
    maxX: box.maxX + PLAYER_RADIUS,
    minZ: box.minZ - PLAYER_RADIUS,
    maxZ: box.maxZ + PLAYER_RADIUS,
  }));
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1];
    const b = path[i];
    const steps = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 0.2));
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      const x = a[0] + (b[0] - a[0]) * t;
      const z = a[1] + (b[1] - a[1]) * t;
      for (const box of clearBoxes) {
        if (x >= box.minX && x <= box.maxX && z >= box.minZ && z <= box.maxZ) return false;
      }
    }
  }
  return true;
};

describe('nav grid', () => {
  it('covers the street at the configured cell size', () => {
    expect(grid.cellSize).toBe(NAV.cellSize);
    expect(grid.cols).toBe(Math.ceil((STREET.maxX - STREET.minX) / NAV.cellSize));
    expect(grid.rows).toBe(Math.ceil((STREET.maxZ - STREET.minZ) / NAV.cellSize));
    expect(grid.blocked.length).toBe(grid.cols * grid.rows);
  });

  it('blocks cells inside inflated obstacles and keeps shelf-adjacent aisles walkable', () => {
    expect(isWalkable(grid, -0.8, 0.5)).toBe(false);
    expect(isWalkable(grid, 0, 2.4)).toBe(true);
  });

  it('treats points outside the street as unwalkable', () => {
    expect(isWalkable(grid, -20, 0)).toBe(false);
    expect(isWalkable(grid, 0, 20)).toBe(false);
    expect(isWalkable(grid, STREET.maxX + 0.1, 0)).toBe(false);
  });

  it('cellCenter maps back into the cell', () => {
    const [x, z] = cellCenter(grid, 0, 0);
    expect(x).toBeCloseTo(STREET.minX + NAV.cellSize / 2, 10);
    expect(z).toBeCloseTo(STREET.minZ + NAV.cellSize / 2, 10);
  });

  it('throws on non-positive cell size', () => {
    expect(() => buildNavGrid(OBSTACLES, STREET, { cellSize: 0 })).toThrow();
  });
});

describe('line of sight', () => {
  it('sees across an open street and not through the counter', () => {
    expect(lineOfSight(grid, [3, 3], [6, 6])).toBe(true);
    expect(lineOfSight(grid, [0, 3], [0, -3])).toBe(false);
  });
});

describe('findPath', () => {
  it('routes around the counter from the front to the back rack', () => {
    const path = /** @type {[number, number][]} */ (findPath(grid, [0, 3], [0, -2]));
    expect(path).not.toBeNull();
    expect(path.length).toBeGreaterThanOrEqual(2);
    expect(pathClear(path)).toBe(true);
  });

  it('returns a single-point path when start equals goal', () => {
    const path = /** @type {[number, number][]} */ (findPath(grid, [5, 5], [5.05, 5.05]));
    expect(path.length).toBe(1);
  });

  it('snaps start and goal to the nearest walkable cell', () => {
    const path = /** @type {[number, number][]} */ (findPath(grid, [-0.8, 0.5], [5, 5]));
    expect(path).not.toBeNull();
    expect(pathClear(path)).toBe(true);
  });

  it('returns null when start or goal sits in a pocket sealed off from the street', () => {
    const sealed = [
      { name: 'vault-n', minX: -12, maxX: -8, minZ: -12, maxZ: -11 },
      { name: 'vault-s', minX: -12, maxX: -8, minZ: -9, maxZ: -8 },
      { name: 'vault-w', minX: -12, maxX: -11, minZ: -12, maxZ: -8 },
      { name: 'vault-e', minX: -9, maxX: -8, minZ: -12, maxZ: -8 },
    ];
    const vaultGrid = buildNavGrid([...OBSTACLES, ...sealed], STREET, { radius: PLAYER_RADIUS });
    expect(findPath(vaultGrid, [-10, -10], [10, 10])).toBeNull();
    expect(findPath(vaultGrid, [10, 10], [-10, -10])).toBeNull();
  });

  it('never cuts diagonal corners through inflated obstacles', () => {
    const gap = [
      { name: 'pillar-a', minX: 5, maxX: 7, minZ: 5, maxZ: 7 },
      { name: 'pillar-b', minX: 5, maxX: 7, minZ: 7.6, maxZ: 9.6 },
      { name: 'pillar-c', minX: 7.6, maxX: 9.6, minZ: 5, maxZ: 7 },
    ];
    const cornerGrid = buildNavGrid([...OBSTACLES, ...gap], STREET, { radius: PLAYER_RADIUS });
    const path = /** @type {[number, number][]} */ (findPath(cornerGrid, [9, 9], [4, 4]));
    expect(path).not.toBeNull();
    expect(pathClear(/** @type {[number, number][]} */ (path))).toBe(true);
  });
});

describe('string pulling', () => {
  it('collapses a dense staircase into a few waypoints', () => {
    const dense = /** @type {[number, number][]} */ (Array.from({ length: 20 }, (_, i) => [3 + i * 0.1, 3 + (i % 2) * 0.1]));
    const pulled = stringPull(grid, dense);
    expect(pulled.length).toBeLessThan(dense.length);
    expect(pulled[0]).toEqual(dense[0]);
    expect(pulled[pulled.length - 1]).toEqual(dense[dense.length - 1]);
  });
});

describe('fuzz — random obstacle fields', () => {
  it('every returned path stands clear of every inflated obstacle', () => {
    const random = mulberry32(20261128);
    for (let field = 0; field < 40; field++) {
      const boxes = /** @type {Array<{ name: string, minX: number, maxX: number, minZ: number, maxZ: number }>} */ ([]);
      for (let i = 0; i < 4; i++) {
        const cx = -10 + random() * 20;
        const cz = -10 + random() * 20;
        const w = 0.5 + random() * 2;
        const d = 0.5 + random() * 2;
        boxes.push({ name: `f${field}-${i}`, minX: cx - w / 2, maxX: cx + w / 2, minZ: cz - d / 2, maxZ: cz + d / 2 });
      }
      const fuzzGrid = buildNavGrid(boxes, STREET, { radius: PLAYER_RADIUS });
      for (let attempt = 0; attempt < 5; attempt++) {
        /** @type {[number, number]} */ const from = [-13 + random() * 26, -13 + random() * 26];
        /** @type {[number, number]} */ const to = [-13 + random() * 26, -13 + random() * 26];
        const path = findPath(fuzzGrid, from, to);
        if (!path) continue;
        expect(pathClear(path, boxes), `field ${field} attempt ${attempt}`).toBe(true);
        const first = path[0];
        const last = path[path.length - 1];
        expect(Math.hypot(first[0] - from[0], first[1] - from[1])).toBeLessThanOrEqual(NAV.snapSearchCells * NAV.cellSize + NAV.cellSize);
        expect(Math.hypot(last[0] - to[0], last[1] - to[1])).toBeLessThanOrEqual(NAV.snapSearchCells * NAV.cellSize + NAV.cellSize);
        expect(Number.isFinite(path.reduce((sum, point, i) => i === 0 ? 0 : sum + Math.hypot(point[0] - path[i - 1][0], point[1] - path[i - 1][1]), 0))).toBe(true);
      }
    }
  });

  it('is deterministic for the same seed', () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    for (let i = 0; i < 10; i++) expect(a()).toBe(b());
  });
});
