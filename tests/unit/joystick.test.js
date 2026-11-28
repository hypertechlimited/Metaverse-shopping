import { describe, it, expect } from 'vitest';
import { JOYSTICK, joystickVector } from '../../src/ui/joystick.js';

describe('joystick vector mapping', () => {
  it('returns null at rest and inside the dead zone', () => {
    expect(joystickVector(0, 0, 36)).toBeNull();
    expect(joystickVector(2, -2, 36)).toBeNull();
  });

  it('maps rightward drag to strafe, upward drag to forward', () => {
    const right = /** @type {{ forward: number, strafe: number }} */ (joystickVector(36, 0, 36));
    expect(right.strafe).toBeCloseTo(1, 5);
    expect(right.forward).toBeCloseTo(0, 5);
    const up = /** @type {{ forward: number, strafe: number }} */ (joystickVector(0, -36, 36));
    expect(up.forward).toBeCloseTo(1, 5);
    expect(up.strafe).toBeCloseTo(0, 5);
  });

  it('normalizes diagonal drags to the unit circle', () => {
    const diagonal = /** @type {{ forward: number, strafe: number }} */ (joystickVector(36, -36, 36));
    expect(Math.hypot(diagonal.forward, diagonal.strafe)).toBeCloseTo(1, 5);
  });

  it('scales partial drags proportionally', () => {
    const half = /** @type {{ forward: number, strafe: number }} */ (joystickVector(0, -18, 36));
    expect(half.forward).toBeCloseTo(0.5, 5);
  });

  it('clamps drags beyond the pad radius', () => {
    const clamped = /** @type {{ forward: number, strafe: number }} */ (joystickVector(0, -200, 36));
    expect(clamped.forward).toBe(1);
  });

  it('rejects a non-positive radius (programmer error)', () => {
    expect(() => joystickVector(1, 1, 0)).toThrow();
  });

  it('keeps the dead zone below 0.2 of travel and the pad above 44px touch targets', () => {
    expect(JOYSTICK.deadZone).toBeLessThan(0.2);
    expect(JOYSTICK.knobSizePx).toBeGreaterThanOrEqual(44);
  });
});
