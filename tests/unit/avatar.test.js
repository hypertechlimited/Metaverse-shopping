import { describe, it, expect } from 'vitest';
import { AVATAR, addSample, trimBuffer, sampleAt } from '../../src/engine/avatar.js';

/** @param {number} t @param {number} x @param {number} z @param {number} [yaw] */
const sample = (t, x, z, yaw = 0) => ({ t, x, z, yaw });

/** @param {import('../../src/engine/avatar.js').AvatarSample[]} buffer @param {number} nowMs */
const requirePose = (buffer, nowMs) => {
  const pose = sampleAt(buffer, nowMs);
  if (!pose) throw new Error('expected a pose');
  return pose;
};

describe('addSample validation', () => {
  it('accepts finite samples in order', () => {
    /** @type {import('../../src/engine/avatar.js').AvatarSample[]} */ const buffer = [];
    expect(addSample(buffer, sample(100, 1, 2, 0.5))).toBe(true);
    expect(addSample(buffer, sample(200, 2, 2, 0.5))).toBe(true);
    expect(buffer.length).toBe(2);
  });

  it('drops non-finite fields (fail soft)', () => {
    /** @type {import('../../src/engine/avatar.js').AvatarSample[]} */ const buffer = [];
    expect(addSample(buffer, sample(Number.NaN, 1, 2))).toBe(false);
    expect(addSample(buffer, sample(100, Number.NaN, 2))).toBe(false);
    expect(addSample(buffer, sample(100, 1, Number.POSITIVE_INFINITY))).toBe(false);
    expect(addSample(buffer, sample(100, 1, 2, Number.NaN))).toBe(false);
    expect(buffer.length).toBe(0);
  });

  it('drops non-increasing timestamps (clock anomalies)', () => {
    /** @type {import('../../src/engine/avatar.js').AvatarSample[]} */ const buffer = [];
    addSample(buffer, sample(200, 1, 2));
    expect(addSample(buffer, sample(200, 3, 4))).toBe(false);
    expect(addSample(buffer, sample(100, 3, 4))).toBe(false);
    expect(buffer.length).toBe(1);
  });

  it('caps the buffer at the configured limit, keeping the latest samples', () => {
    /** @type {import('../../src/engine/avatar.js').AvatarSample[]} */ const buffer = [];
    for (let i = 0; i < AVATAR.bufferLimit + 10; i++) addSample(buffer, sample(i * 100, i, 0));
    expect(buffer.length).toBe(AVATAR.bufferLimit);
    expect(buffer[0].t).toBe(10 * 100);
  });

  it('never mutates the pushed sample object (stores a copy)', () => {
    /** @type {import('../../src/engine/avatar.js').AvatarSample[]} */ const buffer = [];
    const original = sample(100, 1, 2, 0.5);
    addSample(buffer, original);
    original.x = 99;
    expect(buffer[0].x).toBe(1);
  });
});

describe('sampleAt interpolation', () => {
  it('returns null on an empty buffer', () => {
    expect(sampleAt([], 1000)).toBeNull();
  });

  it('holds the first sample before the render window reaches it', () => {
    const buffer = [sample(1000, 5, 5)];
    expect(sampleAt(buffer, 500)).toEqual({ x: 5, z: 5, yaw: 0, extrapolated: false });
  });

  it('applies the interpolation delay before blending', () => {
    const buffer = [sample(0, 0, 0), sample(1000, 2, 0)];
    const pose = requirePose(buffer, 120);
    expect(pose.extrapolated).toBe(false);
    expect(pose.x).toBe(0);
    const pose2 = requirePose(buffer, 620);
    expect(pose2.x).toBeCloseTo(1, 10);
  });

  it('blends between the two bracketing samples', () => {
    const buffer = [sample(0, 0, 0), sample(1000, 2, 2)];
    const pose = requirePose(buffer, 120 + 500);
    expect(pose.x).toBeCloseTo(1, 10);
    expect(pose.z).toBeCloseTo(1, 10);
    expect(pose.extrapolated).toBe(false);
  });

  it('lerps yaw through the shortest arc', () => {
    const buffer = [sample(0, 0, 0, 3), sample(1000, 0, 0, -3)];
    const pose = requirePose(buffer, 120 + 500);
    expect(pose.yaw).toBeCloseTo(Math.PI, 10);
  });

  it('snaps across a teleport gap instead of lerping across the map', () => {
    const buffer = [sample(0, 0, 0), sample(1000, 10, 0, 0)];
    const far = requirePose(buffer, 120 + 500);
    expect(far).not.toBeNull();
    buffer.push(sample(2000, 15, 0));
    const after = requirePose(buffer, 120 + 1500);
    expect(after.x).toBe(15);
  });

  it('snaps when renderTime lands inside a teleport gap', () => {
    const buffer = [sample(0, 0, 0), sample(1000, 2, 0, 0.2)];
    addSample(buffer, sample(1100, 20, 0, 0.2));
    const pose = requirePose(buffer, 120 + 1050);
    expect(pose.x).toBe(20);
    expect(pose.z).toBe(0);
  });
});

describe('sampleAt extrapolation', () => {
  it('extrapolates from capped velocity on sample gaps', () => {
    const buffer = [sample(0, 0, 0), sample(1000, 1, 0)];
    const pose = requirePose(buffer, 1000 + 120 + 100);
    expect(pose.extrapolated).toBe(true);
    expect(pose.x).toBeCloseTo(1.1, 6);
    expect(pose.z).toBe(0);
  });

  it('holds the last pose past the extrapolation bound', () => {
    const buffer = [sample(0, 0, 0), sample(1000, 1, 0)];
    const pose = requirePose(buffer, 1000 + 120 + 400);
    expect(pose.extrapolated).toBe(false);
    expect(pose.x).toBe(1);
  });

  it('extrapolates zero velocity from a single sample', () => {
    const buffer = [sample(0, 4, 7, 1)];
    const pose = requirePose(buffer, 220);
    expect(pose.extrapolated).toBe(true);
    expect(pose.x).toBe(4);
    expect(pose.z).toBe(7);
  });

  it('does not extrapolate across a teleport gap', () => {
    const buffer = [sample(0, 0, 0), sample(1000, 10, 0)];
    const pose = requirePose(buffer, 1000 + 120 + 100);
    expect(pose.x).toBe(10);
    expect(pose.extrapolated).toBe(true);
  });
});

describe('trimBuffer', () => {
  it('keeps everything the render window can still touch', () => {
    /** @type {import('../../src/engine/avatar.js').AvatarSample[]} */ const buffer = [];
    for (let i = 0; i < 30; i++) addSample(buffer, sample(i * 100, i, 0));
    trimBuffer(buffer, 2500);
    expect(buffer[0].t).toBeLessThanOrEqual(2500 - AVATAR.interpDelayMs - AVATAR.maxExtrapolateMs + 1);
    expect(buffer[buffer.length - 1].t).toBe(2900);
  });

  it('never trims below one sample', () => {
    const buffer = [sample(0, 1, 2)];
    trimBuffer(buffer, 1_000_000);
    expect(buffer.length).toBe(1);
  });
});
