import { describe, it, expect } from 'vitest';
import { DPAD, DIRECTIONS, directionVector, clampOrbitRadius, keyToDirection } from '../../src/ui/dpad.js';

/** @param {string} key @returns {KeyboardEvent} */
const keyEvent = (key) => /** @type {KeyboardEvent} */ (/** @type {any} */ ({ key }));

describe('d-pad direction vectors', () => {
  it('maps the four directions to unit vectors', () => {
    expect(directionVector('left')).toEqual({ x: -1, z: 0 });
    expect(directionVector('right')).toEqual({ x: 1, z: 0 });
    expect(directionVector('up')).toEqual({ x: 0, z: -1 });
    expect(directionVector('down')).toEqual({ x: 0, z: 1 });
  });

  it('throws on unknown direction (programmer error)', () => {
    expect(() => directionVector(/** @type {any} */ ('diagonal'))).toThrow();
  });

  it('returns fresh objects so callers cannot mutate the table', () => {
    const a = directionVector('left');
    a.x = 99;
    expect(directionVector('left').x).toBe(-1);
  });

  it('exposes exactly four directions with 44px+ touch targets', () => {
    expect(DIRECTIONS).toEqual(['left', 'right', 'up', 'down']);
    expect(DPAD.buttonSizePx).toBeGreaterThanOrEqual(44);
  });
});

describe('orbit radius clamp', () => {
  it('clamps to the documented range', () => {
    expect(clampOrbitRadius(DPAD.minRadius - 5)).toBe(DPAD.minRadius);
    expect(clampOrbitRadius(DPAD.maxRadius + 5)).toBe(DPAD.maxRadius);
    expect(clampOrbitRadius(9.8)).toBe(9.8);
  });

  it('falls back to the minimum radius on non-finite input', () => {
    expect(clampOrbitRadius(Number.NaN)).toBe(DPAD.minRadius);
    expect(clampOrbitRadius(Number.POSITIVE_INFINITY)).toBe(DPAD.maxRadius);
  });
});

describe('keyboard mapping', () => {
  it('maps arrow keys to directions and ignores other keys', () => {
    expect(keyToDirection(keyEvent('ArrowLeft'))).toBe('left');
    expect(keyToDirection(keyEvent('ArrowUp'))).toBe('up');
    expect(keyToDirection(keyEvent('ArrowDown'))).toBe('down');
    expect(keyToDirection(keyEvent('ArrowRight'))).toBe('right');
    expect(keyToDirection(keyEvent('a'))).toBe(null);
    expect(keyToDirection(keyEvent('Escape'))).toBe(null);
  });
});
