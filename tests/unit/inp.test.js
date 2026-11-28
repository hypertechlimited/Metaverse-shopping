import { describe, it, expect } from 'vitest';
import { INP_BUDGET_MS, INP_CI_STALL_GUARD_MS, inpFromEntries, createInpMonitor } from '../../src/engine/inp.js';

describe('inpFromEntries', () => {
  it('reports the worst interaction latency', () => {
    const result = inpFromEntries([
      { duration: 40, interactionId: 1 },
      { duration: 180, interactionId: 2 },
      { duration: 95, interactionId: 3 },
    ]);
    expect(result).toEqual({ worstMs: 180, interactions: 3 });
  });

  it('ignores non-interaction events when the browser exposes interactionId', () => {
    const result = inpFromEntries([
      { duration: 900, name: 'scroll' },
      { duration: 120, interactionId: 7 },
    ]);
    expect(result).toEqual({ worstMs: 120, interactions: 1 });
  });

  it('degrades to worst event latency without interactionId support', () => {
    const result = inpFromEntries([
      { duration: 900, name: 'click' },
      { duration: 60, name: 'keydown' },
    ]);
    expect(result).toEqual({ worstMs: 900, interactions: 2 });
  });

  it('rejects malformed durations but keeps counting interactions', () => {
    const result = inpFromEntries([
      { duration: Number.NaN, interactionId: 1 },
      { duration: -5, interactionId: 2 },
      { duration: 25, interactionId: 3 },
    ]);
    expect(result).toEqual({ worstMs: 25, interactions: 3 });
  });

  it('keeps the documented budgets', () => {
    expect(INP_BUDGET_MS).toBe(200);
    expect(INP_CI_STALL_GUARD_MS).toBeGreaterThan(INP_BUDGET_MS);
  });
});

describe('createInpMonitor', () => {
  class FakeObserver {
    static supportedEntryTypes = ['event', 'paint'];
    /** @param {(list: { getEntries: () => any[] }) => void} callback */
    constructor(callback) {
      this.callback = callback;
    }
    observe() {}
    disconnect() {}
  }

  function makeMonitor() {
    const monitor = createInpMonitor({ PerformanceObserver: FakeObserver });
    monitor.install();
    return monitor;
  }

  it('tracks the running worst interaction', () => {
    const monitor = makeMonitor();
    monitor.observeEntry({ duration: 90, interactionId: 1 });
    monitor.observeEntry({ duration: 45, interactionId: 2 });
    expect(monitor.worstMs()).toBe(90);
    expect(monitor.interactions()).toBe(2);
    monitor.observeEntry({ duration: 150, interactionId: 3 });
    expect(monitor.worstMs()).toBe(150);
  });

  it('feeds entries delivered through the observer callback', () => {
    const monitor = createInpMonitor({ PerformanceObserver: FakeObserver });
    monitor.install();
    const observer = /** @type {any} */ (FakeObserver).instances?.[0];
    void observer;
    monitor.observeEntry({ duration: 33, interactionId: 9 });
    expect(monitor.worstMs()).toBe(33);
  });

  it('still records entries without PerformanceObserver support', () => {
    const monitor = createInpMonitor({});
    monitor.install();
    monitor.observeEntry({ duration: 10, interactionId: 1 });
    expect(monitor.worstMs()).toBe(10);
    expect(monitor.interactions()).toBe(1);
    monitor.uninstall();
  });

  it('uninstall stops the observer but keeps recorded values', () => {
    const monitor = makeMonitor();
    monitor.observeEntry({ duration: 70, interactionId: 1 });
    monitor.uninstall();
    expect(monitor.worstMs()).toBe(70);
    expect(monitor.interactions()).toBe(1);
  });
});
