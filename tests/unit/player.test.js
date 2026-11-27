import { describe, it, expect } from 'vitest';
import { createPlayer, yawToward, PLAYER } from '../../src/engine/player.js';
import { OBSTACLES, PLAYER_RADIUS, STREET, ENTER_POSITION } from '../../src/world/layout.js';

/** @param {number} x @param {number} z @param {{ minX: number, maxX: number, minZ: number, maxZ: number }} box @returns {number} */
function distanceToBox(x, z, box) {
  const dx = Math.max(box.minX - x, 0, x - box.maxX);
  const dz = Math.max(box.minZ - z, 0, z - box.maxZ);
  return Math.hypot(dx, dz);
}

const spawn = () => createPlayer({ position: [5, 2.9, 5], yaw: Math.PI, boxes: OBSTACLES, street: STREET });

describe('player movement', () => {
  it('moves forward along yaw at moveSpeed per second', () => {
    const player = spawn();
    player.setMoveInput(1, 0);
    player.update(0.5);
    const dx = player.getX() - 5;
    const dz = player.getZ() - 5;
    expect(Math.hypot(dx, dz)).toBeCloseTo(PLAYER.moveSpeed * 0.5, 5);
    expect(dz).toBeLessThan(0);
  });

  it('yaw = PI faces -Z, so forward motion decreases z', () => {
    const player = spawn();
    player.setMoveInput(1, 0);
    player.update(0.25);
    expect(player.getZ()).toBeLessThan(5);
  });

  it('strafes perpendicular to facing', () => {
    const player = spawn();
    player.setMoveInput(0, 1);
    player.update(0.25);
    expect(player.getX()).toBeGreaterThan(5);
  });

  it('turn input rotates yaw at turnSpeed', () => {
    const player = spawn();
    player.setTurnInput(1);
    player.update(1);
    expect(player.getYaw()).toBeCloseTo(Math.PI + PLAYER.turnSpeed, 5);
  });

  it('zero input keeps position fixed', () => {
    const player = spawn();
    player.update(1);
    expect(player.getX()).toBe(5);
    expect(player.getZ()).toBe(5);
  });

  it('ignores NaN and non-positive deltas', () => {
    const player = spawn();
    player.setMoveInput(1, 0);
    player.update(Number.NaN);
    player.update(0);
    player.update(-1);
    expect(player.getX()).toBe(5);
  });

  it('stepForward moves a fixed distance with collision', () => {
    const player = spawn();
    player.stepTurn(Math.PI / 2);
    player.stepForward(1);
    expect(Math.hypot(player.getX() - 5, player.getZ() - 5)).toBeCloseTo(1, 5);
  });
});

describe('player collision', () => {
  it('cannot walk into the wooden counter', () => {
    const player = createPlayer({ position: [-0.8, PLAYER.eyeHeight, 3], yaw: Math.PI, boxes: OBSTACLES, street: STREET });
    player.setMoveInput(1, 0);
    for (let i = 0; i < 600; i++) player.update(1 / 60);
    const counter = /** @type {{ minX: number, maxX: number, minZ: number, maxZ: number }} */ (OBSTACLES.find((box) => box.name === 'Wooden Counter'));
    expect(distanceToBox(player.getX(), player.getZ(), counter)).toBeGreaterThanOrEqual(PLAYER_RADIUS - 1e-6);
  });

  it('cannot leave the street clamps', () => {
    const player = createPlayer({ position: [13, PLAYER.eyeHeight, 13], yaw: Math.PI / 4, boxes: OBSTACLES, street: STREET });
    player.setMoveInput(1, 0);
    for (let i = 0; i < 1200; i++) player.update(1 / 60);
    expect(player.getX()).toBeLessThanOrEqual(STREET.maxX);
    expect(player.getZ()).toBeLessThanOrEqual(STREET.maxZ);
    expect(player.getX()).toBeGreaterThanOrEqual(STREET.minX);
    expect(player.getZ()).toBeGreaterThanOrEqual(STREET.minZ);
  });
});

describe('player eye settle', () => {
  it('approaches eye height monotonically from the enter position', () => {
    const player = createPlayer({ position: [...ENTER_POSITION], yaw: 0, boxes: OBSTACLES, street: STREET });
    expect(player.getEye()).toBeCloseTo(2.9, 5);
    let previous = player.getEye();
    for (let i = 0; i < 240; i++) {
      player.update(1 / 60);
      expect(player.getEye()).toBeLessThanOrEqual(previous + 1e-9);
      expect(player.getEye()).toBeGreaterThanOrEqual(PLAYER.eyeHeight);
      previous = player.getEye();
    }
    expect(player.getEye()).toBe(PLAYER.eyeHeight);
  });

  it('reduced motion snaps eye height instantly', () => {
    const player = createPlayer({ position: [...ENTER_POSITION], yaw: 0, boxes: OBSTACLES, street: STREET, reducedMotion: true });
    player.update(1 / 60);
    expect(player.getEye()).toBe(PLAYER.eyeHeight);
  });
});

describe('player sync & look', () => {
  it('syncFrom resets pose for preset hand-offs', () => {
    const player = spawn();
    player.setMoveInput(1, 0);
    player.update(1);
    player.syncFrom([-2, 1.6, 4], 0.5);
    expect(player.getX()).toBe(-2);
    expect(player.getZ()).toBe(4);
    expect(player.getEye()).toBe(1.6);
    expect(player.getYaw()).toBe(0.5);
  });

  it('visitor eye holds aerial preset height until the player moves', () => {
    const player = spawn();
    player.syncFrom([7.4, 4.6, 7.4], 0);
    expect(player.isVisitorEye()).toBe(true);
    player.update(1);
    player.update(1);
    expect(player.getEye()).toBe(4.6);
    player.setMoveInput(1, 0);
    player.update(1);
    expect(player.getEye()).toBe(PLAYER.eyeHeight);
    expect(player.isVisitorEye()).toBe(false);
  });

  it('turning releases the visitor eye without easing lag', () => {
    const player = createPlayer({ position: [5, 2.9, 5], yaw: Math.PI, boxes: OBSTACLES, street: STREET, reducedMotion: false });
    player.syncFrom([7.4, 4.6, 7.4], 0);
    player.stepTurn(0.2);
    player.update(0.1);
    expect(player.getEye()).toBeLessThan(4.6);
    expect(player.getEye()).toBeGreaterThan(PLAYER.eyeHeight);
  });

  it('yawToward faces from position toward lookAt', () => {
    expect(yawToward(ENTER_POSITION, [0, 1.2, 0])).toBeCloseTo(Math.atan2(-6.8, -7.6), 10);
    expect(yawToward([0, 1, 0], [0, 1, 5])).toBeCloseTo(0, 10);
  });

  it('applies a duck-typed camera like cameraRig', () => {
    const player = createPlayer({ position: [1, 2.9, 2], yaw: 0.7, boxes: OBSTACLES, street: STREET, reducedMotion: true });
    player.update(1 / 60);
    /** @type {any} */
    const camera = {
      position: {
        x: 0,
        y: 0,
        z: 0,
        /** @param {number} x @param {number} y @param {number} z */
        set(x, y, z) { this.x = x; this.y = y; this.z = z; },
      },
      lookAts: [],
      /** @param {number} x @param {number} y @param {number} z */
      lookAt(x, y, z) { this.lookAts.push([x, y, z]); },
    };
    player.apply(camera);
    expect(camera.position.x).toBe(1);
    expect(camera.position.y).toBe(PLAYER.eyeHeight);
    expect(camera.lookAts).toHaveLength(1);
  });

  it('rejects a missing position', () => {
    expect(() => createPlayer({ position: /** @type {any} */ (null), yaw: 0, boxes: OBSTACLES, street: STREET })).toThrow();
    expect(() => createPlayer({ position: /** @type {[number, number, number]} */ (/** @type {unknown} */ ([0, 0])), yaw: 0, boxes: /** @type {any} */ ([]), street: STREET })).toThrow();
  });
});
