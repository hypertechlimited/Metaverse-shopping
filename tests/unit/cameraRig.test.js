import { describe, it, expect } from 'vitest';
import { createCameraRig, easeOutCubic, RIG_DEFAULTS, RIG_MODES } from '../../src/engine/cameraRig.js';
import { LANDING_ORBIT, ENTER_POSITION } from '../../src/world/layout.js';

/** @returns {any} */
function fakeCamera() {
  /** @type {Array<{ type: string, x: number, y: number, z: number }>} */
  const calls = [];
  return {
    calls,
    position: {
      set(/** @type {number} */ x, /** @type {number} */ y, /** @type {number} */ z) {
        calls.push({ type: 'position', x, y, z });
      },
    },
    lookAt(/** @type {number} */ x, /** @type {number} */ y, /** @type {number} */ z) {
      calls.push({ type: 'lookAt', x, y, z });
    },
    lastPosition() {
      for (let i = calls.length - 1; i >= 0; i -= 1) {
        if (calls[i].type === 'position') return calls[i];
      }
      return null;
    },
    lastLookAt() {
      for (let i = calls.length - 1; i >= 0; i -= 1) {
        if (calls[i].type === 'lookAt') return calls[i];
      }
      return null;
    },
  };
}

/** @param {any} camera @param {Record<string, any>} [overrides] */
function makeRig(camera, overrides = {}) {
  return createCameraRig({
    camera,
    landingOrbit: LANDING_ORBIT,
    enterPosition: ENTER_POSITION,
    ...overrides,
  });
}

describe('easeOutCubic', () => {
  it('maps endpoints exactly', () => {
    expect(easeOutCubic(0)).toBe(0);
    expect(easeOutCubic(1)).toBe(1);
  });

  it('is monotonically non-decreasing with no overshoot', () => {
    let previous = 0;
    for (let i = 0; i <= 100; i += 1) {
      const value = easeOutCubic(i / 100);
      expect(value).toBeGreaterThanOrEqual(previous);
      expect(value).toBeLessThanOrEqual(1);
      previous = value;
    }
  });

  it('clamps inputs outside [0, 1]', () => {
    expect(easeOutCubic(-2)).toBe(0);
    expect(easeOutCubic(3)).toBe(1);
  });
});

describe('createCameraRig', () => {
  it('throws on invalid camera or constants', () => {
    expect(() => createCameraRig(/** @type {any} */ ({ landingOrbit: LANDING_ORBIT, enterPosition: ENTER_POSITION }))).toThrow();
    expect(() => makeRig(fakeCamera(), { landingOrbit: null })).toThrow();
    expect(() => makeRig(fakeCamera(), { enterPosition: /** @type {any} */ ([1, 2]) })).toThrow();
  });

  it('renders the landing orbit from angle, radius, and height', () => {
    const camera = fakeCamera();
    const rig = makeRig(camera, { initialAngle: 0 });
    rig.render();
    const position = camera.lastPosition();
    expect(position.x).toBeCloseTo(LANDING_ORBIT.target[0] + LANDING_ORBIT.radius, 6);
    expect(position.y).toBe(LANDING_ORBIT.height);
    expect(position.z).toBeCloseTo(LANDING_ORBIT.target[2], 6);
    expect(camera.lastLookAt()).toEqual({ type: 'lookAt', x: 0, y: 1.2, z: 0 });
  });

  it('auto-rotates the orbit in update', () => {
    const camera = fakeCamera();
    const rig = makeRig(camera, { initialAngle: 0 });
    rig.update(1);
    expect(rig.getOrbit().angle).toBeCloseTo(RIG_DEFAULTS.autoRotateSpeed, 6);
  });

  it('moves monotonically toward the enter position with no overshoot', () => {
    const camera = fakeCamera();
    const rig = makeRig(camera, { initialAngle: 0.9 });
    rig.setOrbit({ angle: 2.4, radius: 12.5 });
    rig.render();
    expect(rig.beginTransition(ENTER_POSITION)).toBe(true);

    let previousDistance = Infinity;
    for (let step = 0; step <= 120; step += 1) {
      rig.update(1 / 60);
      rig.render();
      const position = camera.lastPosition();
      const distance = Math.hypot(
        position.x - ENTER_POSITION[0],
        position.y - ENTER_POSITION[1],
        position.z - ENTER_POSITION[2],
      );
      expect(distance).toBeLessThanOrEqual(previousDistance + 1e-9);
      previousDistance = distance;
    }
    const final = camera.lastPosition();
    expect(final.x).toBeCloseTo(ENTER_POSITION[0], 6);
    expect(final.y).toBeCloseTo(ENTER_POSITION[1], 6);
    expect(final.z).toBeCloseTo(ENTER_POSITION[2], 6);
    expect(rig.getMode()).toBe(RIG_MODES.SETTLED);
  });

  it('rejects re-entry while transitioning and ignores orbit edits', () => {
    const camera = fakeCamera();
    const rig = makeRig(camera);
    expect(rig.beginTransition(ENTER_POSITION)).toBe(true);
    expect(rig.beginTransition([0, 1, 0])).toBe(false);
    const before = rig.getOrbit();
    rig.setOrbit({ angle: 5, radius: 12 });
    expect(rig.getOrbit()).toEqual(before);
  });

  it('snaps to the target instantly under reduced motion', () => {
    const camera = fakeCamera();
    const rig = makeRig(camera, { reducedMotion: true });
    rig.update(1);
    expect(rig.beginTransition(ENTER_POSITION)).toBe(true);
    expect(rig.getMode()).toBe(RIG_MODES.SETTLED);
    rig.render();
    const position = camera.lastPosition();
    expect(position.x).toBeCloseTo(ENTER_POSITION[0], 6);
    expect(position.y).toBeCloseTo(ENTER_POSITION[1], 6);
    expect(position.z).toBeCloseTo(ENTER_POSITION[2], 6);
  });

  it('ignores non-finite deltas', () => {
    const camera = fakeCamera();
    const rig = makeRig(camera, { initialAngle: 1 });
    rig.update(Number.NaN);
    expect(rig.getOrbit().angle).toBe(1);
  });
});
