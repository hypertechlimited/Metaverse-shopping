import { describe, it, expect } from 'vitest';
import { createStore } from '../../src/engine/store.js';

describe('createStore', () => {
  it('returns the initial state', () => {
    const store = createStore({ mode: 'landing', visitorName: '' });
    expect(store.get()).toEqual({ mode: 'landing', visitorName: '' });
  });

  it('merges patches without mutating the previous object', () => {
    const store = createStore({ mode: 'landing', count: 0 });
    const before = store.get();
    store.set({ count: 1 });
    expect(store.get()).toEqual({ mode: 'landing', count: 1 });
    expect(before).toEqual({ mode: 'landing', count: 0 });
  });

  it('notifies subscribers on set with the new state', () => {
    const store = createStore({ mode: 'landing' });
    /** @type {string[]} */
    const seen = [];
    store.subscribe((state) => seen.push(state.mode));
    store.set({ mode: 'transition' });
    store.set({ mode: 'explore' });
    expect(seen).toEqual(['transition', 'explore']);
  });

  it('unsubscribe stops notifications', () => {
    const store = createStore({ count: 0 });
    /** @type {number[]} */
    const seen = [];
    const off = store.subscribe((state) => seen.push(state.count));
    off();
    store.set({ count: 1 });
    expect(seen).toEqual([]);
  });

  it('dispose clears all listeners', () => {
    const store = createStore({ count: 0 });
    /** @type {number[]} */
    const seen = [];
    store.subscribe((state) => seen.push(state.count));
    store.dispose();
    store.set({ count: 1 });
    expect(seen).toEqual([]);
  });

  it('continues delivering to remaining subscribers after an unsubscribe', () => {
    const store = createStore({ n: 0 });
    /** @type {number[]} */
    const a = [];
    /** @type {number[]} */
    const b = [];
    const offA = store.subscribe((state) => a.push(state.n));
    store.subscribe((state) => b.push(state.n));
    offA();
    store.set({ n: 2 });
    expect(a).toEqual([]);
    expect(b).toEqual([2]);
  });

  it('throws on non-object initial state', () => {
    expect(() => createStore(null)).toThrow();
    expect(() => createStore(42)).toThrow();
  });

  it('throws on invalid set patches', () => {
    const store = createStore({ mode: 'landing' });
    expect(() => store.set(/** @type {any} */ (null))).toThrow();
    expect(() => store.set(/** @type {any} */ ('landing'))).toThrow();
  });

  it('throws on non-function listeners', () => {
    const store = createStore({ mode: 'landing' });
    expect(() => store.subscribe(/** @type {any} */ ('x'))).toThrow();
  });
});
