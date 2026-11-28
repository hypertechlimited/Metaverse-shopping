import { describe, it, expect } from 'vitest';
import { TELEMETRY, createTelemetry } from '../../src/engine/telemetry.js';

function fakeTarget() {
  const listeners = /** @type {Map<string, (event: any) => void>} */ (new Map());
  let clock = 0;
  return {
    listeners,
    /** @param {string} type @param {(event: any) => void} handler */
    addEventListener(type, handler) {
      listeners.set(type, handler);
    },
    /** @param {string} type */
    removeEventListener(type) {
      listeners.delete(type);
    },
    performance: {
      now: () => (clock += 5),
    },
  };
}

describe('createTelemetry', () => {
  it('captures window errors with source metadata', () => {
    const target = fakeTarget();
    const telemetry = createTelemetry(/** @type {any} */ (target));
    telemetry.install();
    target.listeners.get('error')?.({ message: 'boom', filename: 'main.js', lineno: 7, colno: 3 });
    const entries = telemetry.entries();
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({ kind: 'error', message: 'boom', source: 'main.js', line: 7, column: 3, at: 5 });
  });

  it('captures unhandled rejections including Error reasons', () => {
    const target = fakeTarget();
    const telemetry = createTelemetry(/** @type {any} */ (target));
    telemetry.install();
    target.listeners.get('unhandledrejection')?.({ reason: new Error('async boom') });
    target.listeners.get('unhandledrejection')?.({ reason: 'string rejection' });
    target.listeners.get('unhandledrejection')?.({});
    const entries = telemetry.entries();
    expect(entries.map((entry) => entry.message)).toEqual(['async boom', 'string rejection', 'unknown rejection']);
    expect(entries.every((entry) => entry.kind === 'rejection')).toBe(true);
  });

  it('keeps the queue bounded by dropping the oldest entry', () => {
    const target = fakeTarget();
    const telemetry = createTelemetry(/** @type {any} */ (target));
    telemetry.install();
    for (let i = 0; i < TELEMETRY.capacity + 5; i++) {
      target.listeners.get('error')?.({ message: 'e' + i });
    }
    expect(telemetry.size()).toBe(TELEMETRY.capacity);
    expect(telemetry.entries()[0].message).toBe('e5');
    expect(telemetry.entries().at(-1)?.message).toBe('e' + (TELEMETRY.capacity + 4));
  });

  it('drains without leaving residue', () => {
    const target = fakeTarget();
    const telemetry = createTelemetry(/** @type {any} */ (target));
    telemetry.install();
    target.listeners.get('error')?.({ message: 'one' });
    target.listeners.get('error')?.({ message: 'two' });
    const drained = telemetry.drain();
    expect(drained).toHaveLength(2);
    expect(telemetry.size()).toBe(0);
    expect(telemetry.drain()).toHaveLength(0);
  });

  it('tolerates malformed events and never throws', () => {
    const target = fakeTarget();
    const telemetry = createTelemetry(/** @type {any} */ (target));
    telemetry.install();
    expect(() => target.listeners.get('error')?.(null)).not.toThrow();
    expect(() => target.listeners.get('unhandledrejection')?.(undefined)).not.toThrow();
    expect(telemetry.entries()[0].message).toBe('unknown error');
  });

  it('uninstall stops capture and re-install works', () => {
    const target = fakeTarget();
    const telemetry = createTelemetry(/** @type {any} */ (target));
    telemetry.install();
    telemetry.uninstall();
    expect(telemetry.size()).toBe(0);
    telemetry.install();
    target.listeners.get('error')?.({ message: 'kept' });
    expect(telemetry.size()).toBe(1);
  });
});
