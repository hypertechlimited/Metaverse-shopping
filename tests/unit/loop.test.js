import { describe, it, expect } from 'vitest';
import { createTimestep } from '../../src/engine/loop.js';

function harness() {
  /** @type {number[]} */
  const updates = [];
  let renders = 0;
  const frame = createTimestep({
    update: (dt) => updates.push(dt),
    render: () => { renders++; },
  });
  return { frame, updates, renders: () => renders };
}

describe('timestep', () => {
  it('renders without updating on the first call', () => {
    const h = harness();
    h.frame(1000);
    expect(h.updates).toEqual([]);
    expect(h.renders()).toBe(1);
  });

  it('runs fixed 60Hz updates and renders every frame', () => {
    const h = harness();
    h.frame(0);
    h.frame(1000 / 60);
    h.frame(2000 / 60);
    expect(h.updates).toEqual([1 / 60, 1 / 60]);
    expect(h.renders()).toBe(3);
  });

  it('clamps huge deltas (tab blur) to maxDelta', () => {
    const h = harness();
    h.frame(0);
    h.frame(60000);
    expect(h.updates.length).toBe(Math.floor(0.1 / (1 / 60)));
    for (const dt of h.updates) expect(dt).toBe(1 / 60);
  });

  it('accumulates fractional deltas into fixed steps', () => {
    const h = harness();
    h.frame(0);
    h.frame(10);
    h.frame(17);
    expect(h.updates).toEqual([1 / 60]);
    h.frame(24);
    expect(h.updates).toEqual([1 / 60]);
  });

  it('drains accumulated time deterministically', () => {
    const h = harness();
    h.frame(0);
    for (let i = 1; i <= 600; i++) h.frame(i * (1000 / 120));
    expect(h.updates.length).toBe(300);
  });
});
