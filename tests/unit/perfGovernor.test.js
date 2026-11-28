import { describe, it, expect } from 'vitest';
import { GOVERNOR, createPerfGovernor } from '../../src/engine/perfGovernor.js';

/** @param {ReturnType<typeof createPerfGovernor>} governor @param {number} fps @param {number} seconds @param {number} startMs */
function run(governor, fps, seconds, startMs = 0) {
  const stepMs = 1000 / fps;
  for (let i = 0; i < seconds * fps; i++) governor.observeFrame(startMs + i * stepMs);
}

describe('perf governor', () => {
  it('stays at tier 0 under 60 fps', () => {
    const governor = createPerfGovernor();
    run(governor, 60, 3);
    expect(governor.update(3000)).toBe(-1);
    expect(governor.tier()).toBe(0);
    expect(governor.dpr()).toBe(GOVERNOR.tiers[0]);
  });

  it('ignores the first window before enough frames accumulate', () => {
    const governor = createPerfGovernor();
    expect(governor.update(5000)).toBe(-1);
    governor.observeFrame(6000);
    expect(governor.update(6500)).toBe(-1);
  });

  it('steps down under sustained low fps', () => {
    const governor = createPerfGovernor();
    run(governor, 28, 3);
    expect(governor.update(3000)).toBe(1);
    expect(governor.dpr()).toBe(GOVERNOR.tiers[1]);
  });

  it('respects the cooldown between steps', () => {
    const governor = createPerfGovernor();
    run(governor, 28, 3);
    expect(governor.update(3000)).toBe(1);
    run(governor, 28, 3, 3100);
    expect(governor.update(6200)).toBe(-1);
    expect(governor.update(3000 + GOVERNOR.cooldownMs)).toBe(2);
  });

  it('recovers tier under sustained high fps after the cooldown', () => {
    const governor = createPerfGovernor();
    run(governor, 28, 3);
    expect(governor.update(3000)).toBe(1);
    run(governor, 70, 5, 3100);
    expect(governor.update(3100 + 5000 + 10)).toBe(0);
  });

  it('does not oscillate while inside the hysteresis band', () => {
    const governor = createPerfGovernor();
    run(governor, 28, 3);
    expect(governor.update(3000)).toBe(1);
    run(governor, 50, 4, 3100);
    expect(governor.update(7200)).toBe(-1);
    expect(governor.tier()).toBe(1);
  });

  it('clamps at the lowest tier', () => {
    const governor = createPerfGovernor({ tiers: [2, 1], cooldownMs: 100 });
    run(governor, 20, 3);
    expect(governor.update(3000)).toBe(1);
    run(governor, 20, 3, 3100);
    expect(governor.update(3300)).toBe(-1);
    expect(governor.dpr()).toBe(1);
  });
});
