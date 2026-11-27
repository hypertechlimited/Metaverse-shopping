import { describe, it, expect } from 'vitest';
import { createStorage } from '../../src/engine/storage.js';

/** @returns {Storage} minimal in-memory backend */
function memoryBackend(initial = {}) {
  const map = new Map(Object.entries(initial));
  return /** @type {Storage} */ ({
    getItem: (k) => (map.has(k) ? /** @type {string} */ (map.get(k)) : null),
    setItem: (k, v) => { map.set(k, String(v)); },
    removeItem: (k) => { map.delete(k); },
    clear: () => map.clear(),
    key: (i) => Array.from(map.keys())[i] ?? null,
    get length() { return map.size; },
  });
}

describe('storage resilience', () => {
  it('returns defaults for missing data', () => {
    const { load } = createStorage(memoryBackend());
    expect(load()).toEqual({ visitorName: '', stockMap: {}, cartArr: [] });
  });

  it('returns defaults for corrupt JSON without throwing', () => {
    const backend = memoryBackend({ sagarmatha_metaverse_v3: '{not json!!' });
    const { load } = createStorage(backend);
    expect(load()).toEqual({ visitorName: '', stockMap: {}, cartArr: [] });
  });

  it('returns defaults when the shape is wrong', () => {
    const backend = memoryBackend({ sagarmatha_metaverse_v3: '{"visitorName": 42}' });
    const { load } = createStorage(backend);
    expect(load()).toEqual({ visitorName: '', stockMap: {}, cartArr: [] });
  });

  it('round-trips a valid state', () => {
    const backend = memoryBackend();
    const store = createStorage(backend);
    const state = { visitorName: 'Aarav', stockMap: { rice: 24 }, cartArr: [{ id: 'rice', vIdx: 2, qty: 1 }] };
    expect(store.save(state)).toBe(true);
    expect(store.load()).toEqual(state);
  });

  it('survives a throwing backend and works in memory', () => {
    const throwing = /** @type {Storage} */ ({
      getItem: () => { throw new Error('quota'); },
      setItem: () => { throw new Error('quota'); },
      removeItem: () => {},
      clear: () => {},
      key: () => null,
      length: 0,
    });
    const store = createStorage(throwing);
    expect(store.load()).toEqual({ visitorName: '', stockMap: {}, cartArr: [] });
    expect(store.save({ visitorName: 'x', stockMap: {}, cartArr: [] })).toBe(false);
  });

  it('with no backend, load gives defaults and save reports failure', () => {
    const store = createStorage(null);
    expect(store.load()).toEqual({ visitorName: '', stockMap: {}, cartArr: [] });
    expect(store.save({ visitorName: '', stockMap: {}, cartArr: [] })).toBe(false);
  });
});
