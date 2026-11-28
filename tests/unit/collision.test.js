import { describe, it, expect } from 'vitest';
import { resolveCircle, clampToStreet, moveWithCollision, obstacleBoxes } from '../../src/engine/collision.js';
import { OBSTACLES, PLAYER_RADIUS, STREET } from '../../src/world/layout.js';

const EPS = 1e-9;

/** @param {number} x @param {number} z @param {{ minX: number, maxX: number, minZ: number, maxZ: number }} box @returns {number} */
function distanceToBox(x, z, box) {
  const dx = Math.max(box.minX - x, 0, x - box.maxX);
  const dz = Math.max(box.minZ - z, 0, z - box.maxZ);
  return Math.hypot(dx, dz);
}

describe('resolveCircle', () => {
  it('leaves a position already outside every box untouched', () => {
    const result = resolveCircle(5, 5, PLAYER_RADIUS, OBSTACLES);
    expect(result.hit).toBe(false);
    expect(result.x).toBe(5);
    expect(result.z).toBe(5);
  });

  for (const box of OBSTACLES) {
    const centerX = (box.minX + box.maxX) / 2;
    const centerZ = (box.minZ + box.maxZ) / 2;

    const approaches = [
      { name: 'from -X', point: [box.minX + 0.1, centerZ], correctSide: (/** @type {{ x: number }} */ r) => r.x <= box.minX + EPS },
      { name: 'from +X', point: [box.maxX - 0.1, centerZ], correctSide: (/** @type {{ x: number }} */ r) => r.x >= box.maxX - EPS },
      { name: 'from -Z', point: [centerX, box.minZ + 0.1], correctSide: (/** @type {{ z: number }} */ r) => r.z <= box.minZ + EPS },
      { name: 'from +Z', point: [centerX, box.maxZ - 0.1], correctSide: (/** @type {{ z: number }} */ r) => r.z >= box.maxZ - EPS },
    ];

    for (const approach of approaches) {
      it(`pushes the player out of ${box.name} ${approach.name} on the approached side`, () => {
        const result = resolveCircle(approach.point[0], approach.point[1], PLAYER_RADIUS, [box]);
        expect(result.hit).toBe(true);
        expect(approach.correctSide(result)).toBe(true);
        expect(distanceToBox(result.x, result.z, box)).toBeGreaterThanOrEqual(PLAYER_RADIUS - EPS);
      });
    }

    it(`resolves a landing dead-center inside ${box.name}`, () => {
      const result = resolveCircle(centerX, centerZ, PLAYER_RADIUS, [box]);
      expect(result.hit).toBe(true);
      expect(distanceToBox(result.x, result.z, box)).toBeGreaterThanOrEqual(PLAYER_RADIUS - EPS);
    });
  }

  it('resolves the shared corner of both brick walls against both boxes', () => {
    const cornerX = -4.75 - PLAYER_RADIUS / 2;
    const cornerZ = -4.75 - PLAYER_RADIUS / 2;
    const walls = OBSTACLES.filter((box) => box.name.includes('Wall'));
    const result = resolveCircle(cornerX, cornerZ, PLAYER_RADIUS, walls);
    for (const wall of walls) {
      expect(distanceToBox(result.x, result.z, wall)).toBeGreaterThanOrEqual(PLAYER_RADIUS - EPS);
    }
  });

  it('handles a two-pass corner where one push re-enters another box', () => {
    const result = resolveCircle(-4.4 + 0.2, -4.4 + 0.2, PLAYER_RADIUS, OBSTACLES);
    for (const box of OBSTACLES) {
      expect(distanceToBox(result.x, result.z, box)).toBeGreaterThanOrEqual(PLAYER_RADIUS - EPS);
    }
  });
});

describe('clampToStreet', () => {
  it('clamps to [-14, 14] on both axes', () => {
    expect(clampToStreet(-20, 20)).toEqual({ x: -14, z: 14 });
    expect(clampToStreet(13, -13)).toEqual({ x: 13, z: -13 });
  });
});

describe('moveWithCollision', () => {
  it('walks freely on open street', () => {
    const result = moveWithCollision(5, 5, 1, 1, PLAYER_RADIUS, OBSTACLES, STREET);
    expect(result.x).toBeCloseTo(6);
    expect(result.z).toBeCloseTo(6);
  });

  it('stops at the counter face when walking straight into it', () => {
    const result = moveWithCollision(-0.8, 2.5, 0, -2.0, PLAYER_RADIUS, OBSTACLES, STREET);
    const counter = OBSTACLES.find((box) => box.name === 'Wooden Counter');
    if (!counter) throw new Error('layout.js must define the Wooden Counter');
    expect(result.z).toBeGreaterThanOrEqual(counter.maxZ + PLAYER_RADIUS - 1e-6);
  });

  it('never tunnels through the back wall in one large step', () => {
    const result = moveWithCollision(-1.6, 5, 0, -12, PLAYER_RADIUS, OBSTACLES, STREET);
    const back = OBSTACLES.find((box) => box.name === 'Back Brick Wall');
    if (!back) throw new Error('layout.js must define the Back Brick Wall');
    expect(result.z).toBeGreaterThan(back.minZ);
    expect(distanceToBox(result.x, result.z, back)).toBeGreaterThanOrEqual(PLAYER_RADIUS - 1e-6);
  });

  it('clamps at the street boundary after resolution', () => {
    const result = moveWithCollision(13.5, 13.5, 2, 2, PLAYER_RADIUS, OBSTACLES, STREET);
    expect(result.x).toBe(14);
    expect(result.z).toBe(14);
  });

  it('uses the live obstacle list from layout.js', () => {
    expect(obstacleBoxes()).toBe(OBSTACLES);
  });
});
